/**
 * Element Inspector
 * Provides detailed element inspection with pattern recognition
 */

class ElementInspector {
  constructor() {
    this.domAnalyzer = null;
  }

  // Enhanced element inspection with pattern recognition
  inspectElementWithContext(element) {
    if (!this.domAnalyzer) {
      this.domAnalyzer = new DOMAnalyzer();
    }
    
    const context = {
      element: {
        tagName: element.tagName.toLowerCase(),
        xpath: this.getXPath(element),
        cssSelector: this.getCSSSelector(element),
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
    const patterns = this.domAnalyzer.config.patternLibrary;
    for (const [patternName, pattern] of Object.entries(patterns)) {
      if (this.domAnalyzer.findPatternMatches(element, pattern).length > 0) {
        context.patterns.push({
          name: patternName,
          type: pattern.type,
          recommendations: pattern.recommendations
        });
      }
    }
    
    return context;
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
  module.exports = ElementInspector;
} else {
  window.ElementInspector = ElementInspector;
}
