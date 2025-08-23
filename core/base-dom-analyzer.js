/**
 * Base DOM Analyzer - Core functionality for DOM element extraction
 * This module provides the foundation for all DOM analysis operations
 */
class BaseDOMAnalyzer {
    constructor(config = {}) {
        // Initialize base configuration with sensible defaults
        this.config = {
            // General Configuration
            includeHidden: config.includeHidden || false,
            includeText: config.includeText !== false,
            includeAttributes: config.includeAttributes !== false,
            onlyFormElements: config.onlyFormElements || false,
            maxDepth: config.maxDepth || 15,
            
            // Extraction Rules - prioritized attributes for element identification
            extractionRules: config.extractionRules || this.getDefaultExtractionRules(),
            semanticAnalysis: config.semanticAnalysis !== false,
            
            // Store original config for reference
            ...config
        };
        
        // Initialize utilities reference
        this.utilities = typeof DOMUtilities !== 'undefined' ? DOMUtilities : null;
    }

    /**
     * Core DOM extraction with enhanced attribute and metadata collection
     * Returns comprehensive element data in both tree and flat array formats
     */
    async performCoreExtraction(config = null) {
        const mergedConfig = config || this.config;
        const elements = [];
        let allElements;

        // Select elements based on configuration
        if (mergedConfig.onlyFormElements) {
            allElements = document.querySelectorAll(
                'input, select, textarea, button, form, label, fieldset, legend, optgroup, option, datalist'
            );
        } else {
            allElements = document.querySelectorAll('*');
        }

        // Build hierarchical DOM tree structure
        const domTree = this.buildEnhancedDOMTree(document.body, mergedConfig);
        
        // Build flat elements array for backward compatibility
        allElements.forEach((element, index) => {
            if (!this.shouldIncludeElement(element, mergedConfig)) return;

            const elementData = this.extractElementData(element, index, mergedConfig);
            elements.push(elementData);
        });

        return {
            domTree,
            elements,
            formattedTree: this.formatDOMTreeAsText(domTree)
        };
    }

    /**
     * Enhanced DOM tree building with comprehensive metadata
     * Creates hierarchical structure with rich element information
     */
    buildEnhancedDOMTree(rootElement, config, depth = 0) {
        // Prevent infinite recursion and null elements
        if (depth > config.maxDepth || !rootElement) return null;
        if (!this.shouldIncludeElement(rootElement, config)) return null;

        const style = window.getComputedStyle(rootElement);
        const rect = rootElement.getBoundingClientRect();

        // Core element data structure
        const nodeData = {
            // Basic identification
            tagName: rootElement.tagName.toLowerCase(),
            xpath: this.getXPath(rootElement),
            cssSelector: this.getCSSSelector(rootElement),
            
            // Enhanced attributes collection
            attributes: this.extractAllAttributes(rootElement),
            
            // Current state tracking for form elements
            currentState: this.extractCurrentState(rootElement, config),
            
            // Positional and structural data
            position: {
                depth,
                index: Array.from(rootElement.parentNode?.children || []).indexOf(rootElement),
                siblingCount: rootElement.parentNode?.children.length || 0,
                childCount: rootElement.children.length,
                documentOrder: this.getDocumentOrder(rootElement)
            },
            
            // Visual and interaction metadata
            metadata: {
                isInteractive: this.isElementInteractive(rootElement),
                isFormElement: this.isFormElement(rootElement),
                isVisible: this.isElementVisible(rootElement, style),
                isInViewport: this.isInViewport(rect),
                accessibility: this.extractAccessibilityInfo(rootElement),
                semantic: this.extractSemanticInfo(rootElement),
                visual: this.extractVisualInfo(rootElement, style, rect),
                dataAttributes: this.extractDataAttributes(rootElement),
                events: this.extractEventInfo(rootElement)
            },
            
            // Content and text
            text: config.includeText ? this.extractTextContent(rootElement) : null,
            
            // Tree structure
            children: []
        };

        // Build children recursively
        for (const child of rootElement.children) {
            const childNode = this.buildEnhancedDOMTree(child, config, depth + 1);
            if (childNode) {
                nodeData.children.push(childNode);
            }
        }

        return nodeData;
    }

    /**
     * Extract comprehensive element data for flat array representation
     */
    extractElementData(element, index, config) {
        const tagName = element.tagName.toLowerCase();
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Extract text content
        const textContent = this.extractTextContent(element);
        
        // Build element name for display
        let elementName = textContent || 
                         element.getAttribute('name') || 
                         element.getAttribute('id') || 
                         element.getAttribute('aria-label') || 
                         element.getAttribute('title') || 
                         element.getAttribute('alt') || 
                         'Unnamed element';
        
        // For inputs, include type information in name
        if (tagName === 'input' && element.type) {
            elementName = elementName === 'Unnamed element' ? `${element.type} input` : elementName;
        }
        
        return {
            index,
            tagName,
            name: elementName,
            text: textContent,
            type: element.type || null,
            xpath: this.getXPath(element),
            cssSelector: this.getCSSSelector(element),
            attributes: this.extractAllAttributes(element),
            currentState: this.extractCurrentState(element, config),
            metadata: {
                isInteractive: this.isElementInteractive(element),
                isFormElement: this.isFormElement(element),
                isVisible: this.isElementVisible(element, style),
                isInViewport: this.isInViewport(rect),
                accessibility: this.extractAccessibilityInfo(element),
                boundingBox: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                }
            }
        };
    }

    /**
     * Extract all attributes comprehensively including special handling
     */
    extractAllAttributes(element) {
        const attributes = {};
        
        // Standard HTML attributes
        for (const attr of element.attributes) {
            attributes[attr.name] = attr.value;
        }

        // Special handling for important attributes that might not be in attributes collection
        const specialAttrs = [
            'id', 'className', 'name', 'type', 'value', 'placeholder', 'title',
            'alt', 'href', 'src', 'action', 'method', 'target', 'role',
            'tabindex', 'disabled', 'readonly', 'required', 'checked', 'selected'
        ];

        specialAttrs.forEach(attr => {
            const value = element[attr] !== undefined ? element[attr] : element.getAttribute(attr);
            if (value !== null && value !== undefined && value !== '') {
                attributes[attr] = value;
            }
        });

        // ARIA attributes for accessibility
        for (const attr of element.attributes) {
            if (attr.name.startsWith('aria-')) {
                attributes[attr.name] = attr.value;
            }
        }

        // Data attributes for testing and custom functionality
        for (const attr of element.attributes) {
            if (attr.name.startsWith('data-')) {
                attributes[attr.name] = attr.value;
            }
        }

        // Clean up null/undefined/empty values
        Object.keys(attributes).forEach(key => {
            if (attributes[key] === null || attributes[key] === undefined || attributes[key] === '') {
                delete attributes[key];
            }
        });

        return attributes;
    }

    /**
     * Extract current state of form elements and interactive components
     */
    extractCurrentState(element, config) {
        const state = {};
        const tagName = element.tagName.toLowerCase();

        // Form element states
        if (tagName === 'input') {
            state.value = element.value;
            if (element.type === 'checkbox' || element.type === 'radio') {
                state.checked = element.checked;
            }
            // Validation state if available
            state.validity = element.validity ? {
                valid: element.validity.valid,
                valueMissing: element.validity.valueMissing,
                typeMismatch: element.validity.typeMismatch
            } : null;
        } else if (tagName === 'select') {
            state.value = element.value;
            state.selectedIndex = element.selectedIndex;
            state.selectedOptions = Array.from(element.selectedOptions).map(opt => ({
                value: opt.value,
                text: opt.text,
                index: opt.index
            }));
        } else if (tagName === 'textarea') {
            state.value = element.value;
        }

        // Common state for all elements
        state.focused = document.activeElement === element;
        state.disabled = element.disabled;
        state.readonly = element.readOnly;

        // Include text content if configured
        if (config.includeText) {
            state.textContent = element.textContent?.trim().substring(0, 200);
            state.innerText = element.innerText?.trim().substring(0, 200);
        }

        // Clean up null values
        Object.keys(state).forEach(key => {
            if (state[key] === null || state[key] === undefined || state[key] === '') {
                delete state[key];
            }
        });

        return Object.keys(state).length > 0 ? state : null;
    }

    /**
     * Default extraction rules for prioritizing element identification
     */
    getDefaultExtractionRules() {
        return {
            priorityAttributes: [
                'data-testid', 'data-test', 'data-cy', 'data-selenium',
                'id', 'name', 'aria-label', 'role', 'type', 'class'
            ],
            semanticElements: [
                'main', 'nav', 'header', 'footer', 'aside', 'section', 'article',
                'form', 'button', 'input', 'select', 'textarea'
            ],
            interactiveElements: [
                'a', 'button', 'input', 'select', 'textarea', 'details',
                '[tabindex]', '[onclick]', '[role="button"]', '[role="link"]'
            ]
        };
    }

    // Utility method delegates - use DOMUtilities if available, otherwise provide fallbacks
    getXPath(element) {
        if (this.utilities) {
            return this.utilities.getXPath(element);
        }
        // Fallback XPath generation
        if (element === document.body) return '/html/body';
        let path = [];
        for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
            let index = 0;
            for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
                if (sibling.nodeName === element.nodeName) ++index;
            }
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = index > 0 ? `[${index + 1}]` : '';
            path.unshift(`${tagName}${pathIndex}`);
        }
        return path.length ? `/${path.join('/')}` : null;
    }

    getCSSSelector(element) {
        if (this.utilities) {
            return this.utilities.getCSSSelector(element);
        }
        // Fallback CSS selector
        if (element.id) return `#${CSS.escape(element.id)}`;
        const tag = element.tagName.toLowerCase();
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/);
            if (classes.length > 0 && classes[0]) {
                return `${tag}.${classes[0]}`;
            }
        }
        return tag;
    }

    shouldIncludeElement(element, config) {
        if (this.utilities) {
            return this.utilities.shouldIncludeElement(element, config);
        }
        // Fallback element filtering
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        if (!config.includeHidden) {
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
        }
        return true;
    }

    isElementInteractive(element) {
        if (this.utilities) {
            return this.utilities.isElementInteractive(element);
        }
        // Fallback interactive detection
        const interactiveTags = ['input', 'button', 'select', 'textarea', 'a', 'form'];
        return interactiveTags.includes(element.tagName.toLowerCase()) ||
               element.onclick !== null ||
               element.getAttribute('role') === 'button' ||
               element.tabIndex >= 0;
    }

    isFormElement(element) {
        if (this.utilities) {
            return this.utilities.isFormElement(element);
        }
        // Fallback form element detection
        const formTags = ['input', 'select', 'textarea', 'button', 'form', 'label', 'fieldset', 'legend'];
        return formTags.includes(element.tagName.toLowerCase());
    }

    isElementVisible(element, style) {
        if (this.utilities) {
            return this.utilities.isElementVisible(element, style);
        }
        // Fallback visibility check
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }

    isInViewport(rect) {
        if (this.utilities) {
            return this.utilities.isInViewport(rect);
        }
        // Fallback viewport check
        return rect.top >= 0 &&
               rect.left >= 0 &&
               rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
               rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    }

    extractTextContent(element) {
        if (this.utilities) {
            return this.utilities.extractTextContent(element);
        }
        // Fallback text extraction
        const text = element.textContent?.trim() || '';
        return text.length > 200 ? text.substring(0, 200) + '...' : text;
    }

    extractAccessibilityInfo(element) {
        if (this.utilities) {
            return this.utilities.extractAccessibilityInfo(element);
        }
        // Fallback accessibility info
        return {
            role: element.getAttribute('role'),
            label: element.getAttribute('aria-label'),
            hasTabIndex: element.hasAttribute('tabindex'),
            tabIndex: element.tabIndex
        };
    }

    formatDOMTreeAsText(node, prefix = '', isLast = true) {
        if (this.utilities) {
            return this.utilities.formatDOMTreeAsText(node, prefix, isLast);
        }
        // Fallback tree formatting
        if (!node) return '';
        let result = '';
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        
        result += `${prefix}${connector}${node.tagName}\n`;
        
        node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
            result += this.formatDOMTreeAsText(child, childPrefix, isLastChild);
        });
        
        return result;
    }

    // Placeholder methods for advanced features (implemented in other modules)
    extractSemanticInfo(element) { return {}; }
    extractVisualInfo(element, style, rect) { return {}; }
    extractDataAttributes(element) { return {}; }
    extractEventInfo(element) { return {}; }
    getDocumentOrder(element) { return 0; }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseDOMAnalyzer;
} else {
    window.BaseDOMAnalyzer = BaseDOMAnalyzer;
}
