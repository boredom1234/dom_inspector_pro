/**
 * DOM Utilities - Shared DOM manipulation and element identification functions
 * Used across popup, content script, and DOM analyzer modules
 */

import { PRIORITY_ATTRIBUTES, INTERACTIVE_TAGS, FORM_TAGS } from '../constants.js';

/**
 * Generate XPath for an element
 * @param {Element} element - The DOM element
 * @returns {string|null} - XPath string or null
 */
export function getXPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
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

/**
 * Generate CSS selector for an element with priority for test attributes
 * @param {Element} element - The DOM element
 * @returns {string} - CSS selector string
 */
export function getCSSSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

    // Check for test ID attributes first (highest priority)
    const testId = element.getAttribute('data-testid');
    if (testId) {
        return `[data-testid="${CSS.escape(testId)}"]`;
    }

    const testAttr = element.getAttribute('data-test');
    if (testAttr) {
        return `[data-test="${CSS.escape(testAttr)}"]`;
    }

    const cyAttr = element.getAttribute('data-cy');
    if (cyAttr) {
        return `[data-cy="${CSS.escape(cyAttr)}"]`;
    }

    // Check for stable ID (not ending with numbers)
    if (element.id && !/\d+$/.test(element.id)) {
        return `#${CSS.escape(element.id)}`;
    }

    // Build selector path
    let path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let selector = current.nodeName.toLowerCase();

        // Add classes if they exist and seem stable
        if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/)
                .filter(cls => cls && !cls.match(/^\d+$/) && !cls.includes('temp'));
            if (classes.length > 0) {
                selector += '.' + classes.slice(0, 3).map(c => CSS.escape(c)).join('.');
            }
        }

        // Add nth-of-type if needed for uniqueness
        if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children)
                .filter(child => child.tagName === current.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-of-type(${index})`;
            }
        }

        path.unshift(selector);
        current = current.parentElement;
    }

    return path.join(' > ') || element.tagName.toLowerCase();
}

/**
 * Generate multiple selector options for an element
 * @param {Element} element - The DOM element
 * @returns {Object} - Object with different selector strategies
 */
export function generateSelectorOptions(element) {
    const options = {
        xpath: getXPath(element),
        css: getCSSSelector(element),
        alternatives: []
    };

    // ID selector
    if (element.id) {
        options.alternatives.push({
            type: 'id',
            selector: `#${CSS.escape(element.id)}`,
            confidence: element.id.match(/^\d+$/) ? 'low' : 'high'
        });
    }

    // Name attribute
    if (element.name) {
        options.alternatives.push({
            type: 'name',
            selector: `[name="${CSS.escape(element.name)}"]`,
            confidence: 'medium'
        });
    }

    // Text content selector (for clickable elements)
    const text = getElementText(element);
    if (text && isElementInteractive(element)) {
        options.alternatives.push({
            type: 'text',
            selector: `//*[contains(text(), "${text.replace(/"/g, '\\"')}")]`,
            confidence: 'medium'
        });
    }

    // Aria-label selector
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        options.alternatives.push({
            type: 'aria-label',
            selector: `[aria-label="${CSS.escape(ariaLabel)}"]`,
            confidence: 'high'
        });
    }

    return options;
}

/**
 * Check if element is interactive
 * @param {Element} element - The DOM element
 * @returns {boolean} - True if element is interactive
 */
export function isElementInteractive(element) {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    
    // Check interactive tags
    if (INTERACTIVE_TAGS.includes(tagName)) return true;
    
    // Check for click handlers
    if (element.onclick !== null) return true;
    
    // Check ARIA roles
    const role = element.getAttribute('role');
    if (role && ['button', 'link', 'tab', 'menuitem'].includes(role)) return true;
    
    // Check tabindex
    if (element.tabIndex >= 0) return true;
    
    return false;
}

/**
 * Check if element is a form element
 * @param {Element} element - The DOM element
 * @returns {boolean} - True if element is a form element
 */
export function isFormElement(element) {
    if (!element) return false;
    return FORM_TAGS.includes(element.tagName.toLowerCase());
}

/**
 * Check if element is visible
 * @param {Element} element - The DOM element
 * @param {CSSStyleDeclaration} [computedStyle] - Computed style (optional)
 * @returns {boolean} - True if element is visible
 */
export function isElementVisible(element, computedStyle = null) {
    if (!element) return false;

    const style = computedStyle || window.getComputedStyle(element);
    
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
}

/**
 * Check if element is in viewport
 * @param {Element|DOMRect} elementOrRect - Element or bounding rect
 * @returns {boolean} - True if element is in viewport
 */
export function isInViewport(elementOrRect) {
    const rect = elementOrRect instanceof Element ? 
        elementOrRect.getBoundingClientRect() : elementOrRect;

    return rect.top >= 0 &&
           rect.left >= 0 &&
           rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
           rect.right <= (window.innerWidth || document.documentElement.clientWidth);
}

/**
 * Get meaningful text content from an element
 * @param {Element} element - The DOM element
 * @param {number} [maxLength=200] - Maximum text length
 * @returns {string} - Text content
 */
export function getElementText(element, maxLength = 200) {
    if (!element) return '';

    const tagName = element.tagName.toLowerCase();

    // For form elements, get value or displayed text
    if (tagName === 'input') {
        if (element.type === 'button' || element.type === 'submit') {
            return element.value || element.getAttribute('value') || '';
        }
        if (['text', 'email', 'password', 'search'].includes(element.type)) {
            return element.placeholder || '';
        }
        return element.value || '';
    }

    if (tagName === 'button') {
        return element.textContent?.trim() || element.innerText?.trim() || element.value || '';
    }

    if (tagName === 'select') {
        const selectedOption = element.options[element.selectedIndex];
        return selectedOption ? selectedOption.text : '';
    }

    if (tagName === 'textarea') {
        return element.placeholder || element.value || '';
    }

    if (tagName === 'a') {
        return element.textContent?.trim() || element.title || element.href || '';
    }

    if (tagName === 'img') {
        return element.alt || element.title || '';
    }

    if (tagName === 'option') {
        return element.text || element.textContent?.trim() || '';
    }

    // For other elements, get text content but limit length
    const textContent = element.textContent?.trim() || '';
    const innerText = element.innerText?.trim() || '';

    // Use innerText if available (respects styling), otherwise textContent
    const text = innerText || textContent;

    // Limit length to prevent extremely long text
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Extract all attributes from an element
 * @param {Element} element - The DOM element
 * @returns {Object} - Object containing all attributes
 */
export function extractAllAttributes(element) {
    if (!element) return {};

    const attributes = {};

    // Standard HTML attributes
    for (const attr of element.attributes) {
        attributes[attr.name] = attr.value;
    }

    // Special handling for important attributes
    const specialAttrs = [
        'id', 'className', 'name', 'type', 'value', 'placeholder', 'title',
        'alt', 'href', 'src', 'action', 'method', 'target', 'role',
        'tabindex', 'disabled', 'readonly', 'required', 'checked', 'selected'
    ];

    specialAttrs.forEach(attr => {
        const value = element[attr] !== undefined ? element[attr] : element.getAttribute(attr);
        if (value !== null && value !== undefined && value !== '') {
            attributes[attr] = value;
        }
    });

    // Clean up null/undefined values
    Object.keys(attributes).forEach(key => {
        if (attributes[key] === null || attributes[key] === undefined || attributes[key] === '') {
            delete attributes[key];
        }
    });

    return attributes;
}

/**
 * Get element's position in document order
 * @param {Element} element - The DOM element
 * @returns {number} - Document order position
 */
export function getDocumentOrder(element) {
    if (!element) return 0;
    
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
    );

    let order = 0;
    let current;
    
    while (current = walker.nextNode()) {
        order++;
        if (current === element) {
            return order;
        }
    }
    
    return 0;
}

/**
 * Get associated label for form element
 * @param {Element} element - The DOM element
 * @returns {string|null} - Label text or null
 */
export function getAssociatedLabel(element) {
    if (!element) return null;

    // Check for aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const labelElement = document.getElementById(labelledBy);
        if (labelElement) {
            return labelElement.textContent?.trim() || null;
        }
    }

    // Check for associated label element
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) {
            return label.textContent?.trim() || null;
        }
    }

    // Check if element is inside a label
    const parentLabel = element.closest('label');
    if (parentLabel) {
        return parentLabel.textContent?.trim() || null;
    }

    return null;
}

/**
 * Check if element should be included in analysis
 * @param {Element} element - The DOM element
 * @param {Object} config - Analysis configuration
 * @returns {boolean} - True if element should be included
 */
export function shouldIncludeElement(element, config = {}) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // Skip if hidden elements are excluded
    if (!config.includeHidden) {
        const style = window.getComputedStyle(element);
        if (!isElementVisible(element, style)) {
            return false;
        }
    }

    // Filter for form elements only if specified
    if (config.onlyFormElements && !isFormElement(element)) {
        return false;
    }

    // Skip script and style elements
    const tagName = element.tagName.toLowerCase();
    if (['script', 'style', 'meta', 'link'].includes(tagName)) {
        return false;
    }

    return true;
}

/**
 * Find elements by multiple selector strategies
 * @param {string|Object} selector - Selector string or options object
 * @param {Element} [context=document] - Context element to search within
 * @returns {Element[]} - Array of found elements
 */
export function findElements(selector, context = document) {
    const elements = [];

    if (typeof selector === 'string') {
        // Try CSS selector first
        try {
            const found = context.querySelectorAll(selector);
            elements.push(...found);
        } catch (e) {
            // If CSS fails, try XPath
            if (selector.startsWith('/') || selector.startsWith('.//')) {
                const result = document.evaluate(
                    selector,
                    context,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                
                for (let i = 0; i < result.snapshotLength; i++) {
                    elements.push(result.snapshotItem(i));
                }
            }
        }
    } else if (selector && typeof selector === 'object') {
        // Multiple selector strategies
        const strategies = ['css', 'xpath', 'text'];
        
        for (const strategy of strategies) {
            if (selector[strategy]) {
                const found = findElements(selector[strategy], context);
                elements.push(...found);
                if (elements.length > 0) break; // Use first successful strategy
            }
        }
    }

    // Remove duplicates
    return [...new Set(elements)];
}

/**
 * Get element hierarchy information
 * @param {Element} element - The DOM element
 * @returns {Object} - Hierarchy information
 */
export function getElementHierarchy(element) {
    if (!element) return {};

    return {
        depth: getElementDepth(element),
        index: getElementIndex(element),
        siblingCount: element.parentElement?.children.length || 0,
        childCount: element.children.length,
        ancestors: getElementAncestors(element),
        descendants: element.children.length
    };
}

/**
 * Get element depth in DOM tree
 * @param {Element} element - The DOM element
 * @returns {number} - Depth level
 */
export function getElementDepth(element) {
    let depth = 0;
    let current = element;
    
    while (current && current.parentElement) {
        depth++;
        current = current.parentElement;
    }
    
    return depth;
}

/**
 * Get element index among siblings
 * @param {Element} element - The DOM element
 * @returns {number} - Index position
 */
export function getElementIndex(element) {
    if (!element?.parentElement) return 0;
    return Array.from(element.parentElement.children).indexOf(element);
}

/**
 * Get element ancestors
 * @param {Element} element - The DOM element
 * @param {number} [maxLevels=10] - Maximum ancestor levels
 * @returns {Object[]} - Array of ancestor information
 */
export function getElementAncestors(element, maxLevels = 10) {
    const ancestors = [];
    let current = element?.parentElement;
    let level = 1;
    
    while (current && level <= maxLevels) {
        ancestors.push({
            tagName: current.tagName.toLowerCase(),
            level,
            id: current.id || null,
            className: current.className || null
        });
        
        current = current.parentElement;
        level++;
    }
    
    return ancestors;
}
