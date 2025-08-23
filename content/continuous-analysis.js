/**
 * Continuous Analysis Handler
 * Manages continuous DOM monitoring and analysis
 */

class ContinuousAnalysis {
  constructor() {
    this.analysisInterval = null;
    this.domAnalyzer = null;
    this.isActive = false;
  }

  start(config = {}) {
    // Skip continuous analysis on chat tool pages
    if (window.location.href.includes('localhost:3000') || window.location.href.includes('127.0.0.1:3000')) {
      console.log('Skipping continuous analysis - on chat tool page');
      return;
    }
    
    if (this.analysisInterval) {
      this.stop();
    }
    
    this.domAnalyzer = new DOMAnalyzer(config);
    this.isActive = true;
    
    this.analysisInterval = setInterval(async () => {
      try {
        const results = await this.domAnalyzer.analyzeDOM();
        
        // Send updates to popup if significant changes detected
        if (results.domDiff && results.domDiff.summary.added + results.domDiff.summary.removed + results.domDiff.summary.modified > 0) {
          chrome.runtime.sendMessage({
            action: 'domChanged',
            data: {
              timestamp: results.timestamp,
              changes: results.domDiff.summary,
              significantChanges: results.domDiff.significantChanges?.length || 0
            }
          });
          
          // DO NOT automatically send to API during continuous analysis
          // Only send when user explicitly clicks "Send to Tool"
          console.log('DOM changes detected but not auto-sending to prevent spam');
        }
      } catch (error) {
        console.error('Continuous analysis error:', error);
      }
    }, config.analysisInterval || 5000);
  }

  stop() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.domAnalyzer = null;
    this.isActive = false;
  }

  isRunning() {
    return this.isActive;
  }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContinuousAnalysis;
} else {
  window.ContinuousAnalysis = ContinuousAnalysis;
}
