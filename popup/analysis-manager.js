/**
 * Analysis Manager Module
 * Handles DOM analysis orchestration, continuous analysis, and result processing
 */

class AnalysisManager {
  constructor() {
    this.analysisConfig = {};
  }

  /**
   * Extract DOM elements using enhanced analysis
   */
  async extractElements() {
    try {
      // Show loading state
      if (window.uiEventHandlers) {
        window.uiEventHandlers.setLoadingState(true, "Analyzing...");
      }
      
      const startTime = Date.now();
      this.updateProgress(10, "Initializing analysis...");

      // Get current tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Get comprehensive configuration
      const config = window.configManager ? window.configManager.getAnalysisConfiguration() : this.getDefaultConfig();
      this.updateProgress(20, "Configuration loaded");
      
      // Store configuration for future use
      this.analysisConfig = config;
      if (window.configManager) {
        window.configManager.saveConfiguration(config);
      }

      this.updateProgress(30, "Starting DOM analysis...");

      // Execute enhanced analysis via content script
      let response;
      try {
        // First try to ping the content script to see if it's loaded
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        
        // If ping succeeds, send the actual analysis request
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'analyzeDOM',
          config: config,
          options: config
        });
      } catch (connectionError) {
        // Content script not loaded, check if scripts are already loaded and inject only if needed
        console.log('Content script not responding, checking for existing scripts and using legacy extraction method');
        this.updateProgress(40, "Checking for existing scripts...");
        
        try {
          // First check if the required classes are already available
          const checkResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              return {
                hasDOMUtilities: typeof DOMUtilities !== 'undefined',
                hasBaseDOMAnalyzer: typeof BaseDOMAnalyzer !== 'undefined', 
                hasAdvancedAnalyzer: typeof AdvancedAnalyzer !== 'undefined',
                hasComprehensiveExtractor: typeof ComprehensiveExtractor !== 'undefined',
                hasDOMAnalyzer: typeof DOMAnalyzer !== 'undefined',
                hasExtractFunction: typeof extractElementDataWithAnalyzer !== 'undefined'
              };
            }
          });
          
          const availability = checkResults[0]?.result || {};
          console.log('Script availability check:', availability);
          
          // Only inject scripts that are missing
          if (!availability.hasDOMUtilities) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['core/dom-utilities.js']
            });
          }
          
          if (!availability.hasBaseDOMAnalyzer) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['core/base-dom-analyzer.js']
            });
          }
          
          if (!availability.hasAdvancedAnalyzer) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['core/advanced-analyzer.js']
            });
          }
          
          if (!availability.hasComprehensiveExtractor) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['core/comprehensive-extractor.js']
            });
          }
          
          if (!availability.hasDOMAnalyzer) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['dom-analyzer.js']
            });
          }
          
          this.updateProgress(60, "Executing analysis...");
          
          // Now execute the analysis function
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (config) => {
              if (typeof extractElementDataWithAnalyzer === 'function') {
                return extractElementDataWithAnalyzer(config);
              } else if (typeof DOMAnalyzer !== 'undefined') {
                // Fallback: create analyzer directly
                const analyzer = new DOMAnalyzer(config);
                return analyzer.analyzeDOM(config);
              } else {
                throw new Error('No analysis method available');
              }
            },
            args: [config],
          });
          
          if (results && results[0] && results[0].result) {
            response = { success: true, data: results[0].result };
          } else {
            throw new Error("Script injection analysis failed");
          }
          
        } catch (injectionError) {
          console.error('Script injection failed:', injectionError);
          throw new Error(`Failed to inject analysis scripts: ${injectionError.message}`);
        }
      }

      this.updateProgress(70, "Processing results...");

      if (response && response.success && response.data) {
        const extractedData = response.data;
        
        this.updateProgress(90, "Finalizing...");
        
        // Display comprehensive results
        const summary = this.generateAnalysisSummary(extractedData);
        this.showStatus(summary, "success");
        
        this.updateProgress(100, "Analysis complete!");
        
        // Auto-hide progress after delay
        setTimeout(() => {
          if (window.uiEventHandlers) {
            const analysisStatus = document.getElementById('analysisStatus');
            if (analysisStatus) {
              analysisStatus.classList.remove('active');
            }
          }
        }, 2000);
        
        return extractedData;
      } else {
        throw new Error(response?.error || "No data extracted");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      this.showStatus("Error in advanced analysis: " + error.message, "error");
      
      // Hide analysis status on error
      if (window.uiEventHandlers) {
        const analysisStatus = document.getElementById('analysisStatus');
        if (analysisStatus) {
          analysisStatus.classList.remove('active');
        }
      }
      return null;
    } finally {
      // Reset loading state
      if (window.uiEventHandlers) {
        window.uiEventHandlers.setLoadingState(false);
      }
    }
  }

  /**
   * Toggle continuous analysis mode
   */
  async toggleContinuousAnalysis(currentState) {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!currentState) {
      // Start continuous analysis
      const config = window.configManager ? window.configManager.getAnalysisConfiguration() : this.getDefaultConfig();
      config.analysisInterval = 5000; // 5 second intervals
      
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'continuousAnalysis',
          config: config
        });
        
        this.showStatus('🔄 Continuous analysis started', 'success');
        return true; // New state: active
      } catch (error) {
        this.showStatus('❌ Failed to start continuous analysis: ' + error.message, 'error');
        return false;
      }
    } else {
      // Stop continuous analysis
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'stopContinuousAnalysis'
        });
        
        this.showStatus('⏹️ Continuous analysis stopped', 'success');
        return false; // New state: inactive
      } catch (error) {
        this.showStatus('❌ Failed to stop continuous analysis: ' + error.message, 'error');
        return true;
      }
    }
  }

  /**
   * Generate analysis summary from extracted data
   */
  generateAnalysisSummary(data) {
    const elements = data.elements?.length || 0;
    const patterns = data.detectedPatterns?.length || 0;
    const changes = data.domDiff?.summary || { added: 0, modified: 0, removed: 0 };
    const dependencies = data.dependencyGraph?.graph?.nodes?.size || 0;
    
    let summary = `✅ Found ${elements} elements`;
    
    if (patterns > 0) {
      summary += `, ${patterns} UI patterns`;
    }
    
    if (changes.added + changes.modified + changes.removed > 0) {
      summary += `, ${changes.added + changes.modified + changes.removed} changes detected`;
    }
    
    if (dependencies > 0) {
      summary += `, ${dependencies} dependencies mapped`;
    }
    
    return summary;
  }

  /**
   * Get default analysis configuration
   */
  getDefaultConfig() {
    return {
      // Basic options
      includeHidden: false,
      includeText: true,
      includeAttributes: true,
      onlyFormElements: false,
      
      // Advanced features
      diffEnabled: false,
      diffDepth: 10,
      dependencyTracking: false,
      maxDependencyDepth: 5,
      multiStageEnabled: false,
      stageTimeout: 2000,
      templateRecognition: false,
      semanticAnalysis: false,
      maxDepth: 15
    };
  }

  /**
   * Analyze specific element by selector
   */
  async analyzeElement(selector, config = null) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const analysisConfig = config || this.analysisConfig || this.getDefaultConfig();

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'analyzeElement',
        selector: selector,
        config: analysisConfig
      });

      if (response && response.success) {
        return response.data;
      } else {
        throw new Error(response?.error || "Element analysis failed");
      }
    } catch (error) {
      console.error("Element analysis error:", error);
      this.showStatus("Failed to analyze element: " + error.message, "error");
      return null;
    }
  }

  /**
   * Perform quick analysis (minimal configuration)
   */
  async performQuickAnalysis() {
    const quickConfig = {
      includeHidden: false,
      includeText: true,
      includeAttributes: true,
      onlyFormElements: false,
      maxDepth: 10,
      // Disable advanced features for speed
      diffEnabled: false,
      dependencyTracking: false,
      multiStageEnabled: false,
      templateRecognition: false,
      semanticAnalysis: false
    };

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      this.updateProgress(50, "Quick analysis in progress...");

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'analyzeDOM',
        config: quickConfig,
        options: quickConfig
      });

      if (response && response.success && response.data) {
        const summary = `⚡ Quick analysis: ${response.data.elements?.length || 0} elements found`;
        this.showStatus(summary, "success");
        return response.data;
      } else {
        throw new Error(response?.error || "Quick analysis failed");
      }
    } catch (error) {
      console.error("Quick analysis error:", error);
      this.showStatus("Quick analysis failed: " + error.message, "error");
      return null;
    }
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats(data) {
    if (!data || !data.elements) {
      return {
        totalElements: 0,
        interactiveElements: 0,
        formElements: 0,
        hiddenElements: 0,
        analysisTime: 0
      };
    }

    const stats = {
      totalElements: data.elements.length,
      interactiveElements: data.elements.filter(el => el.metadata?.isInteractive).length,
      formElements: data.elements.filter(el => el.metadata?.isFormElement).length,
      hiddenElements: data.elements.filter(el => !el.metadata?.isVisible).length,
      analysisTime: data.performance?.totalTime || 0
    };

    // Add advanced feature stats if available
    if (data.detectedPatterns) {
      stats.detectedPatterns = data.detectedPatterns.length;
    }

    if (data.domDiff && data.domDiff.summary) {
      stats.domChanges = data.domDiff.summary.added + data.domDiff.summary.modified + data.domDiff.summary.removed;
    }

    if (data.dependencyGraph && data.dependencyGraph.graph) {
      stats.dependencies = data.dependencyGraph.graph.nodes?.size || 0;
    }

    return stats;
  }

  /**
   * Validate analysis results
   */
  validateAnalysisResults(data) {
    const errors = [];
    const warnings = [];

    if (!data) {
      errors.push('No analysis data provided');
      return { isValid: false, errors, warnings };
    }

    if (!data.elements || !Array.isArray(data.elements)) {
      errors.push('Elements array is missing or invalid');
    }

    if (!data.url || typeof data.url !== 'string') {
      warnings.push('Source URL is missing');
    }

    if (!data.timestamp) {
      warnings.push('Analysis timestamp is missing');
    }

    if (data.elements && data.elements.length === 0) {
      warnings.push('No elements were extracted - check configuration');
    }

    // Validate element structure
    if (data.elements && data.elements.length > 0) {
      const sampleElement = data.elements[0];
      if (!sampleElement.xpath) {
        warnings.push('Elements missing XPath information');
      }
      if (!sampleElement.cssSelector) {
        warnings.push('Elements missing CSS selector information');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Update progress bar (delegates to UI event handlers)
   */
  updateProgress(percentage, message) {
    if (window.uiEventHandlers) {
      window.uiEventHandlers.updateProgress(percentage, message);
    }
  }

  /**
   * Show status message (delegates to UI event handlers)
   */
  showStatus(message, type) {
    if (window.uiEventHandlers) {
      window.uiEventHandlers.showStatus(message, type);
    }
  }

  /**
   * Export analysis results with metadata
   */
  getExportData(extractedData) {
    if (!extractedData) return null;

    return {
      ...extractedData,
      metadata: {
        generatedBy: 'DOM Inspector Pro with Advanced Analysis',
        version: '2.0',
        exportTimestamp: new Date().toISOString(),
        configuration: this.analysisConfig,
        summary: {
          totalElements: extractedData.elements?.length || 0,
          detectedPatterns: extractedData.detectedPatterns?.length || 0,
          analysisFeatures: {
            domDiff: !!extractedData.domDiff,
            dependencyGraph: !!extractedData.dependencyGraph,
            multiStage: !!extractedData.multiStageFlow,
            templateRecognition: !!extractedData.detectedPatterns,
            comprehensiveExtraction: !!extractedData.comprehensiveExtraction
          }
        }
      }
    };
  }

  /**
   * Clear cached analysis data
   */
  clearCache() {
    this.analysisConfig = {};
    
    // Clear any stored analysis results
    try {
      localStorage.removeItem('lastAnalysisResults');
      localStorage.removeItem('lastAnalysisTimestamp');
    } catch (error) {
      console.warn('Failed to clear analysis cache:', error);
    }
  }

  /**
   * Get cached analysis if available and recent
   */
  getCachedAnalysis(maxAgeMs = 300000) { // 5 minutes default
    try {
      const timestamp = localStorage.getItem('lastAnalysisTimestamp');
      const results = localStorage.getItem('lastAnalysisResults');
      
      if (timestamp && results) {
        const age = Date.now() - parseInt(timestamp);
        if (age < maxAgeMs) {
          return JSON.parse(results);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached analysis:', error);
    }
    
    return null;
  }

  /**
   * Cache analysis results
   */
  cacheAnalysis(data) {
    try {
      localStorage.setItem('lastAnalysisResults', JSON.stringify(data));
      localStorage.setItem('lastAnalysisTimestamp', Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache analysis results:', error);
    }
  }
}

// Export for use in popup context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalysisManager;
} else {
  window.AnalysisManager = AnalysisManager;
}
