/**
 * DOM Extractor - Unified DOM extraction utilities
 * Consolidates all DOM extraction, XPath, and CSS selector generation
 */

export class DOMExtractor {
  constructor() {
    this.maxDepth = 15;
  }

  /**
   * Generate XPath for an element
   * @param {Element} element - DOM element
   * @returns {string} XPath string
   */
  getXPath(element) {
    if (element === document.body) return '/html/body';
    
    let path = [];
    for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
      let index = 0;
      for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
        if (sibling.nodeName === element.nodeName) ++index;
      }
      
      const tagName = element.nodeName.toLowerCase();
      const pathIndex = index ? `[${index + 1}]` : '';
      path.unshift(`${tagName}${pathIndex}`);
    }
    
    return path.length ? `/${path.join('/')}` : null;
  }

  /**
   * Generate CSS selector for an element with test automation best practices
   * @param {Element} element - DOM element
   * @returns {string} CSS selector
   */
  getCSSSelector(element) {
    const tag = element.tagName.toLowerCase();

    // Check for dynamic ID patterns
    const isDynamicId = (id) => {
      return /\d+$/.test(id) || /-\d+$/.test(id) || /_\d+$/.test(id) || /dynamic|temp|generated/i.test(id);
    };

    // Get stable CSS classes (semantic, not layout-based)
    const getStableClasses = (className) => {
      if (!className) return [];
      const classStr = typeof className === 'string' ? className : String(className);
      const classes = classStr.trim().split(/\s+/);
      return classes.filter(cls => 
        !/^(col-|row-|m[tblrxy]?-|p[tblrxy]?-|text-|bg-|border-|flex-|grid-|w-|h-|absolute|relative|fixed|top-|left-|right-|bottom-)/.test(cls) &&
        !/^(btn-primary|btn-secondary|form-control|input-group)$/.test(cls) &&
        cls.length > 2
      );
    };

    // PRIORITY 1: data-testid (most stable for testing)
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    // PRIORITY 2: Stable ID (non-dynamic)
    if (element.id && !isDynamicId(element.id)) {
      return `#${CSS.escape(element.id)}`;
    }

    // PRIORITY 3: Accessible attributes
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `${tag}[aria-label="${ariaLabel}"]`;
    }

    // PRIORITY 4: Stable CSS classes
    const stableClasses = getStableClasses(element.className);
    if (stableClasses.length > 0) {
      const classSelector = stableClasses.slice(0, 2).map(cls => `.${CSS.escape(cls)}`).join('');
      return `${tag}${classSelector}`;
    }

    // PRIORITY 5: Form elements with semantic attributes
    if (element.name && (tag === 'input' || tag === 'select' || tag === 'textarea')) {
      return `[name="${element.name}"]`;
    }

    // PRIORITY 6: Radio/checkbox with value
    if (element.type && (element.type === 'radio' || element.type === 'checkbox') && element.value) {
      return `input[type="${element.type}"][value="${element.value}"]`;
    }

    // PRIORITY 7: Input with type + placeholder
    if (tag === 'input' && element.type && element.placeholder) {
      return `input[type="${element.type}"][placeholder="${element.placeholder}"]`;
    }

    // PRIORITY 8: Submit buttons with value
    if (element.type === 'submit' && element.value) {
      return `input[type="submit"][value="${element.value}"]`;
    }

    // PRIORITY 9: Buttons with text
    if (tag === 'button' && element.textContent && element.textContent.trim()) {
      return `button:has-text("${element.textContent.trim()}")`;
    }

    // PRIORITY 10: Links with href or text
    if (tag === 'a') {
      const href = element.getAttribute('href');
      if (href && !href.startsWith('javascript:')) {
        return `a[href="${href}"]`;
      }
      if (element.textContent && element.textContent.trim()) {
        return `a:has-text("${element.textContent.trim()}")`;
      }
    }

    // PRIORITY 11: Semantic attributes
    const title = element.getAttribute('title');
    if (title) {
      return `${tag}[title="${title}"]`;
    }

    const alt = element.getAttribute('alt');
    if (alt) {
      return `${tag}[alt="${alt}"]`;
    }

    // Final fallback
    return tag;
  }

  /**
   * Extract all attributes from an element
   * @param {Element} element - DOM element
   * @returns {Object} Attributes object
   */
  extractAllAttributes(element) {
    const attributes = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  /**
   * Check if element should be included based on configuration
   * @param {Element} element - DOM element
   * @param {Object} config - Configuration options
   * @returns {boolean} Whether to include element
   */
  shouldIncludeElement(element, config) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    
    if (!config.includeHidden) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Build hierarchical DOM tree
   * @param {Element} rootElement - Root element to start from
   * @param {Object} config - Configuration options
   * @param {number} depth - Current depth
   * @returns {Object} DOM tree node
   */
  buildDOMTree(rootElement, config, depth = 0) {
    if (depth > this.maxDepth || !rootElement) return null;
    
    if (!this.shouldIncludeElement(rootElement, config)) return null;

    const isInteractive = ['input', 'button', 'select', 'textarea', 'a', 'form'].includes(rootElement.tagName.toLowerCase()) ||
                          rootElement.onclick !== null ||
                          rootElement.getAttribute('role') === 'button' ||
                          rootElement.tabIndex >= 0;

    const isFormElement = ['input', 'select', 'textarea', 'button', 'form', 'label'].includes(rootElement.tagName.toLowerCase());

    // Skip non-form elements if onlyFormElements is true
    if (config.onlyFormElements && !isFormElement) {
      return null;
    }

    // Get current live values for form elements
    let currentValue = null;
    let currentChecked = null;
    let currentSelected = null;
    
    if (rootElement.tagName.toLowerCase() === 'input') {
      if (rootElement.type === 'checkbox' || rootElement.type === 'radio') {
        currentChecked = rootElement.checked;
        currentValue = rootElement.value;
      } else {
        currentValue = rootElement.value;
      }
    } else if (rootElement.tagName.toLowerCase() === 'select') {
      currentValue = rootElement.value;
      currentSelected = rootElement.selectedIndex;
    } else if (rootElement.tagName.toLowerCase() === 'textarea') {
      currentValue = rootElement.value;
    }

    const nodeData = {
      tagName: rootElement.tagName.toLowerCase(),
      xpath: this.getXPath(rootElement),
      cssSelector: this.getCSSSelector(rootElement),
      attributes: this.extractAllAttributes(rootElement),
      currentState: {
        value: currentValue,
        checked: currentChecked,
        selectedIndex: currentSelected,
        textContent: config.includeText ? (rootElement.textContent || '').trim().substring(0, 100) : null,
      },
      text: config.includeText ? (rootElement.textContent || '').trim().substring(0, 100) : null,
      position: {
        depth: depth,
        index: Array.from(rootElement.parentNode?.children || []).indexOf(rootElement),
      },
      metadata: {
        isInteractive: isInteractive,
        isFormElement: isFormElement,
        isVisible: this.shouldIncludeElement(rootElement, { includeHidden: true }),
        boundingBox: rootElement.getBoundingClientRect ? {
          x: Math.round(rootElement.getBoundingClientRect().x),
          y: Math.round(rootElement.getBoundingClientRect().y),
          width: Math.round(rootElement.getBoundingClientRect().width),
          height: Math.round(rootElement.getBoundingClientRect().height),
        } : null,
      },
      children: []
    };

    // Clean up null values
    Object.keys(nodeData.attributes).forEach(key => {
      if (nodeData.attributes[key] === null || nodeData.attributes[key] === '') {
        delete nodeData.attributes[key];
      }
    });

    Object.keys(nodeData.currentState).forEach(key => {
      if (nodeData.currentState[key] === null || nodeData.currentState[key] === '') {
        delete nodeData.currentState[key];
      }
    });

    // Recursively build children
    for (const child of rootElement.children) {
      const childNode = this.buildDOMTree(child, config, depth + 1);
      if (childNode) {
        nodeData.children.push(childNode);
      }
    }

    return nodeData;
  }

  /**
   * Format DOM tree as text representation
   * @param {Object} node - DOM tree node
   * @param {string} prefix - Current prefix for indentation
   * @param {boolean} isLast - Whether this is the last child
   * @returns {string} Formatted tree text
   */
  formatDOMTreeAsText(node, prefix = '', isLast = true) {
    if (!node) return '';
    
    let result = '';
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    
    // Format node info
    let nodeInfo = `${node.tagName}`;
    
    // Add key attributes
    if (node.attributes.id) nodeInfo += `#${node.attributes.id}`;
    if (node.attributes.class) {
      const classes = node.attributes.class.split(' ').slice(0, 2);
      nodeInfo += `.${classes.join('.')}`;
    }
    if (node.attributes.name) nodeInfo += `[name="${node.attributes.name}"]`;
    if (node.attributes.type) nodeInfo += `[type="${node.attributes.type}"]`;
    
    // Add metadata indicators
    const indicators = [];
    if (node.metadata.isInteractive) indicators.push('🔗');
    if (node.metadata.isFormElement) indicators.push('📝');
    if (!node.metadata.isVisible) indicators.push('👻');
    
    result += `${prefix}${connector}${nodeInfo}`;
    if (indicators.length > 0) result += ` ${indicators.join('')}`;
    if (node.text && node.text.length > 0) result += ` "${node.text.substring(0, 30)}${node.text.length > 30 ? '...' : ''}"`;
    
    // Show current form values if available
    if (node.currentState && Object.keys(node.currentState).length > 0) {
      if (node.currentState.value !== undefined) {
        result += ` [value: "${node.currentState.value}"]`;
      }
      if (node.currentState.checked !== undefined) {
        result += ` [checked: ${node.currentState.checked}]`;
      }
    }
    
    result += '\n';
    
    // Process children
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1;
      result += this.formatDOMTreeAsText(child, childPrefix, isLastChild);
    });
    
    return result;
  }

  /**
   * Extract DOM data with configuration
   * @param {Object} config - Extraction configuration
   * @returns {Object} Extracted DOM data
   */
  extractDOM(config) {
    const results = {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      config: config,
      elements: [],
      domTree: null,
      formattedTree: ''
    };

    // Get elements based on configuration
    let elements;
    if (config.onlyFormElements) {
      elements = document.querySelectorAll('input, select, textarea, button, form, label, fieldset, legend');
    } else {
      elements = document.querySelectorAll('*');
    }

    // Build flat elements array for backward compatibility
    elements.forEach((element, index) => {
      if (!this.shouldIncludeElement(element, config)) return;
      
      const elementData = {
        index: index,
        tagName: element.tagName.toLowerCase(),
        xpath: this.getXPath(element),
        cssSelector: this.getCSSSelector(element),
        id: element.id || null,
        className: element.className || null,
        name: element.name || null,
        type: element.type || null,
        value: element.value || null,
        attributes: config.includeAttributes ? this.extractAllAttributes(element) : {},
        text: config.includeText ? (element.textContent || '').trim().substring(0, 100) : null
      };
      
      results.elements.push(elementData);
    });

    // Build hierarchical DOM tree
    const rootElement = config.onlyFormElements ? 
      document.querySelector('form') || document.body : 
      document.body;
    
    results.domTree = this.buildDOMTree(rootElement, config);
    results.formattedTree = this.formatDOMTreeAsText(results.domTree);

    return results;
  }
}
