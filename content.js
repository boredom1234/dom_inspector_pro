// Content script for additional functionality
// This script runs on all web pages and can provide additional features

console.log('XPath & Selector Extractor content script loaded');

// Optional: Add visual indicators when hovering over elements
let isHighlightMode = false;
let highlightedElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleHighlight') {
        toggleHighlightMode();
        sendResponse({ success: true });
    } else if (request.action === 'getElementInfo') {
        const element = document.elementFromPoint(request.x, request.y);
        if (element) {
            sendResponse({
                tagName: element.tagName.toLowerCase(),
                xpath: getXPath(element),
                cssSelector: getCSSSelector(element)
            });
        }
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