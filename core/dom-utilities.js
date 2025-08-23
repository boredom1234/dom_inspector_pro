/**
 * DOM Utilities - Helper functions for DOM element analysis and manipulation
 * Contains all utility methods for XPath generation, CSS selectors, element classification, etc.
 */
class DOMUtilities {
    
    /**
     * Generate XPath for an element with precise indexing
     */
    static getXPath(element) {
        if (element === document.body) return '/html/body';

        let path = [];
        for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
            let index = 0;
            let hasFollowingSiblings = false;
            
            // Count preceding siblings with same tag name
            for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
                if (sibling.nodeName === element.nodeName) ++index;
            }
            
            // Check for following siblings with same tag name
            for (let sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
                if (sibling.nodeName === element.nodeName) hasFollowingSiblings = true;
            }

            const tagName = element.nodeName.toLowerCase();
            const pathIndex = (index || hasFollowingSiblings) ? `[${index + 1}]` : '';
            path.unshift(`${tagName}${pathIndex}`);
        }

        return path.length ? `/${path.join('/')}` : null;
    }

    /**
     * Generate optimized CSS selector with preference for stable identifiers
     */
    static getCSSSelector(element) {
        const tag = element.tagName.toLowerCase();
        
        // Priority 1: Check for test ID attributes (most stable)
        const testId = element.getAttribute('data-testid') || element.getAttribute('data-test') || element.getAttribute('data-cy');
        if (testId) {
            const attr = element.getAttribute('data-testid') ? 'data-testid' : 
                         element.getAttribute('data-test') ? 'data-test' : 'data-cy';
            return `[${attr}="${CSS.escape(testId)}"]`;
        }

        // Priority 2: Check for stable ID (not ending with numbers)
        if (element.id && !/\d+$/.test(element.id)) {
            return `#${CSS.escape(element.id)}`;
        }

        // Priority 3: Use name attribute for form elements
        if (element.name && ['input', 'select', 'textarea'].includes(tag)) {
            return `${tag}[name="${CSS.escape(element.name)}"]`;
        }

        // Priority 4: Use role attribute for semantic elements
        const role = element.getAttribute('role');
        if (role) {
            return `[role="${CSS.escape(role)}"]`;
        }

        // Priority 5: Build path with classes if available
        let selector = tag;
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/);
            if (classes.length > 0 && classes[0]) {
                // Use first 2 classes to avoid overly specific selectors
                const stableClasses = classes.slice(0, 2).filter(cls => 
                    cls && !cls.match(/^(active|selected|hover|focus)$/i)
                );
                if (stableClasses.length > 0) {
                    selector += '.' + stableClasses.map(c => CSS.escape(c)).join('.');
                }
            }
        }

        // Add nth-of-type if needed for uniqueness
        let sibling = element;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
            if (sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()) nth++;
        }

        if (nth > 1) {
            selector += `:nth-of-type(${nth})`;
        }

        return selector;
    }

    /**
     * Comprehensive accessibility information extraction
     */
    static extractAccessibilityInfo(element) {
        return {
            role: element.getAttribute('role') || element.getAttribute('aria-role'),
            label: element.getAttribute('aria-label') || 
                   element.getAttribute('aria-labelledby') || 
                   this.getAssociatedLabel(element),
            description: element.getAttribute('aria-describedby'),
            hasTabIndex: element.hasAttribute('tabindex'),
            tabIndex: element.tabIndex,
            ariaHidden: element.getAttribute('aria-hidden') === 'true',
            ariaExpanded: element.getAttribute('aria-expanded'),
            ariaSelected: element.getAttribute('aria-selected'),
            ariaChecked: element.getAttribute('aria-checked'),
            ariaDisabled: element.getAttribute('aria-disabled'),
            landmarks: this.identifyLandmarkRole(element)
        };
    }

    /**
     * Extract text content with intelligent handling for different element types
     */
    static extractTextContent(element) {
        if (!element) return '';
        
        const tagName = element.tagName.toLowerCase();
        
        // For form elements, get value or displayed text
        if (tagName === 'input') {
            if (element.type === 'button' || element.type === 'submit') {
                return element.value || element.getAttribute('value') || '';
            }
            if (['text', 'email', 'password', 'search', 'url', 'tel'].includes(element.type)) {
                return element.placeholder || '';
            }
            return element.value || '';
        }
        
        if (tagName === 'button') {
            return element.textContent?.trim() || element.innerText?.trim() || element.value || '';
        }
        
        if (tagName === 'select') {
            const selectedOption = element.options[element.selectedIndex];
            return selectedOption ? selectedOption.text : '';
        }
        
        if (tagName === 'textarea') {
            return element.placeholder || element.value || '';
        }
        
        if (tagName === 'a') {
            return element.textContent?.trim() || element.title || element.href || '';
        }
        
        if (tagName === 'img') {
            return element.alt || element.title || '';
        }
        
        if (tagName === 'option') {
            return element.text || element.textContent?.trim() || '';
        }
        
        // For other elements, get text content but limit length
        const textContent = element.textContent?.trim() || '';
        const innerText = element.innerText?.trim() || '';
        
        // Use innerText if available (respects styling), otherwise textContent
        const text = innerText || textContent;
        
        // Limit length to prevent extremely long text from cluttering output
        return text.length > 200 ? text.substring(0, 200) + '...' : text;
    }

    /**
     * Format DOM tree as ASCII text representation for easy visualization
     */
    static formatDOMTreeAsText(node, prefix = '', isLast = true) {
        if (!node) return '';
        
        let result = '';
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        
        let nodeInfo = `${node.tagName}`;
        
        // Add ID and classes for quick identification
        if (node.attributes.id) nodeInfo += `#${node.attributes.id}`;
        if (node.attributes.className) {
            const classes = node.attributes.className.split(' ').slice(0, 2);
            nodeInfo += `.${classes.join('.')}`;
        }
        
        // Add visual indicators for element types
        const indicators = [];
        if (node.metadata?.isInteractive) indicators.push('🔗');
        if (node.metadata?.isFormElement) indicators.push('📝');
        if (!node.metadata?.isVisible) indicators.push('👻');
        
        result += `${prefix}${connector}${nodeInfo}`;
        if (indicators.length > 0) result += ` ${indicators.join('')}`;
        result += '\n';
        
        // Recursively format children
        node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
            result += this.formatDOMTreeAsText(child, childPrefix, isLastChild);
        });
        
        return result;
    }

    /**
     * Element classification methods
     */
    static shouldIncludeElement(element, config) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        // Check visibility if hidden elements should be excluded
        if (!config.includeHidden) {
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
        }

        // Filter to form elements only if specified
        if (config.onlyFormElements && !this.isFormElement(element)) {
            return false;
        }

        return true;
    }

    /**
     * Check if element is interactive (clickable, focusable, etc.)
     */
    static isElementInteractive(element) {
        const interactiveTags = ['input', 'button', 'select', 'textarea', 'a', 'form'];
        return interactiveTags.includes(element.tagName.toLowerCase()) ||
               element.onclick !== null ||
               element.getAttribute('role') === 'button' ||
               element.getAttribute('role') === 'link' ||
               element.tabIndex >= 0;
    }

    /**
     * Check if element is a form-related element
     */
    static isFormElement(element) {
        const formTags = ['input', 'select', 'textarea', 'button', 'form', 'label', 'fieldset', 'legend'];
        return formTags.includes(element.tagName.toLowerCase());
    }

    /**
     * Check if element is visible based on computed styles
     */
    static isElementVisible(element, style) {
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }

    /**
     * Check if element is within the viewport
     */
    static isInViewport(rect) {
        return rect.top >= 0 &&
               rect.left >= 0 &&
               rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
               rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    }

    /**
     * Get associated label for form elements
     */
    static getAssociatedLabel(element) {
        // Check for explicit label association
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent?.trim();
        }

        // Check for implicit label association (element inside label)
        const parentLabel = element.closest('label');
        if (parentLabel) {
            return parentLabel.textContent?.replace(element.textContent || '', '').trim();
        }

        return null;
    }

    /**
     * Identify landmark role for accessibility
     */
    static identifyLandmarkRole(element) {
        const tagName = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        
        // ARIA landmark roles
        if (role) {
            const landmarks = ['banner', 'main', 'navigation', 'complementary', 'contentinfo', 'search', 'form'];
            if (landmarks.includes(role)) return role;
        }
        
        // HTML5 semantic elements
        const semanticLandmarks = {
            'header': 'banner',
            'main': 'main',
            'nav': 'navigation',
            'aside': 'complementary',
            'footer': 'contentinfo'
        };
        
        return semanticLandmarks[tagName] || null;
    }

    /**
     * Extract data attributes for testing frameworks
     */
    static extractDataAttributes(element) {
        const dataAttrs = {};
        for (const attr of element.attributes) {
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        }
        return dataAttrs;
    }

    /**
     * Detect event handlers on element
     */
    static extractEventInfo(element) {
        const events = {};
        
        // Common event attributes
        const eventAttrs = ['onclick', 'onchange', 'onsubmit', 'onload', 'onfocus', 'onblur'];
        eventAttrs.forEach(attr => {
            if (element[attr]) {
                events[attr] = 'handler_present';
            }
        });

        // Check for event listeners (basic detection)
        const eventTypes = ['click', 'change', 'submit', 'focus', 'blur'];
        eventTypes.forEach(type => {
            // This is a basic check - actual listener detection is limited in content scripts
            if (element.getAttribute(`on${type}`)) {
                events[`on${type}`] = 'attribute_handler';
            }
        });

        return events;
    }

    /**
     * Extract semantic information about element
     */
    static extractSemanticInfo(element) {
        const tagName = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        
        return {
            semanticTag: ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'].includes(tagName),
            headingLevel: tagName.match(/^h[1-6]$/) ? parseInt(tagName.substring(1)) : null,
            listType: ['ul', 'ol', 'dl'].includes(tagName) ? tagName : null,
            role: role,
            landmark: this.identifyLandmarkRole(element)
        };
    }

    /**
     * Extract visual information about element
     */
    static extractVisualInfo(element, style, rect) {
        return {
            position: style.position,
            zIndex: style.zIndex !== 'auto' ? style.zIndex : null,
            backgroundColor: style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? style.backgroundColor : null,
            color: style.color,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            overflow: style.overflow,
            boundingBox: {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                top: Math.round(rect.top),
                left: Math.round(rect.left)
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMUtilities;
} else {
    window.DOMUtilities = DOMUtilities;
}
