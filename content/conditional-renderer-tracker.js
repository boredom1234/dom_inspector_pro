/**
 * Conditional Renderer Tracker - Monitors dynamic content and conditional rendering
 * Detects visibility changes, state transitions, and conditional UI patterns
 */

// Global class declaration for content script compatibility
window.ConditionalRendererTracker = class ConditionalRendererTracker {
    constructor(options = {}) {
        this.options = {
            trackVisibilityChanges: options.trackVisibilityChanges !== false,
            trackDynamicContent: options.trackDynamicContent !== false,
            trackStateChanges: options.trackStateChanges !== false,
            trackAsyncLoading: options.trackAsyncLoading !== false,
            debounceDelay: options.debounceDelay || 200,
            maxTrackedElements: options.maxTrackedElements || 1000,
            ...options
        };
        
        this.trackedElements = new Map();
        this.visibilityStates = new Map();
        this.contentStates = new Map();
        this.loadingStates = new Map();
        this.renderingPatterns = new Map();
        
        this.isTracking = false;
        this.observers = [];
        this.debounceTimers = new Map();
        this.frameCallbacks = new Set();
        
        // Patterns to detect conditional rendering
        this.conditionalPatterns = {
            visibilityClasses: [
                'hidden', 'hide', 'invisible', 'collapse', 'collapsed',
                'd-none', 'sr-only', 'visually-hidden', 'opacity-0'
            ],
            showClasses: [
                'show', 'visible', 'active', 'open', 'expanded',
                'd-block', 'd-inline', 'd-flex', 'opacity-100'
            ],
            loadingClasses: [
                'loading', 'spinner', 'skeleton', 'placeholder',
                'shimmer', 'loading-state', 'is-loading'
            ],
            dynamicSelectors: [
                '[data-dynamic]', '[data-conditional]', '[data-toggle]',
                '[data-show-if]', '[data-hide-if]', '[v-if]', '[v-show]',
                '[ng-if]', '[ng-show]', '[ng-hide]'
            ]
        };
    }

    /**
     * Start conditional rendering tracking
     */
    startTracking() {
        if (this.isTracking) return;
        
        try {
            this.isTracking = true;
            this.setupObservers();
            this.setupEventListeners();
            this.scanInitialState();
            this.startPerformanceMonitoring();
            
            console.log('Conditional rendering tracking started');
            
        } catch (error) {
            console.error('Failed to start conditional rendering tracking:', error);
            this.isTracking = false;
        }
    }

    /**
     * Stop conditional rendering tracking
     */
    stopTracking() {
        if (!this.isTracking) return;
        
        try {
            this.isTracking = false;
            this.removeObservers();
            this.removeEventListeners();
            this.stopPerformanceMonitoring();
            
            console.log('Conditional rendering tracking stopped');
            
        } catch (error) {
            console.error('Failed to stop conditional rendering tracking:', error);
        }
    }

    /**
     * Setup mutation observers for conditional rendering
     */
    setupObservers() {
        // Observer for style changes (visibility, display)
        const styleObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    this.handleStyleChange(mutation.target, mutation.attributeName);
                }
            });
        });

        // Observer for DOM structure changes
        const structureObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleElementAdded(node);
                        }
                    });
                    
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleElementRemoved(node);
                        }
                    });
                }
            });
        });

        // Observer for text content changes (dynamic content)
        const contentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || 
                    (mutation.type === 'childList' && mutation.target.nodeType === Node.ELEMENT_NODE)) {
                    this.handleContentChange(mutation.target);
                }
            });
        });

        // Start observing
        styleObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true
        });

        structureObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        contentObserver.observe(document.body, {
            childList: true,
            characterData: true,
            subtree: true
        });

        this.observers.push(styleObserver, structureObserver, contentObserver);
    }

    /**
     * Setup event listeners for state changes
     */
    setupEventListeners() {
        // Listen for custom events that might trigger conditional rendering
        document.addEventListener('statechange', this.handleStateChange.bind(this), true);
        document.addEventListener('dataload', this.handleDataLoad.bind(this), true);
        document.addEventListener('componentupdate', this.handleComponentUpdate.bind(this), true);
        
        // Framework-specific events
        document.addEventListener('vue:updated', this.handleFrameworkUpdate.bind(this), true);
        document.addEventListener('react:update', this.handleFrameworkUpdate.bind(this), true);
        document.addEventListener('angular:change', this.handleFrameworkUpdate.bind(this), true);
        
        // AJAX/Fetch monitoring
        this.interceptNetworkRequests();
    }

    /**
     * Scan initial state of conditional elements
     */
    scanInitialState() {
        try {
            // Find elements with conditional attributes
            const conditionalElements = document.querySelectorAll(
                this.conditionalPatterns.dynamicSelectors.join(',')
            );
            
            conditionalElements.forEach(element => {
                this.trackElement(element, 'initial_scan');
            });

            // Find elements with visibility/loading classes
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                if (this.hasConditionalClasses(element)) {
                    this.trackElement(element, 'initial_scan');
                }
            });

            // Detect common conditional rendering patterns
            this.detectRenderingPatterns();
            
        } catch (error) {
            console.warn('Error scanning initial conditional state:', error);
        }
    }

    /**
     * Handle style changes (visibility, display, etc.)
     */
    handleStyleChange(element, attributeName) {
        if (!this.shouldTrackElement(element)) return;
        
        const currentVisibility = this.getElementVisibilityState(element);
        const previousVisibility = this.visibilityStates.get(element);
        
        if (this.hasVisibilityChanged(previousVisibility, currentVisibility)) {
            this.recordVisibilityChange(element, previousVisibility, currentVisibility, attributeName);
        }
    }

    /**
     * Handle element addition
     */
    handleElementAdded(element) {
        // Check if it's a dynamically rendered element
        if (this.isDynamicallyRendered(element)) {
            this.recordDynamicRender(element, 'added');
        }
        
        // Track if it has conditional attributes
        if (this.hasConditionalAttributes(element)) {
            this.trackElement(element, 'dynamic_add');
        }
        
        // Check children for conditional elements
        const conditionalChildren = element.querySelectorAll(
            this.conditionalPatterns.dynamicSelectors.join(',')
        );
        conditionalChildren.forEach(child => {
            this.trackElement(child, 'dynamic_add');
        });
    }

    /**
     * Handle element removal
     */
    handleElementRemoved(element) {
        if (this.trackedElements.has(element)) {
            this.recordDynamicRender(element, 'removed');
            this.untrackElement(element);
        }
    }

    /**
     * Handle content changes
     */
    handleContentChange(element) {
        if (!this.shouldTrackElement(element)) return;
        
        const currentContent = this.getElementContentState(element);
        const previousContent = this.contentStates.get(element);
        
        if (this.hasContentChanged(previousContent, currentContent)) {
            this.recordContentChange(element, previousContent, currentContent);
        }
    }

    /**
     * Track an element for conditional rendering
     */
    trackElement(element, source) {
        if (this.trackedElements.size >= this.options.maxTrackedElements) {
            // Remove oldest tracked elements
            const oldestElements = Array.from(this.trackedElements.keys()).slice(0, 100);
            oldestElements.forEach(el => this.untrackElement(el));
        }
        
        const trackingData = {
            element: this.getElementIdentifier(element),
            source: source,
            startTime: Date.now(),
            visibilityState: this.getElementVisibilityState(element),
            contentState: this.getElementContentState(element),
            conditionalAttributes: this.getConditionalAttributes(element),
            renderingPattern: this.detectElementPattern(element)
        };
        
        this.trackedElements.set(element, trackingData);
        this.visibilityStates.set(element, trackingData.visibilityState);
        this.contentStates.set(element, trackingData.contentState);
        
        this.sendConditionalData('element_tracked', trackingData);
    }

    /**
     * Untrack an element
     */
    untrackElement(element) {
        this.trackedElements.delete(element);
        this.visibilityStates.delete(element);
        this.contentStates.delete(element);
        this.loadingStates.delete(element);
    }

    /**
     * Record visibility change
     */
    recordVisibilityChange(element, previousState, currentState, trigger) {
        const changeData = {
            element: this.getElementIdentifier(element),
            previousState: previousState,
            currentState: currentState,
            trigger: trigger,
            timestamp: Date.now(),
            type: 'visibility_change'
        };
        
        this.visibilityStates.set(element, currentState);
        this.sendConditionalData('visibility_change', changeData);
        
        // Check if this reveals new conditional content
        if (currentState.isVisible && !previousState?.isVisible) {
            this.scanForNewConditionalContent(element);
        }
    }

    /**
     * Record dynamic rendering
     */
    recordDynamicRender(element, action) {
        const renderData = {
            element: this.getElementIdentifier(element),
            action: action, // 'added' or 'removed'
            timestamp: Date.now(),
            parentContext: this.getParentContext(element),
            renderingContext: this.getRenderingContext(element),
            type: 'dynamic_render'
        };
        
        this.sendConditionalData('dynamic_render', renderData);
    }

    /**
     * Record content change
     */
    recordContentChange(element, previousContent, currentContent) {
        const changeData = {
            element: this.getElementIdentifier(element),
            previousContent: previousContent,
            currentContent: currentContent,
            changeType: this.classifyContentChange(previousContent, currentContent),
            timestamp: Date.now(),
            type: 'content_change'
        };
        
        this.contentStates.set(element, currentContent);
        this.sendConditionalData('content_change', changeData);
    }

    /**
     * Get element visibility state
     */
    getElementVisibilityState(element) {
        const computedStyle = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return {
            isVisible: DOMUtils.isElementVisible(element),
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            position: computedStyle.position,
            zIndex: computedStyle.zIndex,
            inViewport: rect.width > 0 && rect.height > 0,
            hasVisibilityClasses: this.hasVisibilityClasses(element),
            hasShowClasses: this.hasShowClasses(element)
        };
    }

    /**
     * Get element content state
     */
    getElementContentState(element) {
        return {
            textContent: element.textContent?.substring(0, 200) || '',
            innerHTML: element.innerHTML?.substring(0, 500) || '',
            childCount: element.children.length,
            hasLoadingState: this.hasLoadingClasses(element),
            isEmpty: !element.textContent?.trim() && element.children.length === 0
        };
    }

    /**
     * Get conditional attributes
     */
    getConditionalAttributes(element) {
        const attributes = {};
        
        // Check for framework-specific conditional attributes
        const conditionalAttrs = [
            'v-if', 'v-show', 'v-else', 'v-else-if',
            'ng-if', 'ng-show', 'ng-hide',
            'data-conditional', 'data-toggle', 'data-show-if', 'data-hide-if',
            'data-depends-on', 'data-state'
        ];
        
        conditionalAttrs.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value !== null) {
                attributes[attr] = value;
            }
        });
        
        return attributes;
    }

    /**
     * Detect rendering patterns
     */
    detectRenderingPatterns() {
        const patterns = {
            modals: this.detectModalPatterns(),
            tabs: this.detectTabPatterns(),
            accordions: this.detectAccordionPatterns(),
            dropdowns: this.detectDropdownPatterns(),
            wizards: this.detectWizardPatterns(),
            carousels: this.detectCarouselPatterns(),
            loadingStates: this.detectLoadingPatterns()
        };
        
        Object.entries(patterns).forEach(([patternType, instances]) => {
            if (instances.length > 0) {
                this.renderingPatterns.set(patternType, instances);
                this.sendConditionalData('pattern_detected', {
                    patternType: patternType,
                    instances: instances,
                    count: instances.length
                });
            }
        });
    }

    /**
     * Detect modal patterns
     */
    detectModalPatterns() {
        const modals = document.querySelectorAll(
            '.modal, .popup, .overlay, .dialog, [role="dialog"], [aria-modal="true"]'
        );
        
        return Array.from(modals).map(modal => ({
            element: this.getElementIdentifier(modal),
            isVisible: DOMUtils.isElementVisible(modal),
            triggers: this.findModalTriggers(modal),
            type: 'modal'
        }));
    }

    /**
     * Detect tab patterns
     */
    detectTabPatterns() {
        const tabContainers = document.querySelectorAll(
            '.tabs, .tab-container, [role="tablist"]'
        );
        
        return Array.from(tabContainers).map(container => {
            const tabs = container.querySelectorAll('[role="tab"], .tab, .tab-button');
            const panels = container.querySelectorAll('[role="tabpanel"], .tab-panel, .tab-content');
            
            return {
                element: this.getElementIdentifier(container),
                tabs: Array.from(tabs).map(tab => this.getElementIdentifier(tab)),
                panels: Array.from(panels).map(panel => this.getElementIdentifier(panel)),
                activeTab: this.findActiveTab(tabs),
                type: 'tabs'
            };
        });
    }

    /**
     * Detect accordion patterns
     */
    detectAccordionPatterns() {
        const accordions = document.querySelectorAll(
            '.accordion, .collapse, .expandable, [data-accordion]'
        );
        
        return Array.from(accordions).map(accordion => {
            const items = accordion.querySelectorAll('.accordion-item, .collapse-item, .expandable-item');
            
            return {
                element: this.getElementIdentifier(accordion),
                items: Array.from(items).map(item => ({
                    element: this.getElementIdentifier(item),
                    isExpanded: this.isAccordionItemExpanded(item)
                })),
                type: 'accordion'
            };
        });
    }

    /**
     * Performance monitoring for conditional rendering
     */
    startPerformanceMonitoring() {
        // Monitor frame rate during conditional rendering
        const monitorFrames = () => {
            if (!this.isTracking) return;
            
            const frameCallback = (timestamp) => {
                // Track rendering performance
                this.trackRenderingPerformance(timestamp);
                
                if (this.isTracking) {
                    this.frameCallbacks.add(requestAnimationFrame(frameCallback));
                }
            };
            
            this.frameCallbacks.add(requestAnimationFrame(frameCallback));
        };
        
        monitorFrames();
    }

    /**
     * Stop performance monitoring
     */
    stopPerformanceMonitoring() {
        this.frameCallbacks.forEach(id => cancelAnimationFrame(id));
        this.frameCallbacks.clear();
    }

    /**
     * Intercept network requests to track async loading
     */
    interceptNetworkRequests() {
        // Intercept fetch
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            this.recordNetworkRequest('fetch', args[0]);
            return originalFetch.apply(this, args)
                .then(response => {
                    this.recordNetworkResponse('fetch', args[0], response);
                    return response;
                })
                .catch(error => {
                    this.recordNetworkError('fetch', args[0], error);
                    throw error;
                });
        };

        // Intercept XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            xhr.open = function(method, url, ...args) {
                this._requestInfo = { method, url };
                return originalOpen.apply(this, [method, url, ...args]);
            };
            
            xhr.send = function(...args) {
                if (this._requestInfo) {
                    // Record request
                    this.addEventListener('loadend', () => {
                        // Record response
                    });
                }
                return originalSend.apply(this, args);
            };
            
            return xhr;
        };
    }

    /**
     * Send conditional rendering data
     */
    sendConditionalData(type, data) {
        try {
            chrome.runtime.sendMessage({
                action: MESSAGE_TYPES.CONDITIONAL_RENDER_DATA,
                renderingType: type,
                data: data,
                url: window.location.href,
                timestamp: Date.now()
            }).catch(error => {
                console.warn('Failed to send conditional rendering data:', error);
            });
        } catch (error) {
            console.warn('Error sending conditional rendering data:', error);
        }
    }

    /**
     * Helper methods
     */
    
    getElementIdentifier(element) {
        return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            xpath: DOMUtils.generateXPath(element),
            cssSelector: DOMUtils.generateCSSSelector(element)
        };
    }
    
    shouldTrackElement(element) {
        return element.nodeType === Node.ELEMENT_NODE &&
               !element.tagName.match(/^(SCRIPT|STYLE|META|LINK)$/i);
    }
    
    hasConditionalClasses(element) {
        const classList = Array.from(element.classList);
        return this.conditionalPatterns.visibilityClasses.some(cls => classList.includes(cls)) ||
               this.conditionalPatterns.showClasses.some(cls => classList.includes(cls)) ||
               this.conditionalPatterns.loadingClasses.some(cls => classList.includes(cls));
    }
    
    hasVisibilityClasses(element) {
        const classList = Array.from(element.classList);
        return this.conditionalPatterns.visibilityClasses.some(cls => classList.includes(cls));
    }
    
    hasShowClasses(element) {
        const classList = Array.from(element.classList);
        return this.conditionalPatterns.showClasses.some(cls => classList.includes(cls));
    }
    
    hasLoadingClasses(element) {
        const classList = Array.from(element.classList);
        return this.conditionalPatterns.loadingClasses.some(cls => classList.includes(cls));
    }
    
    hasConditionalAttributes(element) {
        return this.conditionalPatterns.dynamicSelectors.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }
    
    isDynamicallyRendered(element) {
        return this.hasConditionalAttributes(element) ||
               this.hasConditionalClasses(element) ||
               element.hasAttribute('data-dynamic') ||
               element.hasAttribute('data-rendered');
    }
    
    hasVisibilityChanged(previous, current) {
        if (!previous) return true;
        return previous.isVisible !== current.isVisible ||
               previous.display !== current.display ||
               previous.visibility !== current.visibility;
    }
    
    hasContentChanged(previous, current) {
        if (!previous) return true;
        return previous.textContent !== current.textContent ||
               previous.childCount !== current.childCount ||
               previous.hasLoadingState !== current.hasLoadingState;
    }

    /**
     * Public methods
     */
    
    getTrackedElements() {
        return Array.from(this.trackedElements.values());
    }
    
    getRenderingPatterns() {
        return Object.fromEntries(this.renderingPatterns);
    }
    
    getCurrentRenderingState() {
        return {
            trackedElements: this.trackedElements.size,
            visibilityStates: this.visibilityStates.size,
            contentStates: this.contentStates.size,
            renderingPatterns: this.renderingPatterns.size,
            timestamp: Date.now()
        };
    }
}

export default ConditionalRendererTracker;
