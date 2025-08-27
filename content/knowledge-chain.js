/**
 * Knowledge Chain - Knowledge chain integration for content scripts
 * Manages knowledge chain data collection, session tracking, and integration with DOM analysis
 */

import { MESSAGE_TYPES, KNOWLEDGE_CHAIN_EVENTS, STORAGE_KEYS } from '../shared/constants.js';
import { DOMUtils } from '../shared/utils/dom-utils.js';
import { ValidationUtils } from '../shared/utils/validation-utils.js';

export class KnowledgeChain {
    constructor(options = {}) {
        this.options = {
            enableAutoTracking: options.enableAutoTracking !== false,
            trackDOMChanges: options.trackDOMChanges !== false,
            trackUserActions: options.trackUserActions !== false,
            trackFormSubmissions: options.trackFormSubmissions !== false,
            trackNavigation: options.trackNavigation !== false,
            debounceDelay: options.debounceDelay || 500,
            maxChainLength: options.maxChainLength || 100,
            sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes
            ...options
        };
        
        this.knowledgeChain = [];
        this.currentSession = null;
        this.domObserver = null;
        this.isActive = false;
        this.lastActivity = Date.now();
        
        this.pendingUpdates = new Map();
        this.debounceTimers = new Map();
        this.sessionTimer = null;
        
        this.eventListeners = new Map();
        this.knowledgeMetrics = {
            totalEvents: 0,
            domChanges: 0,
            userActions: 0,
            formSubmissions: 0,
            navigationEvents: 0,
            sessionDuration: 0
        };
    }

    /**
     * Initialize knowledge chain tracking
     */
    async initialize() {
        try {
            await this.loadExistingChain();
            this.startNewSession();
            
            if (this.options.enableAutoTracking) {
                this.startAutoTracking();
            }
            
            this.setupMessageListener();
            this.startSessionTimer();
            
            this.isActive = true;
            console.log('Knowledge chain initialized');
            
        } catch (error) {
            console.error('Failed to initialize knowledge chain:', error);
            throw error;
        }
    }

    /**
     * Shutdown knowledge chain tracking
     */
    async shutdown() {
        try {
            this.stopAutoTracking();
            this.stopSessionTimer();
            this.removeMessageListener();
            
            if (this.currentSession) {
                await this.finalizeCurrentSession();
            }
            
            await this.saveKnowledgeChain();
            this.isActive = false;
            
            console.log('Knowledge chain shutdown complete');
            
        } catch (error) {
            console.error('Error during knowledge chain shutdown:', error);
        }
    }

    /**
     * Start new knowledge tracking session
     */
    startNewSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            events: [],
            domSnapshot: this.captureDOMSnapshot(),
            metadata: {
                tabId: null, // Will be set by background script
                chatId: null, // Will be set when detected
                knowledgeChainId: this.generateKnowledgeChainId()
            }
        };
        
        this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.SESSION_START, {
            sessionId: this.currentSession.id,
            url: this.currentSession.url,
            title: this.currentSession.title
        });
        
        this.lastActivity = Date.now();
    }

    /**
     * Record a knowledge chain event
     */
    recordKnowledgeEvent(eventType, data = {}, options = {}) {
        try {
            const event = {
                id: this.generateEventId(),
                type: eventType,
                timestamp: Date.now(),
                sessionId: this.currentSession?.id,
                url: window.location.href,
                data: { ...data },
                metadata: {
                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    ...options.metadata
                }
            };
            
            // Validate event data
            if (!ValidationUtils.validateKnowledgeEvent(event)) {
                console.warn('Invalid knowledge event, skipping:', event);
                return false;
            }
            
            // Add to current session
            if (this.currentSession) {
                this.currentSession.events.push(event);
            }
            
            // Add to main knowledge chain
            this.knowledgeChain.push(event);
            
            // Maintain chain size
            if (this.knowledgeChain.length > this.options.maxChainLength) {
                this.knowledgeChain = this.knowledgeChain.slice(-Math.floor(this.options.maxChainLength * 0.8));
            }
            
            // Update metrics
            this.updateKnowledgeMetrics(eventType);
            
            // Update last activity
            this.lastActivity = Date.now();
            
            // Send to background script if needed
            this.debounceUpdate('knowledgeEvent', () => {
                this.sendKnowledgeUpdate(event);
            });
            
            return true;
            
        } catch (error) {
            console.error('Error recording knowledge event:', error);
            return false;
        }
    }

    /**
     * Start automatic tracking of various events
     */
    startAutoTracking() {
        if (this.options.trackDOMChanges) {
            this.startDOMObserver();
        }
        
        if (this.options.trackUserActions) {
            this.startUserActionTracking();
        }
        
        if (this.options.trackFormSubmissions) {
            this.startFormTracking();
        }
        
        if (this.options.trackNavigation) {
            this.startNavigationTracking();
        }
    }

    /**
     * Stop automatic tracking
     */
    stopAutoTracking() {
        this.stopDOMObserver();
        this.stopUserActionTracking();
        this.stopFormTracking();
        this.stopNavigationTracking();
        
        // Clear debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }

    /**
     * Start DOM mutation observer
     */
    startDOMObserver() {
        if (this.domObserver) return;
        
        this.domObserver = new MutationObserver((mutations) => {
            const significantMutations = mutations.filter(mutation => 
                this.isSignificantMutation(mutation)
            );
            
            if (significantMutations.length > 0) {
                this.debounceUpdate('domChanges', () => {
                    this.processDOMChanges(significantMutations);
                });
            }
        });
        
        this.domObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'style', 'data-*'],
            characterData: true
        });
    }

    /**
     * Stop DOM observer
     */
    stopDOMObserver() {
        if (this.domObserver) {
            this.domObserver.disconnect();
            this.domObserver = null;
        }
    }

    /**
     * Start user action tracking
     */
    startUserActionTracking() {
        const actionHandler = (event) => {
            this.handleUserAction(event);
        };
        
        // Track clicks
        this.addEventListener('click', document, actionHandler, true);
        
        // Track focus changes
        this.addEventListener('focusin', document, actionHandler, true);
        this.addEventListener('focusout', document, actionHandler, true);
        
        // Track scroll
        this.addEventListener('scroll', window, this.debounce('scroll', actionHandler, 200), true);
        
        // Track key interactions
        this.addEventListener('keydown', document, actionHandler, true);
    }

    /**
     * Start form tracking
     */
    startFormTracking() {
        const formHandler = (event) => {
            this.handleFormEvent(event);
        };
        
        this.addEventListener('submit', document, formHandler, true);
        this.addEventListener('input', document, formHandler, true);
        this.addEventListener('change', document, formHandler, true);
    }

    /**
     * Start navigation tracking
     */
    startNavigationTracking() {
        // Track page visibility changes
        this.addEventListener('visibilitychange', document, () => {
            this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.VISIBILITY_CHANGE, {
                hidden: document.hidden,
                visibilityState: document.visibilityState
            });
        });
        
        // Track beforeunload
        this.addEventListener('beforeunload', window, () => {
            this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.PAGE_UNLOAD, {
                url: window.location.href,
                sessionDuration: Date.now() - (this.currentSession?.startTime || Date.now())
            });
        });
        
        // Track hashchange
        this.addEventListener('hashchange', window, () => {
            this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.NAVIGATION, {
                type: 'hashchange',
                oldURL: event.oldURL,
                newURL: event.newURL
            });
        });
    }

    /**
     * Process DOM changes
     */
    processDOMChanges(mutations) {
        const changeData = {
            mutationCount: mutations.length,
            addedNodes: 0,
            removedNodes: 0,
            modifiedAttributes: 0,
            textChanges: 0,
            significantChanges: []
        };
        
        mutations.forEach(mutation => {
            switch (mutation.type) {
                case 'childList':
                    changeData.addedNodes += mutation.addedNodes.length;
                    changeData.removedNodes += mutation.removedNodes.length;
                    
                    // Track significant element additions
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && this.isSignificantElement(node)) {
                            changeData.significantChanges.push({
                                type: 'elementAdded',
                                element: this.describeElement(node)
                            });
                        }
                    });
                    break;
                    
                case 'attributes':
                    changeData.modifiedAttributes++;
                    
                    if (this.isSignificantAttribute(mutation.attributeName)) {
                        changeData.significantChanges.push({
                            type: 'attributeChanged',
                            element: this.describeElement(mutation.target),
                            attribute: mutation.attributeName,
                            oldValue: mutation.oldValue,
                            newValue: mutation.target.getAttribute(mutation.attributeName)
                        });
                    }
                    break;
                    
                case 'characterData':
                    changeData.textChanges++;
                    break;
            }
        });
        
        this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.DOM_CHANGE, changeData);
        this.knowledgeMetrics.domChanges++;
    }

    /**
     * Handle user actions
     */
    handleUserAction(event) {
        const actionData = {
            type: event.type,
            timestamp: Date.now(),
            element: event.target ? this.describeElement(event.target) : null,
            coordinates: {
                clientX: event.clientX,
                clientY: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY
            }
        };
        
        // Add event-specific data
        switch (event.type) {
            case 'click':
                actionData.button = event.button;
                actionData.detail = event.detail;
                actionData.modifiers = this.getModifierKeys(event);
                break;
                
            case 'keydown':
                actionData.key = event.key;
                actionData.code = event.code;
                actionData.modifiers = this.getModifierKeys(event);
                break;
                
            case 'scroll':
                actionData.scrollPosition = {
                    x: window.pageXOffset,
                    y: window.pageYOffset
                };
                actionData.scrollPercentage = this.calculateScrollPercentage();
                break;
                
            case 'focusin':
            case 'focusout':
                actionData.focusable = DOMUtils.isInteractiveElement(event.target);
                break;
        }
        
        this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.USER_ACTION, actionData);
        this.knowledgeMetrics.userActions++;
    }

    /**
     * Handle form events
     */
    handleFormEvent(event) {
        const formData = {
            type: event.type,
            form: event.target.form ? this.describeElement(event.target.form) : null,
            element: this.describeElement(event.target),
            inputType: event.target.type,
            hasValue: !!event.target.value,
            valueLength: event.target.value ? event.target.value.length : 0
        };
        
        if (event.type === 'submit') {
            formData.formMethod = event.target.method;
            formData.formAction = event.target.action;
            formData.elementCount = event.target.elements.length;
            this.knowledgeMetrics.formSubmissions++;
        }
        
        this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.FORM_INTERACTION, formData);
    }

    /**
     * Capture DOM snapshot for session
     */
    captureDOMSnapshot() {
        try {
            return {
                title: document.title,
                headings: this.extractHeadings(),
                forms: this.extractForms(),
                interactiveElements: this.extractInteractiveElements(),
                mainContent: this.extractMainContent(),
                metadata: {
                    elementCount: document.querySelectorAll('*').length,
                    hasScripts: document.querySelectorAll('script').length > 0,
                    hasStylesheets: document.querySelectorAll('link[rel="stylesheet"]').length > 0,
                    hasImages: document.querySelectorAll('img').length > 0
                }
            };
        } catch (error) {
            console.warn('Error capturing DOM snapshot:', error);
            return { error: error.message };
        }
    }

    /**
     * Send knowledge update to background script
     */
    async sendKnowledgeUpdate(event) {
        try {
            const updateData = {
                event: event,
                session: this.currentSession,
                metrics: this.knowledgeMetrics,
                chainLength: this.knowledgeChain.length
            };
            
            await chrome.runtime.sendMessage({
                action: MESSAGE_TYPES.KNOWLEDGE_CHAIN_UPDATE,
                data: updateData
            });
            
        } catch (error) {
            console.warn('Failed to send knowledge update:', error);
        }
    }

    /**
     * Handle messages from popup/background
     */
    setupMessageListener() {
        const messageHandler = (message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        };
        
        chrome.runtime.onMessage.addListener(messageHandler);
        this.messageHandler = messageHandler;
    }

    /**
     * Remove message listener
     */
    removeMessageListener() {
        if (this.messageHandler) {
            chrome.runtime.onMessage.removeListener(this.messageHandler);
            this.messageHandler = null;
        }
    }

    /**
     * Handle runtime messages
     */
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case MESSAGE_TYPES.GET_KNOWLEDGE_CHAIN:
                    sendResponse({
                        success: true,
                        data: {
                            chain: this.knowledgeChain,
                            session: this.currentSession,
                            metrics: this.knowledgeMetrics,
                            isActive: this.isActive
                        }
                    });
                    break;
                    
                case MESSAGE_TYPES.SET_CHAT_ID:
                    if (this.currentSession) {
                        this.currentSession.metadata.chatId = message.chatId;
                        this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.CHAT_ID_SET, {
                            chatId: message.chatId
                        });
                    }
                    sendResponse({ success: true });
                    break;
                    
                case MESSAGE_TYPES.RECORD_KNOWLEDGE_EVENT:
                    const recorded = this.recordKnowledgeEvent(
                        message.eventType, 
                        message.data, 
                        message.options
                    );
                    sendResponse({ success: recorded });
                    break;
                    
                case MESSAGE_TYPES.EXPORT_KNOWLEDGE_CHAIN:
                    const exportData = await this.exportKnowledgeChain();
                    sendResponse({ success: true, data: exportData });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Utility methods
     */
    
    addEventListener(event, element, handler, capture = false) {
        element.addEventListener(event, handler, capture);
        
        const key = `${event}:${element === document ? 'document' : element === window ? 'window' : 'element'}`;
        this.eventListeners.set(key, { element, event, handler, capture });
    }
    
    stopUserActionTracking() {
        this.eventListeners.forEach(({ element, event, handler, capture }) => {
            element.removeEventListener(event, handler, capture);
        });
        this.eventListeners.clear();
    }
    
    stopFormTracking() {
        // Handled by stopUserActionTracking
    }
    
    stopNavigationTracking() {
        // Handled by stopUserActionTracking  
    }
    
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
    
    debounceUpdate(key, func) {
        this.debounce(key, func, this.options.debounceDelay)();
    }
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    generateKnowledgeChainId() {
        return `chain_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    isSignificantMutation(mutation) {
        // Filter out trivial mutations
        if (mutation.type === 'attributes') {
            const trivialAttributes = ['style', 'data-reactid', 'data-react-checksum'];
            return !trivialAttributes.includes(mutation.attributeName);
        }
        
        if (mutation.type === 'childList') {
            return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
        }
        
        if (mutation.type === 'characterData') {
            const text = mutation.target.textContent || '';
            return text.trim().length > 0 && text.length > 5;
        }
        
        return true;
    }
    
    isSignificantElement(element) {
        const significantTags = ['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'form', 'button', 'input', 'textarea', 'select'];
        return significantTags.includes(element.tagName?.toLowerCase());
    }
    
    isSignificantAttribute(attributeName) {
        const significantAttributes = ['class', 'id', 'role', 'aria-*', 'data-*'];
        return significantAttributes.some(attr => 
            attr.endsWith('*') ? attributeName.startsWith(attr.slice(0, -1)) : attr === attributeName
        );
    }
    
    describeElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
        
        return {
            tagName: element.tagName?.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            xpath: DOMUtils.generateXPath(element),
            textContent: element.textContent ? element.textContent.substring(0, 50) : null
        };
    }
    
    getModifierKeys(event) {
        return {
            alt: event.altKey,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            meta: event.metaKey
        };
    }
    
    calculateScrollPercentage() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const documentHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        const windowHeight = window.innerHeight;
        
        return Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
    }
    
    extractHeadings() {
        const headings = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            headings.push({
                level: parseInt(heading.tagName.charAt(1)),
                text: heading.textContent?.trim().substring(0, 100),
                id: heading.id || null
            });
        });
        return headings;
    }
    
    extractForms() {
        const forms = [];
        document.querySelectorAll('form').forEach(form => {
            forms.push({
                action: form.action,
                method: form.method,
                elementCount: form.elements.length,
                id: form.id || null
            });
        });
        return forms;
    }
    
    extractInteractiveElements() {
        const interactive = [];
        const selector = 'button, input, select, textarea, a[href], [role="button"], [tabindex]';
        
        document.querySelectorAll(selector).forEach(element => {
            if (DOMUtils.isElementVisible(element)) {
                interactive.push(this.describeElement(element));
            }
        });
        
        return interactive.slice(0, 20); // Limit for performance
    }
    
    extractMainContent() {
        const mainSelectors = ['main', '[role="main"]', '.main', '#main', '.content', '#content'];
        
        for (const selector of mainSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return {
                    selector: selector,
                    textLength: element.textContent ? element.textContent.length : 0,
                    elementCount: element.querySelectorAll('*').length
                };
            }
        }
        
        return null;
    }
    
    updateKnowledgeMetrics(eventType) {
        this.knowledgeMetrics.totalEvents++;
        
        switch (eventType) {
            case KNOWLEDGE_CHAIN_EVENTS.DOM_CHANGE:
                this.knowledgeMetrics.domChanges++;
                break;
            case KNOWLEDGE_CHAIN_EVENTS.USER_ACTION:
                this.knowledgeMetrics.userActions++;
                break;
            case KNOWLEDGE_CHAIN_EVENTS.FORM_INTERACTION:
                if (eventType === 'submit') {
                    this.knowledgeMetrics.formSubmissions++;
                }
                break;
            case KNOWLEDGE_CHAIN_EVENTS.NAVIGATION:
                this.knowledgeMetrics.navigationEvents++;
                break;
        }
        
        if (this.currentSession) {
            this.knowledgeMetrics.sessionDuration = Date.now() - this.currentSession.startTime;
        }
    }
    
    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivity;
            
            if (timeSinceActivity > this.options.sessionTimeout) {
                this.handleSessionTimeout();
            }
        }, 60000); // Check every minute
    }
    
    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    async handleSessionTimeout() {
        this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.SESSION_TIMEOUT, {
            sessionDuration: Date.now() - (this.currentSession?.startTime || Date.now()),
            inactivityDuration: Date.now() - this.lastActivity
        });
        
        await this.finalizeCurrentSession();
        this.startNewSession();
    }
    
    async finalizeCurrentSession() {
        if (!this.currentSession) return;
        
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
        this.currentSession.finalMetrics = { ...this.knowledgeMetrics };
        
        this.recordKnowledgeEvent(KNOWLEDGE_CHAIN_EVENTS.SESSION_END, {
            sessionId: this.currentSession.id,
            duration: this.currentSession.duration,
            eventCount: this.currentSession.events.length
        });
    }
    
    async loadExistingChain() {
        // Load from storage if available
        try {
            const stored = await chrome.storage.local.get([STORAGE_KEYS.KNOWLEDGE_CHAIN]);
            if (stored[STORAGE_KEYS.KNOWLEDGE_CHAIN]) {
                this.knowledgeChain = stored[STORAGE_KEYS.KNOWLEDGE_CHAIN];
            }
        } catch (error) {
            console.warn('Could not load existing knowledge chain:', error);
        }
    }
    
    async saveKnowledgeChain() {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEYS.KNOWLEDGE_CHAIN]: this.knowledgeChain
            });
        } catch (error) {
            console.warn('Could not save knowledge chain:', error);
        }
    }
    
    async exportKnowledgeChain() {
        return {
            chain: this.knowledgeChain,
            sessions: this.currentSession ? [this.currentSession] : [],
            metrics: this.knowledgeMetrics,
            exportTimestamp: new Date().toISOString(),
            version: '2.0'
        };
    }
    
    getKnowledgeState() {
        return {
            isActive: this.isActive,
            chainLength: this.knowledgeChain.length,
            currentSession: this.currentSession,
            metrics: this.knowledgeMetrics,
            lastActivity: this.lastActivity
        };
    }
}

export default KnowledgeChain;
