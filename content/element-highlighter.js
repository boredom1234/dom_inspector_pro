/**
 * Element Highlighter
 * Handles visual highlighting of DOM elements for inspection
 */

class ElementHighlighter {
  constructor() {
    this.isHighlightMode = false;
    this.highlightedElement = null;
    
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
  }

  toggle() {
    this.isHighlightMode = !this.isHighlightMode;
    
    if (this.isHighlightMode) {
      this.enable();
    } else {
      this.disable();
    }
  }

  enable() {
    document.addEventListener('mouseover', this.handleMouseOver);
    document.addEventListener('mouseout', this.handleMouseOut);
    document.body.style.cursor = 'crosshair';
  }

  disable() {
    document.removeEventListener('mouseover', this.handleMouseOver);
    document.removeEventListener('mouseout', this.handleMouseOut);
    document.body.style.cursor = 'default';
    this.removeHighlight();
  }

  handleMouseOver(event) {
    if (!this.isHighlightMode) return;
    
    this.removeHighlight();
    this.highlightedElement = event.target;
    
    // Add highlight styling
    this.highlightedElement.style.outline = '2px solid #2563eb';
    this.highlightedElement.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
  }

  handleMouseOut(event) {
    if (!this.isHighlightMode) return;
    this.removeHighlight();
  }

  removeHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.style.outline = '';
      this.highlightedElement.style.backgroundColor = '';
      this.highlightedElement = null;
    }
  }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementHighlighter;
} else {
  window.ElementHighlighter = ElementHighlighter;
}
