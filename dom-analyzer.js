/**
 * Advanced DOM Analyzer with Diff, Dependency Graph, Multi-stage Processing,
 * Template Pattern Recognition, and Comprehensive Extraction
 */
class DOMAnalyzer {
  constructor(config = {}) {
    this.config = {
      // DOM Diff Configuration
      diffEnabled: config.diffEnabled !== false,
      diffDepth: config.diffDepth || 10,
      diffIgnoreAttributes: config.diffIgnoreAttributes || ['style', 'data-timestamp'],
      
      // Dependency Graph Configuration
      dependencyTracking: config.dependencyTracking !== false,
      maxDependencyDepth: config.maxDependencyDepth || 5,
      
      // Multi-stage Processing Configuration
      multiStageEnabled: config.multiStageEnabled !== false,
      stageTimeout: config.stageTimeout || 2000,
      maxStages: config.maxStages || 10,
      
      // Template Pattern Recognition
      templateRecognition: config.templateRecognition !== false,
      patternLibrary: config.patternLibrary || this.getDefaultPatterns(),
      
      // Comprehensive Extraction Configuration
      extractionRules: config.extractionRules || this.getDefaultExtractionRules(),
      semanticAnalysis: config.semanticAnalysis !== false,
      
      // General Configuration
      includeHidden: config.includeHidden || false,
      includeText: config.includeText !== false,
      includeAttributes: config.includeAttributes !== false,
      onlyFormElements: config.onlyFormElements || false,
      maxDepth: config.maxDepth || 15
    };

    this.previousSnapshot = null;
    this.stageHistory = [];
    this.dependencyGraph = new Map();
    this.detectedPatterns = [];
  }

  /**
   * Main analysis method that orchestrates all features
   */
  async analyzeDOM(options = {}) {
    const mergedConfig = { ...this.config, ...options };
    
    const analysisResult = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      config: mergedConfig,
      
      // Core extraction
      domTree: null,
      elements: [],
      formattedTree: '',
      
      // Advanced features
      domDiff: null,
      dependencyGraph: null,
      multiStageFlow: null,
      detectedPatterns: [],
      comprehensiveExtraction: null,
      
      // Metadata
      performance: {},
      warnings: [],
      suggestions: []
    };

    const startTime = performance.now();

    try {
      // Stage 1: Core DOM Extraction
      const coreExtraction = await this.performCoreExtraction(mergedConfig);
      analysisResult.domTree = coreExtraction.domTree;
      analysisResult.elements = coreExtraction.elements;
      analysisResult.formattedTree = coreExtraction.formattedTree;

      // Stage 2: DOM Diff Analysis
      if (mergedConfig.diffEnabled) {
        analysisResult.domDiff = this.performDOMDiff(coreExtraction.domTree);
      }

      // Stage 3: Dependency Graph Construction
      if (mergedConfig.dependencyTracking) {
        analysisResult.dependencyGraph = this.buildDependencyGraph(coreExtraction.domTree);
      }

      // Stage 4: Multi-stage Processing
      if (mergedConfig.multiStageEnabled) {
        analysisResult.multiStageFlow = await this.performMultiStageAnalysis(coreExtraction.domTree);
      }

      // Stage 5: Template Pattern Recognition
      if (mergedConfig.templateRecognition) {
        analysisResult.detectedPatterns = this.recognizeTemplatePatterns(coreExtraction.domTree);
      }

      // Stage 6: Comprehensive Extraction Enhancement
      analysisResult.comprehensiveExtraction = this.performComprehensiveExtraction(coreExtraction.domTree);

      analysisResult.performance.totalTime = performance.now() - startTime;
      analysisResult.performance.elementsProcessed = analysisResult.elements.length;

    } catch (error) {
      analysisResult.warnings.push({
        type: 'extraction_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return analysisResult;
  }

  /**
   * Core DOM extraction with enhanced attribute and metadata collection
   */
  async performCoreExtraction(config) {
    const elements = [];
    let allElements;

    if (config.onlyFormElements) {
      allElements = document.querySelectorAll(
        'input, select, textarea, button, form, label, fieldset, legend, optgroup, option, datalist'
      );
    } else {
      allElements = document.querySelectorAll('*');
    }

    const domTree = this.buildEnhancedDOMTree(document.body, config);
    
    // Build flat elements array for backward compatibility
    allElements.forEach((element, index) => {
      if (!this.shouldIncludeElement(element, config)) return;

      const elementData = this.extractElementData(element, index, config);
      elements.push(elementData);
    });

    return {
      domTree,
      elements,
      formattedTree: this.formatDOMTreeAsText(domTree)
    };
  }

  /**
   * Enhanced DOM tree building with comprehensive metadata
   */
  buildEnhancedDOMTree(rootElement, config, depth = 0) {
    if (depth > config.maxDepth || !rootElement) return null;

    if (!this.shouldIncludeElement(rootElement, config)) return null;

    const style = window.getComputedStyle(rootElement);
    const rect = rootElement.getBoundingClientRect();

    // Core element data
    const nodeData = {
      // Basic identification
      tagName: rootElement.tagName.toLowerCase(),
      xpath: this.getXPath(rootElement),
      cssSelector: this.getCSSSelector(rootElement),
      
      // Enhanced attributes collection
      attributes: this.extractAllAttributes(rootElement),
      
      // Current state tracking
      currentState: this.extractCurrentState(rootElement, config),
      
      // Positional and structural data
      position: {
        depth,
        index: Array.from(rootElement.parentNode?.children || []).indexOf(rootElement),
        siblingCount: rootElement.parentNode?.children.length || 0,
        childCount: rootElement.children.length,
        documentOrder: this.getDocumentOrder(rootElement)
      },
      
      // Visual and interaction metadata
      metadata: {
        isInteractive: this.isElementInteractive(rootElement),
        isFormElement: this.isFormElement(rootElement),
        isVisible: this.isElementVisible(rootElement, style),
        isInViewport: this.isInViewport(rect),
        accessibility: this.extractAccessibilityInfo(rootElement),
        semantic: this.extractSemanticInfo(rootElement),
        visual: this.extractVisualInfo(rootElement, style, rect),
        dataAttributes: this.extractDataAttributes(rootElement),
        events: this.extractEventInfo(rootElement)
      },
      
      // Content and text
      text: config.includeText ? this.extractTextContent(rootElement) : null,
      
      // Tree structure
      children: []
    };

    // Build children recursively
    for (const child of rootElement.children) {
      const childNode = this.buildEnhancedDOMTree(child, config, depth + 1);
      if (childNode) {
        nodeData.children.push(childNode);
      }
    }

    return nodeData;
  }

  /**
   * DOM Diff Implementation - Track changes between snapshots
   */
  performDOMDiff(currentTree) {
    if (!this.previousSnapshot) {
      this.previousSnapshot = JSON.parse(JSON.stringify(currentTree));
      return {
        type: 'initial_snapshot',
        changes: [],
        summary: { added: 0, modified: 0, removed: 0, moved: 0 }
      };
    }

    const changes = [];
    const summary = { added: 0, modified: 0, removed: 0, moved: 0 };

    this.compareNodes(this.previousSnapshot, currentTree, '', changes, summary);

    const diffResult = {
      type: 'diff_analysis',
      timestamp: new Date().toISOString(),
      changes,
      summary,
      changeRate: changes.length / this.countNodes(currentTree),
      significantChanges: changes.filter(c => c.significance === 'high')
    };

    // Update previous snapshot
    this.previousSnapshot = JSON.parse(JSON.stringify(currentTree));

    return diffResult;
  }

  /**
   * Compare two DOM nodes for differences
   */
  compareNodes(oldNode, newNode, path, changes, summary) {
    if (!oldNode && !newNode) return;

    if (!oldNode && newNode) {
      changes.push({
        type: 'added',
        path,
        element: newNode.tagName,
        xpath: newNode.xpath,
        significance: this.calculateChangeSignificance(newNode, 'added'),
        timestamp: new Date().toISOString()
      });
      summary.added++;
      return;
    }

    if (oldNode && !newNode) {
      changes.push({
        type: 'removed',
        path,
        element: oldNode.tagName,
        xpath: oldNode.xpath,
        significance: this.calculateChangeSignificance(oldNode, 'removed'),
        timestamp: new Date().toISOString()
      });
      summary.removed++;
      return;
    }

    // Check for modifications
    const modifications = this.detectModifications(oldNode, newNode);
    if (modifications.length > 0) {
      changes.push({
        type: 'modified',
        path,
        element: newNode.tagName,
        xpath: newNode.xpath,
        modifications,
        significance: this.calculateChangeSignificance(newNode, 'modified', modifications),
        timestamp: new Date().toISOString()
      });
      summary.modified++;
    }

    // Recursively compare children
    const maxChildren = Math.max(
      oldNode.children?.length || 0,
      newNode.children?.length || 0
    );

    for (let i = 0; i < maxChildren; i++) {
      const oldChild = oldNode.children?.[i];
      const newChild = newNode.children?.[i];
      this.compareNodes(oldChild, newChild, `${path}[${i}]`, changes, summary);
    }
  }

  /**
   * Dependency Graph Construction - Map conditional relationships
   */
  buildDependencyGraph(domTree) {
    const graph = {
      nodes: new Map(),
      edges: [],
      clusters: [],
      conditionalChains: [],
      interactionFlows: []
    };

    this.traverseForDependencies(domTree, graph);
    this.identifyConditionalChains(graph);
    this.identifyInteractionFlows(graph);
    this.clusterRelatedElements(graph);

    return {
      type: 'dependency_graph',
      timestamp: new Date().toISOString(),
      graph: this.serializeGraph(graph),
      statistics: this.calculateGraphStatistics(graph),
      criticalPaths: this.findCriticalPaths(graph)
    };
  }

  /**
   * Multi-stage Processing - Handle progressive disclosure
   */
  async performMultiStageAnalysis(domTree) {
    const stages = [];
    let currentStage = 0;

    // Initial stage
    stages.push({
      stage: currentStage++,
      timestamp: new Date().toISOString(),
      trigger: 'initial_load',
      snapshot: JSON.parse(JSON.stringify(domTree)),
      visibleElements: this.countVisibleElements(domTree),
      interactiveElements: this.countInteractiveElements(domTree)
    });

    // Simulate progressive disclosure detection
    const potentialTriggers = this.identifyProgressiveDisclosureTriggers(domTree);
    
    for (const trigger of potentialTriggers) {
      if (currentStage >= this.config.maxStages) break;

      const stageResult = await this.simulateStageChange(trigger, domTree);
      if (stageResult) {
        stages.push({
          stage: currentStage++,
          timestamp: new Date().toISOString(),
          trigger: trigger.type,
          triggerElement: trigger.element,
          snapshot: stageResult.snapshot,
          changes: stageResult.changes,
          visibleElements: stageResult.visibleElements,
          interactiveElements: stageResult.interactiveElements
        });
      }
    }

    return {
      type: 'multi_stage_analysis',
      totalStages: stages.length,
      stages,
      flowPatterns: this.analyzeFlowPatterns(stages),
      recommendations: this.generateStageRecommendations(stages)
    };
  }

  /**
   * Template Pattern Recognition - Identify common UI patterns
   */
  recognizeTemplatePatterns(domTree) {
    const patterns = [];
    const patternLibrary = this.config.patternLibrary;

    for (const [patternName, patternDef] of Object.entries(patternLibrary)) {
      const matches = this.findPatternMatches(domTree, patternDef);
      if (matches.length > 0) {
        patterns.push({
          name: patternName,
          type: patternDef.type,
          confidence: this.calculatePatternConfidence(matches, patternDef),
          matches,
          testingStrategy: patternDef.testingStrategy,
          recommendations: patternDef.recommendations
        });
      }
    }

    // Auto-detect dynamic patterns
    const dynamicPatterns = this.detectDynamicPatterns(domTree);
    patterns.push(...dynamicPatterns);

    return patterns;
  }

  /**
   * Comprehensive Extraction Enhancement
   */
  performComprehensiveExtraction(domTree) {
    return {
      semanticStructure: this.extractSemanticStructure(domTree),
      navigationMap: this.buildNavigationMap(domTree),
      contentBlocks: this.identifyContentBlocks(domTree),
      interactionMap: this.buildInteractionMap(domTree),
      accessibilityAudit: this.performAccessibilityAudit(domTree),
      testabilityScore: this.calculateTestabilityScore(domTree),
      locatorStrategies: this.generateLocatorStrategies(domTree),
      riskAssessment: this.assessTestingRisks(domTree)
    };
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Extract all attributes comprehensively
   */
  extractAllAttributes(element) {
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

    // ARIA attributes
    for (const attr of element.attributes) {
      if (attr.name.startsWith('aria-')) {
        attributes[attr.name] = attr.value;
      }
    }

    // Data attributes
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        attributes[attr.name] = attr.value;
      }
    }

    // Clean up null/undefined values
    Object.keys(attributes).forEach(key => {
      if (attributes[key] === null || attributes[key] === undefined || attributes[key] === '') {
        delete attributes[key];
      }
    });

    return attributes;
  }

  /**
   * Extract current state of form elements
   */
  extractCurrentState(element, config) {
    const state = {};
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'input') {
      state.value = element.value;
      if (element.type === 'checkbox' || element.type === 'radio') {
        state.checked = element.checked;
      }
      state.validity = element.validity ? {
        valid: element.validity.valid,
        valueMissing: element.validity.valueMissing,
        typeMismatch: element.validity.typeMismatch
      } : null;
    } else if (tagName === 'select') {
      state.value = element.value;
      state.selectedIndex = element.selectedIndex;
      state.selectedOptions = Array.from(element.selectedOptions).map(opt => ({
        value: opt.value,
        text: opt.text,
        index: opt.index
      }));
    } else if (tagName === 'textarea') {
      state.value = element.value;
    }

    // Common state for all elements
    state.focused = document.activeElement === element;
    state.disabled = element.disabled;
    state.readonly = element.readOnly;

    if (config.includeText) {
      state.textContent = element.textContent?.trim().substring(0, 200);
      state.innerText = element.innerText?.trim().substring(0, 200);
    }

    // Clean up null values
    Object.keys(state).forEach(key => {
      if (state[key] === null || state[key] === undefined || state[key] === '') {
        delete state[key];
      }
    });

    return Object.keys(state).length > 0 ? state : null;
  }

  /**
   * Extract comprehensive accessibility information
   */
  extractAccessibilityInfo(element) {
    return {
      role: element.getAttribute('role') || element.getAttribute('aria-role'),
      label: element.getAttribute('aria-label') || 
             element.getAttribute('aria-labelledby') || 
             this.getAssociatedLabel(element),
      description: element.getAttribute('aria-describedby'),
      hasTabIndex: element.hasAttribute('tabindex'),
      tabIndex: element.tabIndex,
      ariaHidden: element.getAttribute('aria-hidden') === 'true',
      ariaExpanded: element.getAttribute('aria-expanded'),
      ariaSelected: element.getAttribute('aria-selected'),
      ariaChecked: element.getAttribute('aria-checked'),
      ariaDisabled: element.getAttribute('aria-disabled'),
      landmarks: this.identifyLandmarkRole(element)
    };
  }

  /**
   * Default template patterns library
   */
  getDefaultPatterns() {
    return {
      loginForm: {
        type: 'form',
        selectors: ['input[type="email"]', 'input[type="password"]', 'button[type="submit"]'],
        testingStrategy: 'form_submission',
        recommendations: ['Test with valid/invalid credentials', 'Check error messages', 'Verify redirect after login']
      },
      navigationMenu: {
        type: 'navigation',
        selectors: ['nav', 'ul.nav', '.navbar', '[role="navigation"]'],
        testingStrategy: 'navigation_flow',
        recommendations: ['Test all menu items', 'Check responsive behavior', 'Verify current page highlighting']
      },
      dataTable: {
        type: 'data_display',
        selectors: ['table', '.table', '[role="table"]', '.data-table'],
        testingStrategy: 'data_validation',
        recommendations: ['Test sorting', 'Check pagination', 'Verify filtering', 'Test row selection']
      },
      modal: {
        type: 'overlay',
        selectors: ['.modal', '.dialog', '[role="dialog"]', '.overlay'],
        testingStrategy: 'modal_interaction',
        recommendations: ['Test open/close', 'Check escape key', 'Verify backdrop click', 'Test focus trap']
      },
      accordion: {
        type: 'progressive_disclosure',
        selectors: ['.accordion', '[role="tablist"]', '.collapse', '.expandable'],
        testingStrategy: 'progressive_disclosure',
        recommendations: ['Test expand/collapse', 'Check keyboard navigation', 'Verify ARIA states']
      }
    };
  }

  /**
   * Default extraction rules
   */
  getDefaultExtractionRules() {
    return {
      priorityAttributes: [
        'data-testid', 'data-test', 'data-cy', 'data-selenium',
        'id', 'name', 'aria-label', 'role', 'type', 'class'
      ],
      semanticElements: [
        'main', 'nav', 'header', 'footer', 'aside', 'section', 'article',
        'form', 'button', 'input', 'select', 'textarea'
      ],
      interactiveElements: [
        'a', 'button', 'input', 'select', 'textarea', 'details',
        '[tabindex]', '[onclick]', '[role="button"]', '[role="link"]'
      ]
    };
  }

  // Additional utility methods would continue here...
  // (XPath generation, CSS selector generation, pattern matching, etc.)

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
    // Enhanced CSS selector logic would be implemented here
    // (same as existing logic but with improvements)
    const tag = element.tagName.toLowerCase();
    
    // Check for test ID first
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    // Check for stable ID
    if (element.id && !/\d+$/.test(element.id)) {
      return `#${CSS.escape(element.id)}`;
    }

    // Continue with existing logic...
    return tag;
  }

  // Helper methods for element classification and analysis
  shouldIncludeElement(element, config) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    if (!config.includeHidden) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    }

    if (config.onlyFormElements && !this.isFormElement(element)) {
      return false;
    }

    return true;
  }

  isElementInteractive(element) {
    const interactiveTags = ['input', 'button', 'select', 'textarea', 'a', 'form'];
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           element.onclick !== null ||
           element.getAttribute('role') === 'button' ||
           element.tabIndex >= 0;
  }

  isFormElement(element) {
    const formTags = ['input', 'select', 'textarea', 'button', 'form', 'label', 'fieldset', 'legend'];
    return formTags.includes(element.tagName.toLowerCase());
  }

  isElementVisible(element, style) {
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  isInViewport(rect) {
    return rect.top >= 0 &&
           rect.left >= 0 &&
           rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
           rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  }

  formatDOMTreeAsText(node, prefix = '', isLast = true) {
    if (!node) return '';
    
    let result = '';
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    
    let nodeInfo = `${node.tagName}`;
    
    if (node.attributes.id) nodeInfo += `#${node.attributes.id}`;
    if (node.attributes.className) {
      const classes = node.attributes.className.split(' ').slice(0, 2);
      nodeInfo += `.${classes.join('.')}`;
    }
    
    const indicators = [];
    if (node.metadata?.isInteractive) indicators.push('🔗');
    if (node.metadata?.isFormElement) indicators.push('📝');
    if (!node.metadata?.isVisible) indicators.push('👻');
    
    result += `${prefix}${connector}${nodeInfo}`;
    if (indicators.length > 0) result += ` ${indicators.join('')}`;
    result += '\n';
    
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1;
      result += this.formatDOMTreeAsText(child, childPrefix, isLastChild);
    });
    
    return result;
  }

  // Placeholder methods for advanced features
  detectModifications(oldNode, newNode) { return []; }
  calculateChangeSignificance(node, changeType, modifications = []) { return 'medium'; }
  countNodes(tree) { return 1; }
  traverseForDependencies(tree, graph) { }
  identifyConditionalChains(graph) { }
  identifyInteractionFlows(graph) { }
  clusterRelatedElements(graph) { }
  serializeGraph(graph) { return {}; }
  calculateGraphStatistics(graph) { return {}; }
  findCriticalPaths(graph) { return []; }
  countVisibleElements(tree) { return 0; }
  countInteractiveElements(tree) { return 0; }
  identifyProgressiveDisclosureTriggers(tree) { return []; }
  simulateStageChange(trigger, tree) { return null; }
  analyzeFlowPatterns(stages) { return []; }
  generateStageRecommendations(stages) { return []; }
  findPatternMatches(tree, pattern) { return []; }
  calculatePatternConfidence(matches, pattern) { return 0.5; }
  detectDynamicPatterns(tree) { return []; }
  extractSemanticStructure(tree) { return {}; }
  buildNavigationMap(tree) { return {}; }
  identifyContentBlocks(tree) { return []; }
  buildInteractionMap(tree) { return {}; }
  performAccessibilityAudit(tree) { return {}; }
  calculateTestabilityScore(tree) { return 0; }
  generateLocatorStrategies(tree) { return []; }
  assessTestingRisks(tree) { return {}; }
  extractSemanticInfo(element) { return {}; }
  extractVisualInfo(element, style, rect) { return {}; }
  extractDataAttributes(element) { return {}; }
  extractEventInfo(element) { return {}; }
  extractTextContent(element) {
    if (!element) return '';
    
    const tagName = element.tagName.toLowerCase();
    
    // For form elements, get value or displayed text
    if (tagName === 'input') {
      if (element.type === 'button' || element.type === 'submit') {
        return element.value || element.getAttribute('value') || '';
      }
      if (element.type === 'text' || element.type === 'email' || element.type === 'password') {
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
    
    // Limit length to prevent extremely long text from cluttering output
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  }
  getDocumentOrder(element) { return 0; }
  getAssociatedLabel(element) { return null; }
  identifyLandmarkRole(element) { return null; }
  extractElementData(element, index, config) {
    const tagName = element.tagName.toLowerCase();
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // Extract text content
    const textContent = this.extractTextContent(element);
    
    // Build element name for display
    let elementName = textContent || element.getAttribute('name') || element.getAttribute('id') || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('alt') || 'Unnamed element';
    
    // For inputs, include type information
    if (tagName === 'input' && element.type) {
      elementName = elementName === 'Unnamed element' ? `${element.type} input` : elementName;
    }
    
    return {
      index,
      tagName,
      name: elementName,
      text: textContent,
      type: element.type || null,
      xpath: this.getXPath(element),
      cssSelector: this.getCSSSelector(element),
      attributes: this.extractAllAttributes(element),
      currentState: this.extractCurrentState(element, config),
      metadata: {
        isInteractive: this.isElementInteractive(element),
        isFormElement: this.isFormElement(element),
        isVisible: this.isElementVisible(element, style),
        isInViewport: this.isInViewport(rect),
        accessibility: this.extractAccessibilityInfo(element),
        boundingBox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      }
    };
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMAnalyzer;
} else {
  window.DOMAnalyzer = DOMAnalyzer;
}
