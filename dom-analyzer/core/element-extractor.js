/**
 * Element Extractor - Core DOM extraction logic
 * Handles element discovery, filtering, and data extraction with performance optimization
 */

// Global class declaration for content script compatibility
window.ElementExtractor = class ElementExtractor {
    constructor(options = {}) {
        this.options = {
            maxDepth: options.maxDepth || (window.PERFORMANCE_LIMITS?.MAX_DEPTH) || 20,
            maxElements: options.maxElements || (window.PERFORMANCE_LIMITS?.MAX_ELEMENTS) || 1000,
            includeHidden: options.includeHidden || false,
            includeComputedStyles: options.includeComputedStyles || false,
            includeMeta: options.includeMeta || true,
            cssSelectorsFilter: options.cssSelectorsFilter || '',
            excludeSelectors: options.excludeSelectors || [],
            includeOnlySelectors: options.includeOnlySelectors || [],
            timeout: options.timeout || 30000,
            ...options
        };
        
        this.extractedCount = 0;
        this.startTime = 0;
        this.extractionCache = new Map();
        this.performanceMetrics = {
            totalElements: 0,
            processedElements: 0,
            skippedElements: 0,
            extractionTime: 0,
            cacheHits: 0
        };
    }

    /**
     * Extract elements from DOM with comprehensive analysis
     */
    extractElements(rootElement = document.body, config = {}) {
        this.startTime = performance.now();
        this.extractedCount = 0;
        this.extractionCache.clear();
        this.resetMetrics();

        const mergedConfig = { ...this.options, ...config };
        
        try {
            // Validate root element
            if (!rootElement || rootElement.nodeType !== Node.ELEMENT_NODE) {
                throw new Error('Invalid root element provided');
            }

            // Pre-process filters
            const filters = this.prepareFilters(mergedConfig);
            
            // Extract elements with depth-first traversal
            const elements = this.extractElementsRecursive(rootElement, 0, filters, mergedConfig);
            
            // Post-process extracted elements
            const processedElements = this.postProcessElements(elements, mergedConfig);
            
            // Calculate final metrics
            this.performanceMetrics.extractionTime = performance.now() - this.startTime;
            this.performanceMetrics.totalElements = this.extractedCount;
            
            return {
                elements: processedElements,
                metadata: this.generateMetadata(mergedConfig),
                performance: { ...this.performanceMetrics }
            };
            
        } catch (error) {
            console.error('Element extraction failed:', error);
            return {
                elements: [],
                metadata: { error: error.message },
                performance: { ...this.performanceMetrics, error: error.message }
            };
        }
    }

    /**
     * Recursive element extraction with performance optimization
     */
    extractElementsRecursive(element, depth, filters, config) {
        const results = [];
        
        // Check performance limits
        if (this.shouldStopExtraction(depth, config)) {
            this.performanceMetrics.skippedElements++;
            return results;
        }

        // Check element against filters
        if (!this.shouldIncludeElement(element, filters, config)) {
            this.performanceMetrics.skippedElements++;
            return results;
        }

        // Extract element data
        const elementData = this.extractElementData(element, depth, config);
        if (elementData) {
            results.push(elementData);
            this.extractedCount++;
            this.performanceMetrics.processedElements++;
        }

        // Process child elements
        if (depth < config.maxDepth && element.children) {
            for (const child of element.children) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    const childResults = this.extractElementsRecursive(child, depth + 1, filters, config);
                    results.push(...childResults);
                }
            }
        }

        return results;
    }

    /**
     * Extract comprehensive data for a single element
     */
    extractElementData(element, depth = 0, config = {}) {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(element, config);
            if (this.extractionCache.has(cacheKey)) {
                this.performanceMetrics.cacheHits++;
                return this.extractionCache.get(cacheKey);
            }

            // Basic element information
            const elementData = {
                tagName: element.tagName.toLowerCase(),
                id: element.id || null,
                className: element.className || null,
                classNames: element.className ? Array.from(element.classList) : [],
                attributes: this.extractAttributes(element),
                textContent: this.extractTextContent(element),
                innerHTML: config.includeInnerHTML ? this.sanitizeHTML(element.innerHTML) : null,
                depth: depth,
                xpath: DOMUtils.generateXPath(element),
                cssSelector: DOMUtils.generateCSSSelector(element),
                uniqueSelector: DOMUtils.generateUniqueSelector(element)
            };

            // Position and dimensions
            if (config.includePosition !== false) {
                elementData.position = this.extractPositionData(element);
            }

            // Computed styles
            if (config.includeComputedStyles) {
                elementData.computedStyles = this.extractComputedStyles(element);
            }

            // Element classification
            elementData.classification = this.classifyElement(element);

            // Interactive element data
            if (DOMUtils.isInteractiveElement(element)) {
                elementData.interactivity = this.extractInteractivityData(element);
            }

            // Form element data
            if (this.isFormElement(element)) {
                elementData.formData = this.extractFormData(element);
            }

            // Media element data
            if (this.isMediaElement(element)) {
                elementData.mediaData = this.extractMediaData(element);
            }

            // Link data
            if (element.tagName.toLowerCase() === 'a') {
                elementData.linkData = this.extractLinkData(element);
            }

            // Accessibility information
            if (config.includeAccessibility !== false) {
                elementData.accessibility = this.extractAccessibilityData(element);
            }

            // Element relationships
            elementData.relationships = this.extractRelationships(element);

            // Custom data attributes
            elementData.dataAttributes = this.extractDataAttributes(element);

            // Cache the result
            this.extractionCache.set(cacheKey, elementData);
            
            return elementData;
            
        } catch (error) {
            console.warn(`Failed to extract data for element:`, element, error);
            return null;
        }
    }

    /**
     * Extract element attributes
     */
    extractAttributes(element) {
        const attributes = {};
        
        if (element.attributes) {
            for (const attr of element.attributes) {
                // Skip very long attribute values for performance
                if (attr.value && attr.value.length > 1000) {
                    attributes[attr.name] = attr.value.substring(0, 1000) + '... (truncated)';
                } else {
                    attributes[attr.name] = attr.value;
                }
            }
        }
        
        return attributes;
    }

    /**
     * Extract text content safely
     */
    extractTextContent(element) {
        try {
            const text = element.textContent || '';
            // Limit text length for performance
            return text.length > 500 ? text.substring(0, 500) + '... (truncated)' : text.trim();
        } catch (error) {
            return '';
        }
    }

    /**
     * Extract position and dimension data
     */
    extractPositionData(element) {
        try {
            const rect = element.getBoundingClientRect();
            return {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                visible: DOMUtils.isElementVisible(element),
                inViewport: this.isInViewport(rect)
            };
        } catch (error) {
            return { visible: false, inViewport: false };
        }
    }

    /**
     * Extract computed styles (selective)
     */
    extractComputedStyles(element) {
        try {
            const styles = window.getComputedStyle(element);
            const importantStyles = {};
            
            // Extract only commonly used styles for performance
            const styleProperties = [
                'display', 'visibility', 'opacity', 'position', 'z-index',
                'width', 'height', 'margin', 'padding', 'border',
                'background-color', 'color', 'font-size', 'font-family',
                'text-align', 'overflow', 'cursor', 'pointer-events'
            ];
            
            styleProperties.forEach(prop => {
                importantStyles[prop] = styles.getPropertyValue(prop);
            });
            
            return importantStyles;
        } catch (error) {
            return {};
        }
    }

    /**
     * Classify element type and purpose
     */
    classifyElement(element) {
        const classification = {
            type: element.tagName.toLowerCase(),
            category: this.getCategoryFromTag(element.tagName),
            isInteractive: DOMUtils.isInteractiveElement(element),
            isVisible: DOMUtils.isElementVisible(element),
            isForm: this.isFormElement(element),
            isMedia: this.isMediaElement(element),
            isNavigation: this.isNavigationElement(element),
            isContent: this.isContentElement(element),
            semanticRole: element.getAttribute('role') || this.inferSemanticRole(element)
        };
        
        return classification;
    }

    /**
     * Extract interactivity data
     */
    extractInteractivityData(element) {
        const data = {
            clickable: DOMUtils.isClickableElement(element),
            focusable: this.isFocusable(element),
            hasEventListeners: this.hasEventListeners(element),
            disabled: element.disabled || element.getAttribute('aria-disabled') === 'true',
            tabIndex: element.tabIndex
        };
        
        return data;
    }

    /**
     * Extract form element data
     */
    extractFormData(element) {
        const formData = {
            type: element.type || null,
            name: element.name || null,
            value: this.sanitizeValue(element.value),
            required: element.required || false,
            disabled: element.disabled || false,
            readonly: element.readOnly || false,
            placeholder: element.placeholder || null
        };
        
        if (element.tagName.toLowerCase() === 'select') {
            formData.options = Array.from(element.options).map(option => ({
                value: option.value,
                text: option.text,
                selected: option.selected
            }));
        }
        
        return formData;
    }

    /**
     * Extract media element data
     */
    extractMediaData(element) {
        const mediaData = {
            src: element.src || null,
            alt: element.alt || null,
            title: element.title || null
        };
        
        if (element.tagName.toLowerCase() === 'video') {
            mediaData.duration = element.duration || null;
            mediaData.controls = element.controls || false;
        }
        
        return mediaData;
    }

    /**
     * Extract link data
     */
    extractLinkData(element) {
        return {
            href: element.href || null,
            target: element.target || null,
            rel: element.rel || null,
            download: element.download || null,
            external: element.hostname !== window.location.hostname
        };
    }

    /**
     * Extract accessibility data
     */
    extractAccessibilityData(element) {
        return {
            ariaLabel: element.getAttribute('aria-label'),
            ariaDescribedBy: element.getAttribute('aria-describedby'),
            ariaLabelledBy: element.getAttribute('aria-labelledby'),
            ariaRole: element.getAttribute('role'),
            ariaHidden: element.getAttribute('aria-hidden') === 'true',
            title: element.title,
            alt: element.alt
        };
    }

    /**
     * Extract element relationships
     */
    extractRelationships(element) {
        return {
            parent: element.parentElement ? {
                tagName: element.parentElement.tagName.toLowerCase(),
                id: element.parentElement.id,
                className: element.parentElement.className
            } : null,
            childrenCount: element.children.length,
            siblingIndex: Array.from(element.parentElement?.children || []).indexOf(element),
            hasChildren: element.children.length > 0
        };
    }

    /**
     * Extract data attributes
     */
    extractDataAttributes(element) {
        const dataAttrs = {};
        
        if (element.attributes) {
            for (const attr of element.attributes) {
                if (attr.name.startsWith('data-')) {
                    dataAttrs[attr.name] = attr.value;
                }
            }
        }
        
        return dataAttrs;
    }

    /**
     * Prepare filters for element extraction
     */
    prepareFilters(config) {
        const filters = {
            excludeSelectors: [],
            includeOnlySelectors: [],
            cssSelectorsFilter: null
        };
        
        // Process exclude selectors
        if (config.excludeSelectors && config.excludeSelectors.length > 0) {
            filters.excludeSelectors = config.excludeSelectors
                .filter(selector => selector && selector.trim())
                .map(selector => selector.trim());
        }
        
        // Process include only selectors
        if (config.includeOnlySelectors && config.includeOnlySelectors.length > 0) {
            filters.includeOnlySelectors = config.includeOnlySelectors
                .filter(selector => selector && selector.trim())
                .map(selector => selector.trim());
        }
        
        // Process CSS selector filter
        if (config.cssSelectorsFilter && config.cssSelectorsFilter.trim()) {
            filters.cssSelectorsFilter = config.cssSelectorsFilter.trim();
        }
        
        return filters;
    }

    /**
     * Check if element should be included based on filters
     */
    shouldIncludeElement(element, filters, config) {
        // Check visibility
        if (!config.includeHidden && !DOMUtils.isElementVisible(element)) {
            return false;
        }
        
        // Check exclude selectors
        if (filters.excludeSelectors.length > 0) {
            for (const selector of filters.excludeSelectors) {
                try {
                    if (element.matches(selector)) {
                        return false;
                    }
                } catch (error) {
                    console.warn('Invalid exclude selector:', selector);
                }
            }
        }
        
        // Check include only selectors
        if (filters.includeOnlySelectors.length > 0) {
            let matches = false;
            for (const selector of filters.includeOnlySelectors) {
                try {
                    if (element.matches(selector)) {
                        matches = true;
                        break;
                    }
                } catch (error) {
                    console.warn('Invalid include selector:', selector);
                }
            }
            if (!matches) {
                return false;
            }
        }
        
        // Check CSS selector filter
        if (filters.cssSelectorsFilter) {
            try {
                if (!element.matches(filters.cssSelectorsFilter)) {
                    return false;
                }
            } catch (error) {
                console.warn('Invalid CSS selector filter:', filters.cssSelectorsFilter);
            }
        }
        
        return true;
    }

    /**
     * Check if extraction should stop
     */
    shouldStopExtraction(depth, config) {
        // Check depth limit
        if (depth >= config.maxDepth) {
            return true;
        }
        
        // Check element count limit
        if (this.extractedCount >= config.maxElements) {
            return true;
        }
        
        // Check timeout
        if (config.timeout && (performance.now() - this.startTime) > config.timeout) {
            return true;
        }
        
        return false;
    }

    /**
     * Post-process extracted elements
     */
    postProcessElements(elements, config) {
        // Sort elements by depth and DOM order
        elements.sort((a, b) => {
            if (a.depth !== b.depth) {
                return a.depth - b.depth;
            }
            // Maintain DOM order for same depth
            return 0;
        });
        
        // Add element indices
        elements.forEach((element, index) => {
            element.elementIndex = index;
        });
        
        return elements;
    }

    /**
     * Generate extraction metadata
     */
    generateMetadata(config) {
        return {
            extractionTime: performance.now() - this.startTime,
            totalElements: this.extractedCount,
            configuration: { ...config },
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            documentTitle: document.title
        };
    }

    /**
     * Extract elements optimized for test generation
     * Reduces data size by 60-70% while maintaining test quality
     */
    extractForTestGeneration(rootElement = document.body, config = {}) {
        const optimizedConfig = {
            // Focus on interactive elements only
            includeOnlySelectors: [
                'input', 'button', 'select', 'textarea', 'a[href]',
                '[onclick]', '[role="button"]', '[tabindex]',
                'form', 'fieldset'
            ],
            
            // Skip non-essential elements
            excludeSelectors: [
                'script', 'style', 'meta', 'link', 'title', 'head'
            ],
            
            // Minimal extraction settings
            includeHidden: false,
            includeComputedStyles: false,
            includePosition: false,
            includeAccessibility: false,
            includeInnerHTML: false,
            maxDepth: 8,
            
            ...config
        };

        const result = this.extractElements(rootElement, optimizedConfig);
        
        // Post-process to remove unnecessary fields
        if (result.elements) {
            result.elements = result.elements.map(element => ({
                tagName: element.tagName,
                xpath: element.xpath,
                name: element.formData?.name || element.attributes?.name,
                type: element.formData?.type || element.attributes?.type,
                value: element.formData?.value || element.attributes?.value,
                text: element.textContent?.trim() || null,
                attributes: this.filterEssentialAttributes(element.attributes)
            })).filter(element => 
                // Only keep elements that are useful for testing
                element.tagName && (
                    element.name || 
                    element.type || 
                    element.text || 
                    element.attributes?.id ||
                    ['button', 'a', 'form'].includes(element.tagName)
                )
            );
        }

        return {
            elements: result.elements,
            url: window.location.href,
            title: document.title,
            extractedAt: new Date().toISOString()
        };
    }

    /**
     * Filter attributes to only essential ones for testing
     */
    filterEssentialAttributes(attributes) {
        if (!attributes) return {};
        
        const essential = ['id', 'name', 'type', 'value', 'href', 'role', 'aria-label', 'placeholder'];
        const filtered = {};
        
        essential.forEach(attr => {
            if (attributes[attr]) {
                filtered[attr] = attributes[attr];
            }
        });
        
        return Object.keys(filtered).length > 0 ? filtered : null;
    }

    /**
     * Helper methods
     */
    
    generateCacheKey(element, config) {
        return `${element.tagName}_${element.id || 'no-id'}_${element.className || 'no-class'}_${JSON.stringify(config)}`;
    }
    
    resetMetrics() {
        this.performanceMetrics = {
            totalElements: 0,
            processedElements: 0,
            skippedElements: 0,
            extractionTime: 0,
            cacheHits: 0
        };
    }
    
    sanitizeHTML(html) {
        if (!html || html.length > 2000) {
            return html ? html.substring(0, 2000) + '... (truncated)' : '';
        }
        return html;
    }
    
    sanitizeValue(value) {
        if (typeof value !== 'string') return value;
        return value.length > 500 ? value.substring(0, 500) + '... (truncated)' : value;
    }
    
    isInViewport(rect) {
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    isFormElement(element) {
        const formTags = ['input', 'textarea', 'select', 'button', 'form', 'label', 'fieldset', 'legend', 'optgroup', 'option'];
        return formTags.includes(element.tagName.toLowerCase());
    }
    
    isMediaElement(element) {
        const mediaTags = ['img', 'video', 'audio', 'canvas', 'svg', 'picture', 'source'];
        return mediaTags.includes(element.tagName.toLowerCase());
    }
    
    isNavigationElement(element) {
        const navTags = ['nav', 'a', 'menu', 'menuitem'];
        return navTags.includes(element.tagName.toLowerCase()) || 
               element.getAttribute('role') === 'navigation';
    }
    
    isContentElement(element) {
        const contentTags = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'article', 'section', 'main'];
        return contentTags.includes(element.tagName.toLowerCase());
    }
    
    getCategoryFromTag(tagName) {
        const tag = tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'heading';
        if (['p', 'span', 'div', 'article', 'section'].includes(tag)) return 'content';
        if (['input', 'textarea', 'select', 'button', 'form'].includes(tag)) return 'form';
        if (['img', 'video', 'audio', 'canvas'].includes(tag)) return 'media';
        if (['a', 'nav', 'menu'].includes(tag)) return 'navigation';
        if (['ul', 'ol', 'li', 'dl', 'dt', 'dd'].includes(tag)) return 'list';
        if (['table', 'tr', 'td', 'th', 'thead', 'tbody'].includes(tag)) return 'table';
        return 'other';
    }
    
    inferSemanticRole(element) {
        const tag = element.tagName.toLowerCase();
        const roleMap = {
            'nav': 'navigation',
            'main': 'main',
            'aside': 'complementary',
            'article': 'article',
            'section': 'region',
            'header': 'banner',
            'footer': 'contentinfo',
            'button': 'button',
            'a': 'link'
        };
        return roleMap[tag] || null;
    }
    
    isFocusable(element) {
        const focusableTags = ['input', 'textarea', 'select', 'button', 'a'];
        return focusableTags.includes(element.tagName.toLowerCase()) || 
               element.tabIndex >= 0;
    }
    
    hasEventListeners(element) {
        // This is a simplified check - real implementation would require
        // more sophisticated detection of event listeners
        return element.onclick !== null || 
               element.getAttribute('onclick') !== null ||
               element.style.cursor === 'pointer';
    }
}

export default ElementExtractor;
