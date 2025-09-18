// Content script for DOM Inspector Pro
// This script runs on all web pages and provides basic DOM extraction

console.log('DOM Inspector Pro content script loaded');

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
    
    
    // Element highlighting for JSON editor
    if (request.action === 'highlightElement') {
        console.log('Content script received highlightElement request for xpath:', request.xpath);
        const result = highlightElementByXPath(request.xpath);
        sendResponse({ success: true, result: result });
        return true;
    }
    
    if (request.action === 'removeHighlight') {
        console.log('Content script received removeHighlight request');
        const result = removeAllHighlights();
        sendResponse({ success: true, result: result });
        return true;
    }
});

function highlightElementByXPath(xpath) {
    try {
        console.log('highlightElementByXPath called with xpath:', xpath);
        
        // Add highlight styles if not already present
        if (!document.getElementById('json-editor-highlight-styles')) {
            const styles = document.createElement('style');
            styles.id = 'json-editor-highlight-styles';
            styles.textContent = `
                .json-editor-highlight {
                    outline: 3px solid #ff6b35 !important;
                    outline-offset: 2px !important;
                    box-shadow: 0 0 15px rgba(255, 107, 53, 0.6) !important;
                    background-color: rgba(255, 107, 53, 0.15) !important;
                    transition: all 0.3s ease !important;
                    z-index: 9999 !important;
                    position: relative !important;
                }
            `;
            document.head.appendChild(styles);
            console.log('Highlight styles added to page');
        }
        
        // Remove any existing highlights first
        const removedCount = removeAllHighlights();
        console.log('Removed', removedCount, 'existing highlights');
        
        // Find element by xpath and highlight it
        console.log('Evaluating xpath:', xpath);
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue;
        
        if (element) {
            console.log('Found element to highlight:', element.tagName, element);
            element.classList.add('json-editor-highlight');
            console.log('Added highlight class to element');
            
            // Smooth scroll to element if it's not in view
            const rect = element.getBoundingClientRect();
            const isInView = rect.top >= 0 && rect.left >= 0 && 
                           rect.bottom <= window.innerHeight && 
                           rect.right <= window.innerWidth;
            
            if (!isInView) {
                console.log('Element not in view, scrolling to it');
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'center'
                });
            } else {
                console.log('Element is already in view');
            }
            
            return { success: true, found: true, tagName: element.tagName };
        } else {
            console.warn('No element found with xpath:', xpath);
            return { success: false, found: false, error: 'Element not found' };
        }
    } catch (error) {
        console.error('Error in highlightElementByXPath:', error);
        return { success: false, found: false, error: error.message };
    }
}

function removeAllHighlights() {
    // Remove highlight from all elements
    const highlights = document.querySelectorAll('.json-editor-highlight');
    console.log('removeAllHighlights: found', highlights.length, 'highlighted elements');
    
    highlights.forEach(el => {
        el.classList.remove('json-editor-highlight');
    });
    
    return highlights.length;
}

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