/**
 * Configuration Manager Module
 * Handles loading, saving, and managing analysis configuration settings
 */

class ConfigurationManager {
  constructor() {
    this.defaultConfig = {
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
   * Get current analysis configuration from UI inputs
   */
  getAnalysisConfiguration() {
    return {
      // Basic options
      includeHidden: this.getCheckboxValue("includeHidden"),
      includeText: this.getCheckboxValue("includeText"),
      includeAttributes: this.getCheckboxValue("includeAttributes"),
      onlyFormElements: this.getCheckboxValue("onlyFormElements"),
      
      // Advanced features
      diffEnabled: this.getCheckboxValue("diffEnabled", false),
      diffDepth: this.getSliderValue("diffDepth", 10),
      dependencyTracking: this.getCheckboxValue("dependencyTracking", false),
      maxDependencyDepth: this.getSliderValue("maxDependencyDepth", 5),
      multiStageEnabled: this.getCheckboxValue("multiStageEnabled", false),
      stageTimeout: this.getSliderValue("stageTimeout", 2000),
      templateRecognition: this.getCheckboxValue("templateRecognition", false),
      semanticAnalysis: this.getCheckboxValue("semanticAnalysis", false),
      maxDepth: this.getSliderValue("maxDepth", 15)
    };
  }

  /**
   * Helper method to get checkbox value safely
   */
  getCheckboxValue(id, defaultValue = false) {
    const element = document.getElementById(id);
    return element ? element.checked : defaultValue;
  }

  /**
   * Helper method to get slider value safely
   */
  getSliderValue(id, defaultValue = 0) {
    const element = document.getElementById(id);
    return element ? parseInt(element.value) : defaultValue;
  }

  /**
   * Save configuration to storage with fallback mechanisms
   */
  saveConfiguration(config) {
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          'domInspectorConfig': config,
          'configTimestamp': Date.now()
        }).catch(error => {
          console.warn('Chrome storage failed, using localStorage fallback:', error);
          this.saveToLocalStorage(config);
        });
      } else {
        // Fallback to localStorage if chrome.storage not available
        this.saveToLocalStorage(config);
      }
    } catch (error) {
      console.warn('Failed to save configuration:', error);
      // Final fallback to localStorage
      this.saveToLocalStorage(config);
    }
  }

  /**
   * Save configuration to localStorage
   */
  saveToLocalStorage(config) {
    try {
      localStorage.setItem('domInspectorConfig', JSON.stringify(config));
      localStorage.setItem('configTimestamp', Date.now().toString());
    } catch (error) {
      console.error('All storage methods failed:', error);
    }
  }

  /**
   * Load saved configuration with fallback mechanisms
   */
  loadSavedConfiguration() {
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['domInspectorConfig']).then(result => {
          if (result.domInspectorConfig) {
            this.applyConfiguration(result.domInspectorConfig);
          }
        }).catch(error => {
          console.warn('Chrome storage loading failed, using localStorage fallback:', error);
          this.loadFromLocalStorage();
        });
      } else {
        // Fallback to localStorage
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.warn('Failed to load configuration:', error);
      // Final fallback to localStorage
      this.loadFromLocalStorage();
    }
  }

  /**
   * Load configuration from localStorage
   */
  loadFromLocalStorage() {
    try {
      const savedConfig = localStorage.getItem('domInspectorConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.applyConfiguration(config);
      }
    } catch (error) {
      console.error('All storage loading methods failed:', error);
    }
  }

  /**
   * Apply configuration values to UI elements
   */
  applyConfiguration(config) {
    // Apply basic options
    this.setCheckboxValue("includeHidden", config.includeHidden);
    this.setCheckboxValue("includeText", config.includeText);
    this.setCheckboxValue("includeAttributes", config.includeAttributes);
    this.setCheckboxValue("onlyFormElements", config.onlyFormElements);
    
    // Apply advanced options
    this.setCheckboxValue("diffEnabled", config.diffEnabled);
    this.setSliderValue("diffDepth", config.diffDepth);
    this.setCheckboxValue("dependencyTracking", config.dependencyTracking);
    this.setSliderValue("maxDependencyDepth", config.maxDependencyDepth);
    this.setCheckboxValue("multiStageEnabled", config.multiStageEnabled);
    this.setSliderValue("stageTimeout", config.stageTimeout);
    this.setCheckboxValue("templateRecognition", config.templateRecognition);
    this.setCheckboxValue("semanticAnalysis", config.semanticAnalysis);
    this.setSliderValue("maxDepth", config.maxDepth);
  }

  /**
   * Helper method to set checkbox value safely
   */
  setCheckboxValue(id, value) {
    if (value !== undefined) {
      const element = document.getElementById(id);
      if (element) {
        element.checked = value;
      }
    }
  }

  /**
   * Helper method to set slider value and update display
   */
  setSliderValue(id, value) {
    if (value !== undefined) {
      const slider = document.getElementById(id);
      const valueDisplay = document.getElementById(id + 'Value');
      
      if (slider) {
        slider.value = value;
      }
      if (valueDisplay) {
        valueDisplay.textContent = value;
      }
    }
  }

  /**
   * Export configuration as downloadable JSON file
   */
  exportConfiguration() {
    const config = this.getAnalysisConfiguration();
    const configData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      configuration: config,
      description: 'DOM Inspector Pro Configuration'
    };
    
    const jsonData = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dom-inspector-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (window.uiEventHandlers) {
      window.uiEventHandlers.showStatus('⚙️ Configuration exported!', 'success');
    }
  }

  /**
   * Import configuration from uploaded JSON file
   */
  async importConfiguration(file) {
    try {
      const text = await file.text();
      const configData = JSON.parse(text);
      
      if (configData.configuration) {
        this.applyConfiguration(configData.configuration);
        this.saveConfiguration(configData.configuration);
        
        if (window.uiEventHandlers) {
          window.uiEventHandlers.showStatus('⚙️ Configuration imported successfully!', 'success');
        }
      } else {
        throw new Error('Invalid configuration file format');
      }
    } catch (error) {
      console.error('Configuration import error:', error);
      if (window.uiEventHandlers) {
        window.uiEventHandlers.showStatus('❌ Failed to import configuration: ' + error.message, 'error');
      }
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults() {
    this.applyConfiguration(this.defaultConfig);
    this.saveConfiguration(this.defaultConfig);
    
    if (window.uiEventHandlers) {
      window.uiEventHandlers.showStatus('🔄 Configuration reset to defaults', 'success');
    }
  }

  /**
   * Validate configuration values
   */
  validateConfiguration(config) {
    const errors = [];
    
    // Validate numeric ranges
    if (config.diffDepth < 1 || config.diffDepth > 50) {
      errors.push('Diff depth must be between 1 and 50');
    }
    
    if (config.maxDependencyDepth < 1 || config.maxDependencyDepth > 20) {
      errors.push('Max dependency depth must be between 1 and 20');
    }
    
    if (config.stageTimeout < 100 || config.stageTimeout > 10000) {
      errors.push('Stage timeout must be between 100ms and 10s');
    }
    
    if (config.maxDepth < 1 || config.maxDepth > 100) {
      errors.push('Max depth must be between 1 and 100');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get configuration summary for display
   */
  getConfigurationSummary(config) {
    const enabledFeatures = [];
    
    if (config.diffEnabled) enabledFeatures.push('DOM Diff');
    if (config.dependencyTracking) enabledFeatures.push('Dependency Graph');
    if (config.multiStageEnabled) enabledFeatures.push('Multi-Stage Analysis');
    if (config.templateRecognition) enabledFeatures.push('Template Recognition');
    if (config.semanticAnalysis) enabledFeatures.push('Semantic Analysis');
    
    return {
      basicOptions: {
        includeHidden: config.includeHidden,
        includeText: config.includeText,
        includeAttributes: config.includeAttributes,
        onlyFormElements: config.onlyFormElements
      },
      enabledFeatures: enabledFeatures,
      advancedSettings: {
        maxDepth: config.maxDepth,
        diffDepth: config.diffDepth,
        maxDependencyDepth: config.maxDependencyDepth,
        stageTimeout: config.stageTimeout
      }
    };
  }
}

// Export for use in popup context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigurationManager;
} else {
  window.ConfigurationManager = ConfigurationManager;
}
