// Enhanced Content script with advanced DOM analysis capabilities
// This script runs on all web pages and provides comprehensive DOM extraction
// Enhanced with automatic interaction tracking for knowledge chain building

console.log('XPath & Selector Extractor with Advanced Analysis loaded');

// Knowledge chain tracking variables
let interactionSequence = 0;
let lastDomCapture = 0;
const CAPTURE_DEBOUNCE = 1000; // Wait 1 second between captures to avoid spam

// Load the DOM Analyzer
let domAnalyzerLoaded = false;
if (typeof DOMAnalyzer === 'undefined') {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('dom-analyzer.js');
  script.onload = () => {
    domAnalyzerLoaded = true;
    console.log('DOMAnalyzer loaded successfully');
  };
  script.onerror = (error) => {
    console.error('Failed to load DOMAnalyzer:', error);
  };
  document.head.appendChild(script);
} else {
  domAnalyzerLoaded = true;
}

// Optional: Add visual indicators when hovering over elements
let isHighlightMode = false;
let highlightedElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle ping to check if content script is loaded
    if (request.action === 'ping') {
        sendResponse({ success: true, loaded: true });
        return true;
    }
    
    // Handle chat ID request from popup
    if (request.action === 'getCurrentChatId') {
        (async () => {
            const chatId = await getCurrentChatId();
            sendResponse({ success: true, chatId });
        })();
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'toggleHighlight') {
        toggleHighlightMode();
        sendResponse({ success: true });
        return true;
    } 
    
    if (request.action === 'getElementInfo') {
        const element = document.elementFromPoint(request.x, request.y);
        if (element) {
            sendResponse({
                tagName: element.tagName.toLowerCase(),
                xpath: getXPath(element),
                cssSelector: getCSSSelector(element)
            });
        }
        return true;
    } 
    
    if (request.action === 'analyzeDOM') {
        // Use async handling for DOM analysis
        (async () => {
            try {
                // Wait for DOMAnalyzer to be available
                if (typeof DOMAnalyzer === 'undefined') {
                    // Load it dynamically if not available
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = chrome.runtime.getURL('dom-analyzer.js');
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
                
                const analyzer = new DOMAnalyzer(request.config || {});
                const results = await analyzer.analyzeDOM(request.options || {});
                sendResponse({ success: true, data: results });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'continuousAnalysis') {
        startContinuousAnalysis(request.config);
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'stopContinuousAnalysis') {
        stopContinuousAnalysis();
        sendResponse({ success: true });
        return true;
    }
});

function toggleHighlightMode() {
    isHighlightMode = !isHighlightMode;
    
    if (isHighlightMode) {
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.body.style.cursor = 'crosshair';
    } else {
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        document.body.style.cursor = 'default';
        removeHighlight();
    }
}

function handleMouseOver(event) {
    if (!isHighlightMode) return;
    
    removeHighlight();
    highlightedElement = event.target;
    
    // Add highlight styling
    highlightedElement.style.outline = '2px solid #2563eb';
    highlightedElement.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
}

function handleMouseOut(event) {
    if (!isHighlightMode) return;
    removeHighlight();
}

function removeHighlight() {
    if (highlightedElement) {
        highlightedElement.style.outline = '';
        highlightedElement.style.backgroundColor = '';
        highlightedElement = null;
    }
}

// Utility functions (same as in popup.js)
function getXPath(element) {
    if (element === document.body) return '/html/body';
    
    let path = [];
    for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
        let index = 0;
        let hasFollowingSiblings = false;
        for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
            if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
            if (sibling.nodeName === element.nodeName) ++index;
        }
        for (let sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
            if (sibling.nodeName === element.nodeName) hasFollowingSiblings = true;
        }
        
        const tagName = element.nodeName.toLowerCase();
        const pathIndex = (index || hasFollowingSiblings) ? `[${index + 1}]` : '';
        path.unshift(`${tagName}${pathIndex}`);
    }
    
    return path.length ? `/${path.join('/')}` : null;
}

// Continuous analysis variables
let continuousAnalysisInterval = null;
let domAnalyzer = null;

// Start continuous DOM analysis
function startContinuousAnalysis(config = {}) {
    // Skip continuous analysis on chat tool pages
    if (window.location.href.includes('localhost:3000') || window.location.href.includes('127.0.0.1:3000')) {
        console.log('Skipping continuous analysis - on chat tool page');
        return;
    }
    
    if (continuousAnalysisInterval) {
        clearInterval(continuousAnalysisInterval);
    }
    
    domAnalyzer = new DOMAnalyzer(config);
    
    continuousAnalysisInterval = setInterval(async () => {
        try {
            const results = await domAnalyzer.analyzeDOM();
            
            // Send updates to popup if significant changes detected
            if (results.domDiff && results.domDiff.summary.added + results.domDiff.summary.removed + results.domDiff.summary.modified > 0) {
                chrome.runtime.sendMessage({
                    action: 'domChanged',
                    data: {
                        timestamp: results.timestamp,
                        changes: results.domDiff.summary,
                        significantChanges: results.domDiff.significantChanges?.length || 0
                    }
                });
                
                // DO NOT automatically send to API during continuous analysis
                // Only send when user explicitly clicks "Send to Tool"
                console.log('DOM changes detected but not auto-sending to prevent spam');
            }
        } catch (error) {
            console.error('Continuous analysis error:', error);
        }
    }, config.analysisInterval || 5000);
}

// Stop continuous analysis
function stopContinuousAnalysis() {
    if (continuousAnalysisInterval) {
        clearInterval(continuousAnalysisInterval);
        continuousAnalysisInterval = null;
    }
    domAnalyzer = null;
}

// ================================
// KNOWLEDGE CHAIN INTEGRATION
// ================================

// Function to send DOM data to knowledge chain
async function sendDomToKnowledgeChain(interactionType, description, target = null) {
    const now = Date.now();
    if (now - lastDomCapture < CAPTURE_DEBOUNCE) return;
    
    // Skip if we're on the chat tool itself (localhost:3000)
    if (window.location.href.includes('localhost:3000') || window.location.href.includes('127.0.0.1:3000')) {
        console.log('Skipping DOM capture - on chat tool page, not test target');
        return;
    }
    
    lastDomCapture = now;
    interactionSequence++;
    
    try {
        // Get current chat ID from multiple sources with fallback strategy
        let chatId = await getCurrentChatId();
        
        // Don't send if we still can't determine the chat ID
        if (!chatId || chatId === 'unknown') {
            console.log('Skipping DOM capture - no valid chat ID found. Please ensure you started DOM capture from the chat interface.');
            return;
        }
        
        // Capture current DOM state
        if (typeof DOMAnalyzer === 'undefined') return;
        
        const analyzer = new DOMAnalyzer({});
        const domData = await analyzer.analyzeDOM({});
        
        // Prepare payload for knowledge chain
        const payload = {
            chatId: chatId,
            interactionType: interactionType,
            description: description,
            sequence: interactionSequence,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
            target: target,
            // Include the DOM data
            ...domData
        };
        
        // Send to our knowledge chain API
        const response = await fetch('http://localhost:3000/api/extension-dom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ DOM state sent to knowledge chain:', {
                type: interactionType,
                sequence: interactionSequence,
                stateCount: result.knowledgeChain?.stateCount || 0
            });
        } else {
            console.warn('Failed to send DOM to knowledge chain:', response.status);
        }
    } catch (error) {
        console.error('Error sending DOM to knowledge chain:', error);
    }
}

// Initialize page load tracking
window.addEventListener('load', () => {
    sendDomToKnowledgeChain('page_load', `Page loaded: ${document.title}`, {
        url: window.location.href,
        title: document.title
    });
});

// Track form interactions
document.addEventListener('input', (event) => {
    if (event.target.matches('input, textarea, select')) {
        const element = event.target;
        const value = element.value;
        const name = element.name || element.id || 'unnamed';
        const type = element.type || element.tagName.toLowerCase();
        
        sendDomToKnowledgeChain('user_input', `Input in ${name} (${type}): "${value}"`, {
            selector: getCSSSelector(element),
            xpath: getXPath(element),
            text: `${name} field`,
            value: value
        });
    }
});

// Track form submissions
document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.tagName === 'FORM') {
        const formData = new FormData(form);
        const fields = Array.from(formData.entries()).map(([name, value]) => 
            `${name}: "${value}"`
        ).join(', ');
        
        sendDomToKnowledgeChain('form_submit', `Form submitted with: ${fields}`, {
            selector: getCSSSelector(form),
            xpath: getXPath(form),
            text: 'Form submission'
        });
    }
});

// Track button clicks
document.addEventListener('click', (event) => {
    const element = event.target;
    if (element.matches('button, input[type="button"], input[type="submit"], a[href]')) {
        const text = element.textContent || element.value || element.title || 'button';
        const action = element.tagName === 'A' ? 'navigation' : 'click';
        
        sendDomToKnowledgeChain(action, `Clicked: ${text}`, {
            selector: getCSSSelector(element),
            xpath: getXPath(element),
            text: text
        });
    }
});

// Track navigation events
window.addEventListener('beforeunload', () => {
    sendDomToKnowledgeChain('navigation', `Leaving page: ${document.title}`, {
        url: window.location.href,
        title: document.title
    });
});

// Track significant DOM changes
const domObserver = new MutationObserver((mutations) => {
    let hasSignificantChanges = false;
    const changes = [];
    
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        hasSignificantChanges = true;
                        changes.push(`Added: ${node.tagName}`);
                    }
                });
            }
            if (mutation.removedNodes.length > 0) {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        hasSignificantChanges = true;
                        changes.push(`Removed: ${node.tagName}`);
                    }
                });
            }
        } else if (mutation.type === 'attributes') {
            const element = mutation.target;
            if (element.matches('input, textarea, select, button') || 
                mutation.attributeName === 'class' || 
                mutation.attributeName === 'style') {
                hasSignificantChanges = true;
                changes.push(`${element.tagName} ${mutation.attributeName} changed`);
            }
        }
    });
    
    if (hasSignificantChanges) {
        sendDomToKnowledgeChain('dom_change', `DOM modified: ${changes.slice(0, 3).join(', ')}`);
    }
});

// Start observing DOM changes
domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'value', 'disabled', 'checked']
});

function getCSSSelector(element) {
    if (element.id) {
        return `#${CSS.escape(element.id)}`;
    }
    
    let path = [];
    while (element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();
        
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/);
            if (classes.length > 0 && classes[0]) {
                selector += '.' + classes.map(c => CSS.escape(c)).join('.');
            }
        }
        
        let sibling = element;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
            if (sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()) nth++;
        }
        
        if (nth > 1) {
            selector += `:nth-of-type(${nth})`;
        }
        
        path.unshift(selector);
        element = element.parentNode;
    }
    
    return path.join(' > ');
}

// ================================
// CHAT SESSION BRIDGE
// ================================

// Get current chat ID with multiple fallback strategies
async function getCurrentChatId() {
    // Strategy 1: Check if set by chat tool
    if (window.__CURRENT_CHAT_ID__) {
        return window.__CURRENT_CHAT_ID__;
    }
    
    // Strategy 2: Check localStorage for active chat session
    try {
        const storedChatId = localStorage.getItem('scira_active_chat_id');
        if (storedChatId && storedChatId !== 'null') {
            return storedChatId;
        }
    } catch (e) {
        console.warn('Could not access localStorage:', e);
    }
    
    // Strategy 3: Try to get from sessionStorage
    try {
        const sessionChatId = sessionStorage.getItem('scira_active_chat_id');
        if (sessionChatId && sessionChatId !== 'null') {
            return sessionChatId;
        }
    } catch (e) {
        console.warn('Could not access sessionStorage:', e);
    }
    
    // Strategy 4: Check if we're on a chat URL and extract ID
    const urlMatch = window.location.href.match(/\/chat\/([^\/\?#]+)/);
    if (urlMatch) {
        return urlMatch[1];
    }
    
    // Strategy 5: Try to communicate with chat tool window
    try {
        const chatId = await requestChatIdFromTool();
        if (chatId) {
            return chatId;
        }
    } catch (e) {
        console.warn('Could not communicate with chat tool:', e);
    }
    
    return null;
}

// Request chat ID from the chat tool window
function requestChatIdFromTool() {
    return new Promise((resolve) => {
        // Try to find chat tool window
        const chatToolOrigin = 'http://localhost:3000';
        
        // Send message to all windows
        const messageHandler = (event) => {
            if (event.origin === chatToolOrigin && event.data.type === 'CHAT_ID_RESPONSE') {
                window.removeEventListener('message', messageHandler);
                resolve(event.data.chatId);
            }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Broadcast request
        try {
            window.parent.postMessage({
                type: 'REQUEST_CHAT_ID',
                source: 'scira-extension',
                url: window.location.href
            }, chatToolOrigin);
        } catch (e) {
            // Ignore cross-origin errors
        }
        
        // Timeout after 2 seconds
        setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            resolve(null);
        }, 2000);
    });
}

// Listen for chat ID updates from the tool
window.addEventListener('message', (event) => {
    if (event.origin === 'http://localhost:3000' && event.data.type === 'SET_CHAT_ID') {
        window.__CURRENT_CHAT_ID__ = event.data.chatId;
        console.log('✅ Received chat ID from tool:', event.data.chatId);
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem('scira_active_chat_id', event.data.chatId);
            sessionStorage.setItem('scira_active_chat_id', event.data.chatId);
        } catch (e) {
            console.warn('Could not store chat ID:', e);
        }
    }
});

// Enhanced element inspection with pattern recognition
function inspectElementWithContext(element) {
    if (!domAnalyzer) {
        domAnalyzer = new DOMAnalyzer();
    }
    
    const context = {
        element: {
            tagName: element.tagName.toLowerCase(),
            xpath: getXPath(element),
            cssSelector: getCSSSelector(element),
            attributes: {},
            boundingBox: element.getBoundingClientRect()
        },
        parent: element.parentElement ? {
            tagName: element.parentElement.tagName.toLowerCase(),
            role: element.parentElement.getAttribute('role')
        } : null,
        siblings: Array.from(element.parentElement?.children || []).map(sibling => ({
            tagName: sibling.tagName.toLowerCase(),
            isTarget: sibling === element
        })),
        patterns: []
    };
    
    // Extract attributes
    for (const attr of element.attributes) {
        context.element.attributes[attr.name] = attr.value;
    }
    
    // Check for patterns
    const patterns = domAnalyzer.config.patternLibrary;
    for (const [patternName, pattern] of Object.entries(patterns)) {
        if (domAnalyzer.findPatternMatches(element, pattern).length > 0) {
            context.patterns.push({
                name: patternName,
                type: pattern.type,
                recommendations: pattern.recommendations
            });
        }
    }
    
    return context;
}