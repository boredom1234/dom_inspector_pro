/**
 * File Manager Module
 * Handles file operations like downloading results, copying to clipboard, and exporting data
 */

class FileManager {
  constructor() {
    this.analysisConfig = {};
  }

  /**
   * Set analysis configuration for metadata inclusion
   */
  setAnalysisConfig(config) {
    this.analysisConfig = config;
  }

  /**
   * Download analysis results as JSON file
   */
  downloadResults(extractedData) {
    if (!extractedData) {
      this.showStatus("No data available to download", "error");
      return;
    }

    try {
      // Enhanced download with analysis metadata
      const downloadData = {
        ...extractedData,
        metadata: {
          generatedBy: 'DOM Inspector Pro with Advanced Analysis',
          version: '2.0',
          downloadTimestamp: new Date().toISOString(),
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

      const jsonData = JSON.stringify(downloadData, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `dom_inspector_analysis_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showStatus("📥 Advanced analysis downloaded!", "success");
    } catch (error) {
      console.error("Download error:", error);
      this.showStatus("❌ Failed to download results: " + error.message, "error");
    }
  }

  /**
   * Copy analysis results to clipboard
   */
  async copyResults(extractedData) {
    if (!extractedData) {
      this.showStatus("No data available to copy", "error");
      return;
    }

    try {
      const jsonData = JSON.stringify(extractedData, null, 2);
      await navigator.clipboard.writeText(jsonData);
      this.showStatus("📋 Copied to clipboard!", "success");
    } catch (error) {
      console.error("Copy error:", error);
      
      // Fallback for older browsers or when clipboard API fails
      try {
        this.copyToClipboardFallback(JSON.stringify(extractedData, null, 2));
        this.showStatus("📋 Copied to clipboard!", "success");
      } catch (fallbackError) {
        console.error("Fallback copy error:", fallbackError);
        this.showStatus("❌ Failed to copy to clipboard", "error");
      }
    }
  }

  /**
   * Fallback copy method for older browsers
   */
  copyToClipboardFallback(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  /**
   * Copy formatted tree view to clipboard
   */
  async copyFormattedTree(extractedData) {
    if (!extractedData || !extractedData.formattedTree) {
      this.showStatus("No tree data available to copy", "error");
      return;
    }

    try {
      const treeHeader = `DOM Tree Structure for ${extractedData.url || 'Unknown URL'}\n`;
      const treeFooter = `\n\nGenerated on ${new Date().toISOString()}\nTotal Elements: ${extractedData.elements?.length || 0}`;
      const fullTree = treeHeader + "=".repeat(50) + "\n" + extractedData.formattedTree + treeFooter;
      
      await navigator.clipboard.writeText(fullTree);
      this.showStatus("🌳 Tree structure copied to clipboard!", "success");
    } catch (error) {
      console.error("Tree copy error:", error);
      this.showStatus("❌ Failed to copy tree structure", "error");
    }
  }

  /**
   * Download only the DOM tree as a text file
   */
  downloadTree(extractedData) {
    if (!extractedData || !extractedData.formattedTree) {
      this.showStatus("No tree data available to download", "error");
      return;
    }

    try {
      const treeHeader = `DOM Tree Structure for ${extractedData.url || 'Unknown URL'}\n`;
      const treeFooter = `\n\nGenerated on ${new Date().toISOString()}\nTotal Elements: ${extractedData.elements?.length || 0}`;
      const fullTree = treeHeader + "=".repeat(50) + "\n" + extractedData.formattedTree + treeFooter;

      const blob = new Blob([fullTree], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `dom_tree_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.txt`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showStatus("🌳 DOM tree downloaded!", "success");
    } catch (error) {
      console.error("Tree download error:", error);
      this.showStatus("❌ Failed to download tree: " + error.message, "error");
    }
  }

  /**
   * Export analysis results in CSV format
   */
  downloadCSV(extractedData) {
    if (!extractedData || !extractedData.elements) {
      this.showStatus("No element data available for CSV export", "error");
      return;
    }

    try {
      const headers = [
        'Index',
        'Tag Name',
        'XPath',
        'CSS Selector',
        'ID',
        'Class Name',
        'Name',
        'Type',
        'Value',
        'Text Content',
        'Is Interactive',
        'Is Form Element',
        'Is Visible'
      ];

      let csvContent = headers.join(',') + '\n';

      extractedData.elements.forEach((element, index) => {
        const row = [
          index,
          this.escapeCsvField(element.tagName || ''),
          this.escapeCsvField(element.xpath || ''),
          this.escapeCsvField(element.cssSelector || ''),
          this.escapeCsvField(element.attributes?.id || ''),
          this.escapeCsvField(element.attributes?.className || element.attributes?.class || ''),
          this.escapeCsvField(element.attributes?.name || ''),
          this.escapeCsvField(element.type || ''),
          this.escapeCsvField(element.value || ''),
          this.escapeCsvField(element.text || ''),
          element.metadata?.isInteractive || false,
          element.metadata?.isFormElement || false,
          element.metadata?.isVisible !== false
        ];
        csvContent += row.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `dom_elements_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.csv`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showStatus("📊 CSV export downloaded!", "success");
    } catch (error) {
      console.error("CSV export error:", error);
      this.showStatus("❌ Failed to export CSV: " + error.message, "error");
    }
  }

  /**
   * Escape CSV field for proper formatting
   */
  escapeCsvField(field) {
    if (typeof field !== 'string') {
      return String(field || '');
    }
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    
    return field;
  }

  /**
   * Generate and download analysis report
   */
  downloadReport(extractedData) {
    if (!extractedData) {
      this.showStatus("No data available for report generation", "error");
      return;
    }

    try {
      const report = this.generateAnalysisReport(extractedData);
      const blob = new Blob([report], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `dom_analysis_report_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.txt`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showStatus("📄 Analysis report downloaded!", "success");
    } catch (error) {
      console.error("Report generation error:", error);
      this.showStatus("❌ Failed to generate report: " + error.message, "error");
    }
  }

  /**
   * Generate comprehensive analysis report
   */
  generateAnalysisReport(extractedData) {
    const timestamp = new Date().toISOString();
    const elements = extractedData.elements || [];
    
    let report = `DOM ANALYSIS REPORT\n`;
    report += `${'='.repeat(50)}\n\n`;
    report += `Generated: ${timestamp}\n`;
    report += `URL: ${extractedData.url || 'Unknown'}\n`;
    report += `Page Title: ${extractedData.title || 'Unknown'}\n\n`;

    // Summary Statistics
    report += `SUMMARY STATISTICS\n`;
    report += `${'-'.repeat(20)}\n`;
    report += `Total Elements: ${elements.length}\n`;
    report += `Interactive Elements: ${elements.filter(el => el.metadata?.isInteractive).length}\n`;
    report += `Form Elements: ${elements.filter(el => el.metadata?.isFormElement).length}\n`;
    report += `Visible Elements: ${elements.filter(el => el.metadata?.isVisible !== false).length}\n`;
    report += `Hidden Elements: ${elements.filter(el => el.metadata?.isVisible === false).length}\n\n`;

    // Advanced Analysis Results
    if (extractedData.detectedPatterns?.length > 0) {
      report += `DETECTED PATTERNS\n`;
      report += `${'-'.repeat(17)}\n`;
      extractedData.detectedPatterns.forEach((pattern, index) => {
        report += `${index + 1}. ${pattern.type || 'Unknown'} (Confidence: ${pattern.confidence || 'N/A'})\n`;
      });
      report += `\n`;
    }

    if (extractedData.domDiff && extractedData.domDiff.summary) {
      const diff = extractedData.domDiff.summary;
      report += `DOM CHANGES\n`;
      report += `${'-'.repeat(11)}\n`;
      report += `Added: ${diff.added || 0}\n`;
      report += `Modified: ${diff.modified || 0}\n`;
      report += `Removed: ${diff.removed || 0}\n`;
      report += `Moved: ${diff.moved || 0}\n\n`;
    }

    // Configuration Used
    if (this.analysisConfig && Object.keys(this.analysisConfig).length > 0) {
      report += `ANALYSIS CONFIGURATION\n`;
      report += `${'-'.repeat(22)}\n`;
      Object.entries(this.analysisConfig).forEach(([key, value]) => {
        report += `${key}: ${value}\n`;
      });
      report += `\n`;
    }

    // Element Details (first 10 for brevity)
    report += `ELEMENT DETAILS (First 10)\n`;
    report += `${'-'.repeat(27)}\n`;
    elements.slice(0, 10).forEach((element, index) => {
      report += `${index + 1}. ${element.tagName || 'unknown'}\n`;
      report += `   XPath: ${element.xpath || 'N/A'}\n`;
      report += `   CSS: ${element.cssSelector || 'N/A'}\n`;
      if (element.attributes?.id) {
        report += `   ID: ${element.attributes.id}\n`;
      }
      if (element.text) {
        report += `   Text: ${element.text.substring(0, 50)}${element.text.length > 50 ? '...' : ''}\n`;
      }
      report += `\n`;
    });

    if (elements.length > 10) {
      report += `... and ${elements.length - 10} more elements\n\n`;
    }

    // Footer
    report += `${'-'.repeat(50)}\n`;
    report += `Report generated by DOM Inspector Pro v2.0\n`;
    report += `For complete data, download the JSON export\n`;

    return report;
  }

  /**
   * Import analysis data from file
   */
  async importAnalysisData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate imported data structure
      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error('Invalid analysis data format');
      }
      
      this.showStatus("📥 Analysis data imported successfully!", "success");
      return data;
    } catch (error) {
      console.error("Import error:", error);
      this.showStatus("❌ Failed to import data: " + error.message, "error");
      return null;
    }
  }

  /**
   * Get file size information
   */
  getFileSizeInfo(data) {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    
    return `${size} ${sizes[i]}`;
  }

  /**
   * Show status message (delegates to UI event handlers if available)
   */
  showStatus(message, type) {
    if (window.uiEventHandlers && window.uiEventHandlers.showStatus) {
      window.uiEventHandlers.showStatus(message, type);
    } else {
      // Fallback status display
      console.log(`Status (${type}): ${message}`);
    }
  }

  /**
   * Create download statistics
   */
  getDownloadStats() {
    const stats = JSON.parse(localStorage.getItem('downloadStats') || '{}');
    return {
      totalDownloads: stats.totalDownloads || 0,
      lastDownloadTimestamp: stats.lastDownloadTimestamp || null,
      jsonDownloads: stats.jsonDownloads || 0,
      csvDownloads: stats.csvDownloads || 0,
      treeDownloads: stats.treeDownloads || 0,
      reportDownloads: stats.reportDownloads || 0
    };
  }

  /**
   * Update download statistics
   */
  updateDownloadStats(type = 'json') {
    try {
      const stats = this.getDownloadStats();
      stats.totalDownloads += 1;
      stats.lastDownloadTimestamp = new Date().toISOString();
      
      switch (type) {
        case 'json':
          stats.jsonDownloads += 1;
          break;
        case 'csv':
          stats.csvDownloads += 1;
          break;
        case 'tree':
          stats.treeDownloads += 1;
          break;
        case 'report':
          stats.reportDownloads += 1;
          break;
      }
      
      localStorage.setItem('downloadStats', JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to update download stats:', error);
    }
  }
}

// Export for use in popup context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileManager;
} else {
  window.FileManager = FileManager;
}
