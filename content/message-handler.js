/**
 * Content Script Message Handler
 * Handles all communication between content script and extension popup
 */

class ContentMessageHandler {
  constructor() {
    this.domAnalyzer = null;
    this.continuousAnalysis = null;
    this.elementHighlighter = null;
    this.chatBridge = null;
    
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Handle ping to check if content script is loaded
      if (request.action === 'ping') {
        sendResponse({ success: true, loaded: true });
        return true;
      }
      
      // Handle chat ID request from popup
      if (request.action === 'getCurrentChatId') {
        (async () => {
          const chatId = await this.chatBridge.getCurrentChatId();
          sendResponse({ success: true, chatId });
        })();
        return true; // Keep message channel open for async response
      }
      
      if (request.action === 'toggleHighlight') {
        this.elementHighlighter.toggle();
        sendResponse({ success: true });
        return true;
      } 
      
      if (request.action === 'getElementInfo') {
        const element = document.elementFromPoint(request.x, request.y);
        if (element) {
          sendResponse({
            tagName: element.tagName.toLowerCase(),
            xpath: this.getXPath(element),
            cssSelector: this.getCSSSelector(element)
          });
        }
        return true;
      } 
      
      if (request.action === 'analyzeDOM') {
        this.handleDOMAnalysis(request, sendResponse);
        return true; // Keep message channel open for async response
      }
      
      if (request.action === 'continuousAnalysis') {
        this.continuousAnalysis.start(request.config);
        sendResponse({ success: true });
        return true;
      }
      
      if (request.action === 'stopContinuousAnalysis') {
        this.continuousAnalysis.stop();
        sendResponse({ success: true });
        return true;
      }
    });
  }

  async handleDOMAnalysis(request, sendResponse) {
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
  }

  // Utility functions
  getXPath(element) {
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

  getCSSSelector(element) {
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
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentMessageHandler;
} else {
  window.ContentMessageHandler = ContentMessageHandler;
}
