/**
 * Integrated DOM Analyzer - Orchestrates all modular analysis components
 * This is the main class that coordinates between all specialized modules
 * 
 * Dependencies: All core modules must be loaded before this class
 */

// Import all required modules (for content script injection)
if (typeof BaseDOMAnalyzer === 'undefined') {
  // If running in a context where modules aren't loaded, define minimal compatibility
  console.warn('DOM Analyzer modules not loaded - using fallback mode');
}

class DOMAnalyzer {
  constructor(config = {}) {
    // Initialize all modular components if available
    this.baseAnalyzer = typeof BaseDOMAnalyzer !== 'undefined' ? new BaseDOMAnalyzer(config) : null;
    this.advancedAnalyzer = typeof AdvancedAnalyzer !== 'undefined' ? new AdvancedAnalyzer(config) : null;
    this.comprehensiveExtractor = typeof ComprehensiveExtractor !== 'undefined' ? new ComprehensiveExtractor(config) : null;
    
    // Store configuration
    this._config = this.baseAnalyzer ? this.baseAnalyzer.config : config;
    
    // Initialize utilities (static methods don't need instantiation)
    this.utilities = typeof DOMUtilities !== 'undefined' ? DOMUtilities : null;
  }

  /**
   * Main analysis method that orchestrates all modular features
   */
  async analyzeDOM(options = {}) {
    const mergedConfig = { ...this.config, ...options };
    
    const analysisResult = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      config: mergedConfig,
      
      // Core extraction results
      domTree: null,
      elements: [],
      formattedTree: '',
      
      // Advanced analysis results
      domDiff: null,
      dependencyGraph: null,
      multiStageFlow: null,
      detectedPatterns: [],
      comprehensiveExtraction: null,
      
      // Performance and metadata
      performance: {},
      warnings: [],
      suggestions: []
    };

    const startTime = performance.now();

    try {
      // Stage 1: Core DOM Extraction using base analyzer
      const coreExtraction = await this.baseAnalyzer.performCoreExtraction(mergedConfig);
      analysisResult.domTree = coreExtraction.domTree;
      analysisResult.elements = coreExtraction.elements;
      analysisResult.formattedTree = coreExtraction.formattedTree;

      // Stage 2: Advanced Analysis Features
      if (mergedConfig.diffEnabled) {
        analysisResult.domDiff = this.advancedAnalyzer.performDOMDiff(coreExtraction.domTree);
      }

      if (mergedConfig.dependencyTracking) {
        analysisResult.dependencyGraph = this.advancedAnalyzer.buildDependencyGraph(coreExtraction.domTree);
      }

      if (mergedConfig.multiStageEnabled) {
        analysisResult.multiStageFlow = await this.advancedAnalyzer.performMultiStageAnalysis(coreExtraction.domTree);
      }

      if (mergedConfig.templateRecognition) {
        analysisResult.detectedPatterns = this.advancedAnalyzer.recognizeTemplatePatterns(coreExtraction.domTree);
      }

      // Stage 3: Comprehensive Extraction Enhancement
      analysisResult.comprehensiveExtraction = this.comprehensiveExtractor.performComprehensiveExtraction(coreExtraction.domTree);

      // Record performance metrics
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

  // Delegate utility methods to respective modules
  
  /**
   * Legacy method delegation for backward compatibility
   */
  getXPath(element) {
    return this.utilities.getXPath(element);
  }
  
  getCSSSelector(element) {
    return this.utilities.getCSSSelector(element);
  }
  
  formatDOMTreeAsText(tree) {
    return this.utilities.formatDOMTreeAsText(tree);
  }
  
  shouldIncludeElement(element, config) {
    return this.utilities.shouldIncludeElement(element, config);
  }
  
  isElementInteractive(element) {
    return this.utilities.isElementInteractive(element);
  }
  
  isFormElement(element) {
    return this.utilities.isFormElement(element);
  }
  
  extractTextContent(element) {
    return this.utilities.extractTextContent(element);
  }
  
  // Pattern matching method for compatibility with content script
  findPatternMatches(element, pattern) {
    if (this.advancedAnalyzer) {
      return this.advancedAnalyzer.findPatternMatches(element, pattern);
    }
    return [];
  }

  // Getter for config pattern library (used by content script)
  get config() {
    return this.baseAnalyzer ? this.baseAnalyzer.config : this._config;
  }
}

// Legacy function for content script injection compatibility
function extractElementDataWithAnalyzer(config) {
  try {
    const analyzer = new DOMAnalyzer(config);
    return analyzer.analyzeDOM(config);
  } catch (error) {
    console.error('DOM Analyzer error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      elements: [],
      domTree: null
    };
  }
}

// Export for use in content script and other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DOMAnalyzer, extractElementDataWithAnalyzer };
} else {
  window.DOMAnalyzer = DOMAnalyzer;
  window.extractElementDataWithAnalyzer = extractElementDataWithAnalyzer;
}
