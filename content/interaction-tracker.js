/**
 * Interaction Tracker - User interaction monitoring for content scripts
 * Tracks user interactions, focus changes, and behavioral patterns
 */

// Global class declaration for content script compatibility
window.InteractionTracker = class InteractionTracker {
    constructor(options = {}) {
        this.options = {
            trackClicks: options.trackClicks !== false,
            trackFocus: options.trackFocus !== false,
            trackScroll: options.trackScroll !== false,
            trackKeyboard: options.trackKeyboard !== false,
            trackMouse: options.trackMouse || false,
            trackFormInteractions: options.trackFormInteractions !== false,
            trackTiming: options.trackTiming !== false,
            maxInteractions: options.maxInteractions || (window.PERFORMANCE_LIMITS?.MAX_INTERACTIONS) || 1000,
            debounceDelay: options.debounceDelay || 100,
            sendInterval: options.sendInterval || 5000,
            enableHeatmap: options.enableHeatmap || false,
            ...options
        };
        
        this.interactions = [];
        this.currentSession = null;
        this.focusPath = [];
        this.scrollData = [];
        this.timingData = new Map();
        this.heatmapData = [];
        
        this.isTracking = false;
        this.listeners = new Map();
        this.debounceTimers = new Map();
        this.sendTimer = null;
        
        this.sessionMetrics = {
            startTime: null,
            totalClicks: 0,
            totalKeystrokes: 0,
            totalScrolls: 0,
            focusChanges: 0,
            uniqueElements: new Set()
        };
    }

    /**
     * Start tracking user interactions
     */
    startTracking() {
        if (this.isTracking) return;
        
        try {
            this.isTracking = true;
            this.initializeSession();
            this.setupEventListeners();
            this.startPeriodicSending();
            
            console.log('Interaction tracking started');
            
        } catch (error) {
            console.error('Failed to start interaction tracking:', error);
            this.isTracking = false;
        }
    }

    /**
     * Stop tracking user interactions
     */
    stopTracking() {
        if (!this.isTracking) return;
        
        try {
            this.isTracking = false;
            this.removeEventListeners();
            this.stopPeriodicSending();
            this.finalizeSession();
            
            console.log('Interaction tracking stopped');
            
        } catch (error) {
            console.error('Failed to stop interaction tracking:', error);
        }
    }

    /**
     * Initialize tracking session
     */
    initializeSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            url: window.location.href,
            title: document.title,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        
        this.sessionMetrics.startTime = Date.now();
        this.interactions = [];
        this.focusPath = [];
        this.scrollData = [];
        this.heatmapData = [];
        this.sessionMetrics.uniqueElements.clear();
    }

    /**
     * Setup event listeners for interaction tracking
     */
    setupEventListeners() {
        // Click tracking
        if (this.options.trackClicks) {
            this.addListener('click', document, this.handleClick.bind(this), true);
        }
        
        // Focus tracking
        if (this.options.trackFocus) {
            this.addListener('focusin', document, this.handleFocusIn.bind(this), true);
            this.addListener('focusout', document, this.handleFocusOut.bind(this), true);
        }
        
        // Scroll tracking
        if (this.options.trackScroll) {
            this.addListener('scroll', window, this.debounce('scroll', this.handleScroll.bind(this), this.options.debounceDelay), true);
        }
        
        // Keyboard tracking
        if (this.options.trackKeyboard) {
            this.addListener('keydown', document, this.handleKeyDown.bind(this), true);
            this.addListener('keyup', document, this.handleKeyUp.bind(this), true);
        }
        
        // Mouse tracking (optional - can be performance intensive)
        if (this.options.trackMouse) {
            this.addListener('mousemove', document, this.debounce('mousemove', this.handleMouseMove.bind(this), 50), true);
            this.addListener('mouseenter', document, this.handleMouseEnter.bind(this), true);
            this.addListener('mouseleave', document, this.handleMouseLeave.bind(this), true);
        }
        
        // Form interaction tracking
        if (this.options.trackFormInteractions) {
            this.addListener('input', document, this.handleInput.bind(this), true);
            this.addListener('change', document, this.handleChange.bind(this), true);
            this.addListener('submit', document, this.handleSubmit.bind(this), true);
        }
        
        // Page visibility changes
        this.addListener('visibilitychange', document, this.handleVisibilityChange.bind(this), true);
        
        // Window events
        this.addListener('beforeunload', window, this.handleBeforeUnload.bind(this), true);
        this.addListener('resize', window, this.debounce('resize', this.handleResize.bind(this), 200), true);
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        this.listeners.forEach((listener, key) => {
            const [eventType, element] = key.split(':');
            element.removeEventListener(eventType, listener.handler, listener.options);
        });
        
        this.listeners.clear();
        
        // Clear debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }

    /**
     * Add event listener with tracking
     */
    addListener(eventType, element, handler, capture = false) {
        const key = `${eventType}:${element === document ? 'document' : element === window ? 'window' : 'element'}`;
        
        const listenerInfo = {
            handler: handler,
            options: capture
        };
        
        element.addEventListener(eventType, handler, capture);
        this.listeners.set(key, listenerInfo);
    }

    /**
     * Handle click interactions
     */
    handleClick(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.CLICK, event);
            
            // Additional click-specific data
            interaction.button = event.button;
            interaction.buttons = event.buttons;
            interaction.detail = event.detail; // Click count
            interaction.altKey = event.altKey;
            interaction.ctrlKey = event.ctrlKey;
            interaction.shiftKey = event.shiftKey;
            interaction.metaKey = event.metaKey;
            
            // Element-specific data
            if (event.target) {
                interaction.elementInfo = this.extractElementInfo(event.target);
                interaction.clickable = DOMUtils.isClickableElement(event.target);
                interaction.interactive = DOMUtils.isInteractiveElement(event.target);
            }
            
            this.recordInteraction(interaction);
            this.sessionMetrics.totalClicks++;
            
            // Heatmap data
            if (this.options.enableHeatmap) {
                this.recordHeatmapPoint(event.clientX, event.clientY, 'click');
            }
            
        } catch (error) {
            console.warn('Error handling click event:', error);
        }
    }

    /**
     * Handle focus in events
     */
    handleFocusIn(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.FOCUS, event);
            interaction.focusMethod = this.inferFocusMethod(event);
            
            if (event.target) {
                interaction.elementInfo = this.extractElementInfo(event.target);
                
                // Update focus path
                this.focusPath.push({
                    element: interaction.elementInfo,
                    timestamp: interaction.timestamp,
                    method: interaction.focusMethod
                });
                
                // Keep focus path to reasonable size
                if (this.focusPath.length > 50) {
                    this.focusPath = this.focusPath.slice(-25);
                }
            }
            
            this.recordInteraction(interaction);
            this.sessionMetrics.focusChanges++;
            
        } catch (error) {
            console.warn('Error handling focus in event:', error);
        }
    }

    /**
     * Handle focus out events
     */
    handleFocusOut(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.BLUR, event);
            
            if (event.target) {
                interaction.elementInfo = this.extractElementInfo(event.target);
                interaction.focusDuration = this.calculateFocusDuration(event.target);
            }
            
            this.recordInteraction(interaction);
            
        } catch (error) {
            console.warn('Error handling focus out event:', error);
        }
    }

    /**
     * Handle scroll events
     */
    handleScroll(event) {
        try {
            const scrollData = {
                timestamp: Date.now(),
                scrollX: window.pageXOffset || document.documentElement.scrollLeft,
                scrollY: window.pageYOffset || document.documentElement.scrollTop,
                viewportHeight: window.innerHeight,
                documentHeight: Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.clientHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                )
            };
            
            scrollData.scrollPercentage = Math.round(
                (scrollData.scrollY / (scrollData.documentHeight - scrollData.viewportHeight)) * 100
            );
            
            this.scrollData.push(scrollData);
            
            // Keep scroll data manageable
            if (this.scrollData.length > 100) {
                this.scrollData = this.scrollData.slice(-50);
            }
            
            // Create interaction record
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.SCROLL, event);
            interaction.scrollData = scrollData;
            
            this.recordInteraction(interaction);
            this.sessionMetrics.totalScrolls++;
            
        } catch (error) {
            console.warn('Error handling scroll event:', error);
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.KEYDOWN, event);
            
            interaction.key = event.key;
            interaction.code = event.code;
            interaction.keyCode = event.keyCode;
            interaction.altKey = event.altKey;
            interaction.ctrlKey = event.ctrlKey;
            interaction.shiftKey = event.shiftKey;
            interaction.metaKey = event.metaKey;
            interaction.repeat = event.repeat;
            
            // Don't record sensitive key combinations
            if (this.isSensitiveKeyCombo(event)) {
                interaction.key = '[FILTERED]';
                interaction.sensitive = true;
            }
            
            if (event.target) {
                interaction.elementInfo = this.extractElementInfo(event.target);
            }
            
            this.recordInteraction(interaction);
            this.sessionMetrics.totalKeystrokes++;
            
        } catch (error) {
            console.warn('Error handling key down event:', error);
        }
    }

    /**
     * Handle key up events
     */
    handleKeyUp(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.KEYUP, event);
            
            interaction.key = event.key;
            interaction.code = event.code;
            
            if (this.isSensitiveKeyCombo(event)) {
                interaction.key = '[FILTERED]';
                interaction.sensitive = true;
            }
            
            this.recordInteraction(interaction);
            
        } catch (error) {
            console.warn('Error handling key up event:', error);
        }
    }

    /**
     * Handle form input events
     */
    handleInput(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.INPUT, event);
            
            if (event.target) {
                interaction.elementInfo = this.extractElementInfo(event.target);
                interaction.inputType = event.target.type;
                interaction.valueLength = event.target.value ? event.target.value.length : 0;
                
                // Don't record actual input values for privacy
                interaction.hasValue = !!event.target.value;
            }
            
            this.recordInteraction(interaction);
            
        } catch (error) {
            console.warn('Error handling input event:', error);
        }
    }

    /**
     * Handle form change events
     */
    handleChange(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.CHANGE, event);
            
            if (event.target) {
                interaction.elementInfo = this.extractElementInfo(event.target);
                interaction.inputType = event.target.type;
                
                if (event.target.type === 'checkbox' || event.target.type === 'radio') {
                    interaction.checked = event.target.checked;
                } else if (event.target.tagName === 'SELECT') {
                    interaction.selectedIndex = event.target.selectedIndex;
                    interaction.optionCount = event.target.options.length;
                }
            }
            
            this.recordInteraction(interaction);
            
        } catch (error) {
            console.warn('Error handling change event:', error);
        }
    }

    /**
     * Handle form submit events
     */
    handleSubmit(event) {
        try {
            const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.SUBMIT, event);
            
            if (event.target) {
                interaction.elementInfo = this.extractElementInfo(event.target);
                interaction.formMethod = event.target.method;
                interaction.formAction = event.target.action;
                interaction.formElementCount = event.target.elements.length;
            }
            
            this.recordInteraction(interaction);
            
        } catch (error) {
            console.warn('Error handling submit event:', error);
        }
    }

    /**
     * Create base interaction object
     */
    createBaseInteraction(type, event) {
        const interaction = {
            type: type,
            timestamp: Date.now(),
            sessionId: this.currentSession?.id,
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        
        // Add mouse position if available
        if (event && typeof event.clientX !== 'undefined') {
            interaction.clientX = event.clientX;
            interaction.clientY = event.clientY;
            interaction.pageX = event.pageX;
            interaction.pageY = event.pageY;
        }
        
        // Add timing data if enabled
        if (this.options.trackTiming) {
            interaction.performanceTiming = this.getPerformanceTiming();
        }
        
        return interaction;
    }

    /**
     * Extract element information
     */
    extractElementInfo(element) {
        if (!element) return null;
        
        try {
            const elementInfo = {
                tagName: element.tagName?.toLowerCase(),
                id: element.id || null,
                className: element.className || null,
                name: element.name || null,
                type: element.type || null,
                xpath: DOMUtils.generateXPath(element),
                cssSelector: DOMUtils.generateCSSSelector(element),
                textContent: element.textContent ? element.textContent.substring(0, 100) : null,
                visible: DOMUtils.isElementVisible(element),
                interactive: DOMUtils.isInteractiveElement(element)
            };
            
            // Add position data if element is visible
            if (elementInfo.visible) {
                try {
                    const rect = element.getBoundingClientRect();
                    elementInfo.position = {
                        left: Math.round(rect.left),
                        top: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    };
                } catch (error) {
                    // Position data not available
                }
            }
            
            return elementInfo;
            
        } catch (error) {
            console.warn('Error extracting element info:', error);
            return { error: error.message };
        }
    }

    /**
     * Record interaction with limits and validation
     */
    recordInteraction(interaction) {
        try {
            // Validate interaction
            if (!ValidationUtils.validateInteractionData(interaction)) {
                console.warn('Invalid interaction data, skipping');
                return;
            }
            
            // Track unique elements
            if (interaction.elementInfo && interaction.elementInfo.xpath) {
                this.sessionMetrics.uniqueElements.add(interaction.elementInfo.xpath);
            }
            
            // Add to interactions array
            this.interactions.push(interaction);
            
            // Maintain size limits
            if (this.interactions.length > this.options.maxInteractions) {
                this.interactions = this.interactions.slice(-Math.floor(this.options.maxInteractions * 0.8));
            }
            
        } catch (error) {
            console.warn('Error recording interaction:', error);
        }
    }

    /**
     * Debounce function for high-frequency events
     */
    debounce(key, func, wait) {
        return (...args) => {
            const timer = this.debounceTimers.get(key);
            if (timer) {
                clearTimeout(timer);
            }
            
            this.debounceTimers.set(key, setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, wait));
        };
    }

    /**
     * Start periodic sending of interaction data
     */
    startPeriodicSending() {
        if (this.sendTimer) return;
        
        this.sendTimer = setInterval(() => {
            this.sendInteractionData();
        }, this.options.sendInterval);
    }

    /**
     * Stop periodic sending
     */
    stopPeriodicSending() {
        if (this.sendTimer) {
            clearInterval(this.sendTimer);
            this.sendTimer = null;
        }
    }

    /**
     * Send interaction data to background script
     */
    sendInteractionData() {
        if (this.interactions.length === 0) return;
        
        try {
            const data = {
                session: this.currentSession,
                interactions: [...this.interactions],
                metrics: this.getSessionMetrics(),
                focusPath: [...this.focusPath],
                scrollData: [...this.scrollData],
                heatmapData: this.options.enableHeatmap ? [...this.heatmapData] : null,
                timestamp: Date.now()
            };
            
            // Send to background script
            chrome.runtime.sendMessage({
                action: window.MESSAGE_TYPES.INTERACTION_DATA,
                data: data
            }).catch(error => {
                console.warn('Failed to send interaction data:', error);
            });
            
            // Clear sent data to save memory
            this.interactions = [];
            this.heatmapData = [];
            
        } catch (error) {
            console.error('Error sending interaction data:', error);
        }
    }

    /**
     * Get current session metrics
     */
    getSessionMetrics() {
        const currentTime = Date.now();
        const sessionDuration = currentTime - (this.sessionMetrics.startTime || currentTime);
        
        return {
            ...this.sessionMetrics,
            sessionDuration: sessionDuration,
            uniqueElementCount: this.sessionMetrics.uniqueElements.size,
            interactionRate: sessionDuration > 0 ? 
                (this.sessionMetrics.totalClicks + this.sessionMetrics.totalKeystrokes) / (sessionDuration / 1000) : 0
        };
    }

    /**
     * Helper methods
     */
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    inferFocusMethod(event) {
        // Try to determine if focus was via keyboard or mouse
        if (event.detail === 0) return 'keyboard';
        if (event.detail > 0) return 'mouse';
        return 'unknown';
    }
    
    calculateFocusDuration(element) {
        const xpath = DOMUtils.generateXPath(element);
        const focusEntry = this.focusPath.findLast(entry => 
            entry.element && entry.element.xpath === xpath
        );
        
        return focusEntry ? Date.now() - focusEntry.timestamp : 0;
    }
    
    isSensitiveKeyCombo(event) {
        // Filter out potentially sensitive key combinations
        if (event.ctrlKey || event.metaKey) {
            const sensitiveKeys = ['a', 'c', 'v', 'x', 'z', 'y', 's', 'f'];
            return sensitiveKeys.includes(event.key.toLowerCase());
        }
        
        // Filter function keys
        return event.key.startsWith('F') && event.key.length <= 3;
    }
    
    recordHeatmapPoint(x, y, type) {
        this.heatmapData.push({
            x: x,
            y: y,
            type: type,
            timestamp: Date.now(),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
        
        // Limit heatmap data size
        if (this.heatmapData.length > 500) {
            this.heatmapData = this.heatmapData.slice(-250);
        }
    }
    
    getPerformanceTiming() {
        try {
            const timing = performance.timing;
            return {
                navigationStart: timing.navigationStart,
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                currentTime: Date.now() - timing.navigationStart
            };
        } catch (error) {
            return null;
        }
    }
    
    handleMouseMove(event) {
        // Simplified mouse tracking
        if (this.options.enableHeatmap) {
            this.recordHeatmapPoint(event.clientX, event.clientY, 'move');
        }
    }
    
    handleMouseEnter(event) {
        const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.MOUSE_ENTER, event);
        if (event.target) {
            interaction.elementInfo = this.extractElementInfo(event.target);
        }
        this.recordInteraction(interaction);
    }
    
    handleMouseLeave(event) {
        const interaction = this.createBaseInteraction(window.INTERACTION_TYPES.MOUSE_LEAVE, event);
        if (event.target) {
            interaction.elementInfo = this.extractElementInfo(event.target);
        }
        this.recordInteraction(interaction);
    }
    
    handleVisibilityChange() {
        const interaction = {
            type: window.INTERACTION_TYPES.VISIBILITY_CHANGE,
            timestamp: Date.now(),
            sessionId: this.currentSession?.id,
            hidden: document.hidden,
            visibilityState: document.visibilityState
        };
        
        this.recordInteraction(interaction);
    }
    
    handleBeforeUnload() {
        // Send any remaining interaction data before page unloads
        this.sendInteractionData();
        this.finalizeSession();
    }
    
    handleResize() {
        const interaction = {
            type: window.INTERACTION_TYPES.RESIZE,
            timestamp: Date.now(),
            sessionId: this.currentSession?.id,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        
        this.recordInteraction(interaction);
    }
    
    finalizeSession() {
        if (this.currentSession) {
            this.currentSession.endTime = Date.now();
            this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
            this.currentSession.finalMetrics = this.getSessionMetrics();
            
            // Send final session data
            this.sendInteractionData();
        }
    }

    /**
     * Public methods for external control
     */
    
    isCurrentlyTracking() {
        return this.isTracking;
    }
    
    getCurrentSession() {
        return this.currentSession;
    }
    
    getInteractionCount() {
        return this.interactions.length;
    }
    
    clearInteractionData() {
        this.interactions = [];
        this.focusPath = [];
        this.scrollData = [];
        this.heatmapData = [];
    }
    
    getTrackingState() {
        return {
            isTracking: this.isTracking,
            session: this.currentSession,
            metrics: this.getSessionMetrics(),
            interactionCount: this.interactions.length,
            options: this.options
        };
    }
}

export default InteractionTracker;
