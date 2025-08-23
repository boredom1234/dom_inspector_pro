/**
 * Knowledge Chain Tracker
 * Handles automatic interaction tracking for knowledge chain building
 */

class KnowledgeChainTracker {
  constructor() {
    this.interactionSequence = 0;
    this.lastDomCapture = 0;
    this.CAPTURE_DEBOUNCE = 1000; // Wait 1 second between captures to avoid spam
    
    this.initializeTracking();
  }

  initializeTracking() {
    // Initialize page load tracking
    window.addEventListener('load', () => {
      this.sendDomToKnowledgeChain('page_load', `Page loaded: ${document.title}`, {
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
        
        this.sendDomToKnowledgeChain('user_input', `Input in ${name} (${type}): "${value}"`, {
          selector: this.getCSSSelector(element),
          xpath: this.getXPath(element),
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
        
        this.sendDomToKnowledgeChain('form_submit', `Form submitted with: ${fields}`, {
          selector: this.getCSSSelector(form),
          xpath: this.getXPath(form),
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
        
        this.sendDomToKnowledgeChain(action, `Clicked: ${text}`, {
          selector: this.getCSSSelector(element),
          xpath: this.getXPath(element),
          text: text
        });
      }
    });

    // Track navigation events
    window.addEventListener('beforeunload', () => {
      this.sendDomToKnowledgeChain('navigation', `Leaving page: ${document.title}`, {
        url: window.location.href,
        title: document.title
      });
    });

    this.initializeDOMObserver();
  }

  initializeDOMObserver() {
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
        this.sendDomToKnowledgeChain('dom_change', `DOM modified: ${changes.slice(0, 3).join(', ')}`);
      }
    });

    // Start observing DOM changes
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'value', 'disabled', 'checked']
    });
  }

  async sendDomToKnowledgeChain(interactionType, description, target = null) {
    const now = Date.now();
    if (now - this.lastDomCapture < this.CAPTURE_DEBOUNCE) return;
    
    // Skip if we're on the chat tool itself (localhost:3000)
    if (window.location.href.includes('localhost:3000') || window.location.href.includes('127.0.0.1:3000')) {
      console.log('Skipping DOM capture - on chat tool page, not test target');
      return;
    }
    
    this.lastDomCapture = now;
    this.interactionSequence++;
    
    try {
      // Get current chat ID from multiple sources with fallback strategy
      let chatId = await window.chatBridge.getCurrentChatId();
      
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
        sequence: this.interactionSequence,
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
          sequence: this.interactionSequence,
          stateCount: result.knowledgeChain?.stateCount || 0
        });
      } else {
        console.warn('Failed to send DOM to knowledge chain:', response.status);
      }
    } catch (error) {
      console.error('Error sending DOM to knowledge chain:', error);
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
  module.exports = KnowledgeChainTracker;
} else {
  window.KnowledgeChainTracker = KnowledgeChainTracker;
}
