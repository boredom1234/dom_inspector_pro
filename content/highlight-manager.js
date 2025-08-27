/**
 * Highlight Manager - Element highlighting functionality for content scripts
 * Handles visual highlighting of DOM elements for analysis, interaction tracking, and user feedback
 */

import { MESSAGE_TYPES, DOM_ANALYZER_CONFIG, HIGHLIGHT_STYLES } from '../shared/constants.js';
import { DOMUtils } from '../shared/utils/dom-utils.js';
import { ValidationUtils } from '../shared/utils/validation-utils.js';

export class HighlightManager {
    constructor(options = {}) {
        this.options = {
            enableHoverHighlight: options.enableHoverHighlight !== false,
            enableClickHighlight: options.enableClickHighlight !== false,
            enableAnalysisHighlight: options.enableAnalysisHighlight !== false,
            highlightDuration: options.highlightDuration || 3000,
            fadeOutDuration: options.fadeOutDuration || 500,
            maxHighlights: options.maxHighlights || 50,
            zIndex: options.zIndex || 10000,
            showTooltips: options.showTooltips !== false,
            showElementInfo: options.showElementInfo !== false,
            ...options
        };
        
        this.highlights = new Map();
        this.overlays = new Map();
        this.tooltips = new Map();
        this.isActive = false;
        
        this.highlightCounter = 0;
        this.activeElements = new Set();
        this.eventListeners = new Map();
        
        this.styleSheet = null;
        this.containerElement = null;
        
        this.highlightQueue = [];
        this.processingQueue = false;
    }

    /**
     * Initialize highlight manager
     */
    async initialize() {
        try {
            this.createStyleSheet();
            this.createContainer();
            this.setupEventListeners();
            
            if (this.options.enableHoverHighlight) {
                this.enableHoverHighlighting();
            }
            
            if (this.options.enableClickHighlight) {
                this.enableClickHighlighting();
            }
            
            this.setupMessageListener();
            this.isActive = true;
            
            console.log('Highlight manager initialized');
            
        } catch (error) {
            console.error('Failed to initialize highlight manager:', error);
            throw error;
        }
    }

    /**
     * Shutdown highlight manager
     */
    async shutdown() {
        try {
            this.clearAllHighlights();
            this.removeEventListeners();
            this.removeMessageListener();
            this.cleanupResources();
            
            this.isActive = false;
            console.log('Highlight manager shutdown complete');
            
        } catch (error) {
            console.error('Error during highlight manager shutdown:', error);
        }
    }

    /**
     * Highlight a single element
     */
    highlightElement(element, options = {}) {
        try {
            if (!this.isValidElement(element)) {
                console.warn('Invalid element for highlighting:', element);
                return null;
            }
            
            const highlightId = this.generateHighlightId();
            const highlightOptions = {
                type: 'manual',
                style: 'default',
                duration: this.options.highlightDuration,
                showTooltip: this.options.showTooltips,
                showElementInfo: this.options.showElementInfo,
                color: '#ff6b6b',
                borderWidth: 2,
                borderStyle: 'solid',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                ...options
            };
            
            // Remove existing highlight if present
            if (this.activeElements.has(element)) {
                this.removeHighlight(element);
            }
            
            // Create highlight overlay
            const overlay = this.createHighlightOverlay(element, highlightOptions);
            if (!overlay) return null;
            
            // Create tooltip if enabled
            let tooltip = null;
            if (highlightOptions.showTooltip) {
                tooltip = this.createTooltip(element, highlightOptions);
            }
            
            // Store highlight data
            const highlight = {
                id: highlightId,
                element: element,
                overlay: overlay,
                tooltip: tooltip,
                options: highlightOptions,
                startTime: Date.now(),
                xpath: DOMUtils.generateXPath(element)
            };
            
            this.highlights.set(highlightId, highlight);
            this.overlays.set(element, overlay);
            this.activeElements.add(element);
            
            if (tooltip) {
                this.tooltips.set(element, tooltip);
            }
            
            // Auto-remove highlight after duration
            if (highlightOptions.duration > 0) {
                setTimeout(() => {
                    this.removeHighlight(highlightId);
                }, highlightOptions.duration);
            }
            
            return highlightId;
            
        } catch (error) {
            console.error('Error highlighting element:', error);
            return null;
        }
    }

    /**
     * Highlight multiple elements
     */
    highlightElements(elements, options = {}) {
        const highlightIds = [];
        
        elements.forEach((element, index) => {
            const elementOptions = {
                ...options,
                delay: index * (options.staggerDelay || 100)
            };
            
            if (elementOptions.delay > 0) {
                setTimeout(() => {
                    const id = this.highlightElement(element, elementOptions);
                    if (id) highlightIds.push(id);
                }, elementOptions.delay);
            } else {
                const id = this.highlightElement(element, elementOptions);
                if (id) highlightIds.push(id);
            }
        });
        
        return highlightIds;
    }

    /**
     * Remove highlight
     */
    removeHighlight(idOrElement) {
        try {
            let highlight;
            
            if (typeof idOrElement === 'string') {
                // Remove by ID
                highlight = this.highlights.get(idOrElement);
                if (highlight) {
                    this.highlights.delete(idOrElement);
                }
            } else {
                // Remove by element
                const element = idOrElement;
                highlight = Array.from(this.highlights.values())
                    .find(h => h.element === element);
                
                if (highlight) {
                    this.highlights.delete(highlight.id);
                }
            }
            
            if (highlight) {
                this.removeHighlightElements(highlight);
                this.activeElements.delete(highlight.element);
            }
            
        } catch (error) {
            console.error('Error removing highlight:', error);
        }
    }

    /**
     * Clear all highlights
     */
    clearAllHighlights() {
        try {
            this.highlights.forEach(highlight => {
                this.removeHighlightElements(highlight);
            });
            
            this.highlights.clear();
            this.overlays.clear();
            this.tooltips.clear();
            this.activeElements.clear();
            
            if (this.containerElement) {
                this.containerElement.innerHTML = '';
            }
            
        } catch (error) {
            console.error('Error clearing highlights:', error);
        }
    }

    /**
     * Highlight elements by selector
     */
    highlightBySelector(selector, options = {}) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) {
                console.warn('No elements found for selector:', selector);
                return [];
            }
            
            return this.highlightElements(Array.from(elements), {
                type: 'selector',
                selector: selector,
                ...options
            });
            
        } catch (error) {
            console.error('Error highlighting by selector:', error);
            return [];
        }
    }

    /**
     * Highlight elements by XPath
     */
    highlightByXPath(xpath, options = {}) {
        try {
            const elements = DOMUtils.getElementsByXPath(xpath);
            if (elements.length === 0) {
                console.warn('No elements found for XPath:', xpath);
                return [];
            }
            
            return this.highlightElements(elements, {
                type: 'xpath',
                xpath: xpath,
                ...options
            });
            
        } catch (error) {
            console.error('Error highlighting by XPath:', error);
            return [];
        }
    }

    /**
     * Flash highlight effect
     */
    flashHighlight(element, options = {}) {
        const flashOptions = {
            duration: 0, // No auto-removal
            color: options.color || '#ff9f43',
            backgroundColor: options.backgroundColor || 'rgba(255, 159, 67, 0.3)',
            ...options
        };
        
        const highlightId = this.highlightElement(element, flashOptions);
        
        if (highlightId) {
            // Flash effect
            const highlight = this.highlights.get(highlightId);
            if (highlight && highlight.overlay) {
                const overlay = highlight.overlay;
                
                // Flash animation
                overlay.style.animation = `flash 0.5s ease-in-out 3`;
                
                setTimeout(() => {
                    this.removeHighlight(highlightId);
                }, 1500);
            }
        }
        
        return highlightId;
    }

    /**
     * Pulse highlight effect
     */
    pulseHighlight(element, options = {}) {
        const pulseOptions = {
            duration: options.duration || 5000,
            color: options.color || '#6c5ce7',
            backgroundColor: options.backgroundColor || 'rgba(108, 92, 231, 0.2)',
            ...options
        };
        
        const highlightId = this.highlightElement(element, pulseOptions);
        
        if (highlightId) {
            const highlight = this.highlights.get(highlightId);
            if (highlight && highlight.overlay) {
                highlight.overlay.style.animation = `pulse 2s ease-in-out infinite`;
            }
        }
        
        return highlightId;
    }

    /**
     * Create highlight overlay
     */
    createHighlightOverlay(element, options) {
        try {
            if (!this.containerElement) return null;
            
            const rect = element.getBoundingClientRect();
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            const overlay = document.createElement('div');
            overlay.className = 'scira-highlight-overlay';
            overlay.style.cssText = `
                position: absolute;
                left: ${rect.left + scrollLeft}px;
                top: ${rect.top + scrollTop}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border: ${options.borderWidth}px ${options.borderStyle} ${options.color};
                background-color: ${options.backgroundColor};
                z-index: ${this.options.zIndex};
                pointer-events: none;
                box-sizing: border-box;
                border-radius: 2px;
                transition: opacity ${this.options.fadeOutDuration}ms ease-out;
            `;
            
            // Add corner indicators for better visibility
            if (options.showCorners !== false) {
                this.addCornerIndicators(overlay, options.color);
            }
            
            this.containerElement.appendChild(overlay);
            
            // Update position on scroll/resize
            const updatePosition = () => {
                const newRect = element.getBoundingClientRect();
                const newScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                const newScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                overlay.style.left = `${newRect.left + newScrollLeft}px`;
                overlay.style.top = `${newRect.top + newScrollTop}px`;
                overlay.style.width = `${newRect.width}px`;
                overlay.style.height = `${newRect.height}px`;
            };
            
            const scrollHandler = this.debounce(updatePosition, 16);
            window.addEventListener('scroll', scrollHandler, true);
            window.addEventListener('resize', scrollHandler);
            
            // Store cleanup function
            overlay._cleanup = () => {
                window.removeEventListener('scroll', scrollHandler, true);
                window.removeEventListener('resize', scrollHandler);
            };
            
            return overlay;
            
        } catch (error) {
            console.error('Error creating highlight overlay:', error);
            return null;
        }
    }

    /**
     * Create tooltip for highlighted element
     */
    createTooltip(element, options) {
        try {
            if (!this.containerElement || !options.showTooltip) return null;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'scira-highlight-tooltip';
            
            const elementInfo = this.getElementInfo(element);
            const content = this.formatTooltipContent(elementInfo, options);
            
            tooltip.innerHTML = content;
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                z-index: ${this.options.zIndex + 1};
                pointer-events: none;
                max-width: 300px;
                word-wrap: break-word;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transition: opacity 0.2s ease-in-out;
            `;
            
            this.positionTooltip(tooltip, element);
            this.containerElement.appendChild(tooltip);
            
            // Fade in
            setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 10);
            
            return tooltip;
            
        } catch (error) {
            console.error('Error creating tooltip:', error);
            return null;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle dynamic content changes
        this.resizeObserver = new ResizeObserver((entries) => {
            this.handleElementResize(entries);
        });
        
        // Monitor all highlighted elements
        this.activeElements.forEach(element => {
            this.resizeObserver.observe(element);
        });
    }

    /**
     * Enable hover highlighting
     */
    enableHoverHighlighting() {
        const hoverHandler = (event) => {
            if (event.target && !this.activeElements.has(event.target)) {
                this.flashHighlight(event.target, {
                    type: 'hover',
                    color: '#74b9ff',
                    backgroundColor: 'rgba(116, 185, 255, 0.1)',
                    showTooltip: true
                });
            }
        };
        
        this.addEventListener('mouseover', document, hoverHandler, true);
    }

    /**
     * Enable click highlighting
     */
    enableClickHighlighting() {
        const clickHandler = (event) => {
            if (event.target) {
                this.pulseHighlight(event.target, {
                    type: 'click',
                    color: '#00b894',
                    backgroundColor: 'rgba(0, 184, 148, 0.2)',
                    showTooltip: true,
                    duration: 3000
                });
            }
        };
        
        this.addEventListener('click', document, clickHandler, true);
    }

    /**
     * Handle message from popup/background
     */
    setupMessageListener() {
        const messageHandler = (message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        };
        
        chrome.runtime.onMessage.addListener(messageHandler);
        this.messageHandler = messageHandler;
    }

    /**
     * Handle runtime messages
     */
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case MESSAGE_TYPES.HIGHLIGHT_ELEMENT:
                    const highlightId = this.highlightElement(
                        message.element, 
                        message.options
                    );
                    sendResponse({ success: true, highlightId: highlightId });
                    break;
                    
                case MESSAGE_TYPES.HIGHLIGHT_ELEMENTS:
                    const highlightIds = this.highlightElements(
                        message.elements, 
                        message.options
                    );
                    sendResponse({ success: true, highlightIds: highlightIds });
                    break;
                    
                case MESSAGE_TYPES.HIGHLIGHT_BY_SELECTOR:
                    const selectorIds = this.highlightBySelector(
                        message.selector, 
                        message.options
                    );
                    sendResponse({ success: true, highlightIds: selectorIds });
                    break;
                    
                case MESSAGE_TYPES.HIGHLIGHT_BY_XPATH:
                    const xpathIds = this.highlightByXPath(
                        message.xpath, 
                        message.options
                    );
                    sendResponse({ success: true, highlightIds: xpathIds });
                    break;
                    
                case MESSAGE_TYPES.REMOVE_HIGHLIGHT:
                    this.removeHighlight(message.id || message.element);
                    sendResponse({ success: true });
                    break;
                    
                case MESSAGE_TYPES.CLEAR_HIGHLIGHTS:
                    this.clearAllHighlights();
                    sendResponse({ success: true });
                    break;
                    
                case MESSAGE_TYPES.GET_HIGHLIGHTS:
                    const highlights = Array.from(this.highlights.values()).map(h => ({
                        id: h.id,
                        xpath: h.xpath,
                        options: h.options,
                        startTime: h.startTime
                    }));
                    sendResponse({ success: true, highlights: highlights });
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
    
    createStyleSheet() {
        if (this.styleSheet) return;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes flash {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            @keyframes pulse {
                0% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.02); }
                100% { opacity: 0.5; transform: scale(1); }
            }
            
            .scira-highlight-overlay {
                transition: all 0.2s ease-in-out;
            }
            
            .scira-highlight-tooltip {
                line-height: 1.4;
            }
            
            .scira-corner-indicator {
                position: absolute;
                width: 8px;
                height: 8px;
                border: 2px solid;
                background: white;
                border-radius: 50%;
            }
        `;
        
        document.head.appendChild(style);
        this.styleSheet = style;
    }
    
    createContainer() {
        if (this.containerElement) return;
        
        this.containerElement = document.createElement('div');
        this.containerElement.id = 'scira-highlight-container';
        this.containerElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: ${this.options.zIndex - 1};
        `;
        
        document.body.appendChild(this.containerElement);
    }
    
    addCornerIndicators(overlay, color) {
        const positions = [
            { top: '-4px', left: '-4px' },
            { top: '-4px', right: '-4px' },
            { bottom: '-4px', left: '-4px' },
            { bottom: '-4px', right: '-4px' }
        ];
        
        positions.forEach(pos => {
            const corner = document.createElement('div');
            corner.className = 'scira-corner-indicator';
            corner.style.borderColor = color;
            
            Object.assign(corner.style, pos);
            overlay.appendChild(corner);
        });
    }
    
    positionTooltip(tooltip, element) {
        const rect = element.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + scrollLeft;
        let top = rect.top + scrollTop - tooltipRect.height - 10;
        
        // Adjust for viewport boundaries
        if (top < scrollTop + 10) {
            top = rect.bottom + scrollTop + 10;
        }
        
        if (left + tooltipRect.width > window.innerWidth + scrollLeft) {
            left = window.innerWidth + scrollLeft - tooltipRect.width - 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    
    getElementInfo(element) {
        return {
            tagName: element.tagName?.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            textContent: element.textContent ? element.textContent.substring(0, 50) + '...' : null,
            attributes: this.getElementAttributes(element),
            xpath: DOMUtils.generateXPath(element),
            visible: DOMUtils.isElementVisible(element),
            interactive: DOMUtils.isInteractiveElement(element)
        };
    }
    
    getElementAttributes(element) {
        const attrs = {};
        for (const attr of element.attributes) {
            if (attr.name !== 'class' && attr.name !== 'id') {
                attrs[attr.name] = attr.value.substring(0, 30);
            }
        }
        return attrs;
    }
    
    formatTooltipContent(elementInfo, options) {
        let content = `<div style="font-weight: bold; margin-bottom: 4px;">${elementInfo.tagName}</div>`;
        
        if (elementInfo.id) {
            content += `<div>ID: ${elementInfo.id}</div>`;
        }
        
        if (elementInfo.className) {
            content += `<div>Class: ${elementInfo.className}</div>`;
        }
        
        if (options.showElementInfo && elementInfo.textContent) {
            content += `<div style="margin-top: 4px; font-style: italic;">Text: ${elementInfo.textContent}</div>`;
        }
        
        if (options.showXPath) {
            content += `<div style="margin-top: 4px; font-size: 10px; opacity: 0.8;">XPath: ${elementInfo.xpath}</div>`;
        }
        
        return content;
    }
    
    removeHighlightElements(highlight) {
        if (highlight.overlay) {
            if (highlight.overlay._cleanup) {
                highlight.overlay._cleanup();
            }
            highlight.overlay.remove();
        }
        
        if (highlight.tooltip) {
            highlight.tooltip.remove();
        }
        
        this.overlays.delete(highlight.element);
        this.tooltips.delete(highlight.element);
    }
    
    handleElementResize(entries) {
        entries.forEach(entry => {
            const element = entry.target;
            const overlay = this.overlays.get(element);
            
            if (overlay) {
                const rect = element.getBoundingClientRect();
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                overlay.style.left = `${rect.left + scrollLeft}px`;
                overlay.style.top = `${rect.top + scrollTop}px`;
                overlay.style.width = `${rect.width}px`;
                overlay.style.height = `${rect.height}px`;
            }
        });
    }
    
    addEventListener(event, element, handler, capture = false) {
        element.addEventListener(event, handler, capture);
        
        const key = `${event}:${element === document ? 'document' : element === window ? 'window' : 'element'}`;
        this.eventListeners.set(key, { element, event, handler, capture });
    }
    
    removeEventListeners() {
        this.eventListeners.forEach(({ element, event, handler, capture }) => {
            element.removeEventListener(event, handler, capture);
        });
        this.eventListeners.clear();
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
    
    removeMessageListener() {
        if (this.messageHandler) {
            chrome.runtime.onMessage.removeListener(this.messageHandler);
            this.messageHandler = null;
        }
    }
    
    cleanupResources() {
        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
        
        if (this.styleSheet) {
            this.styleSheet.remove();
            this.styleSheet = null;
        }
    }
    
    isValidElement(element) {
        return element && 
               element.nodeType === Node.ELEMENT_NODE && 
               document.body.contains(element);
    }
    
    generateHighlightId() {
        return `highlight_${Date.now()}_${++this.highlightCounter}`;
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    getHighlightById(id) {
        return this.highlights.get(id);
    }
    
    getHighlightByElement(element) {
        return Array.from(this.highlights.values())
            .find(h => h.element === element);
    }
    
    getHighlightStats() {
        return {
            totalHighlights: this.highlights.size,
            activeElements: this.activeElements.size,
            isActive: this.isActive,
            options: this.options
        };
    }
}

export default HighlightManager;
