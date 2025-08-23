/**
 * UI Event Handlers Module
 * Manages all UI interactions and event listeners for the popup interface
 */

class UIEventHandlers {
  constructor() {
    this.isInitialized = false;
    this.continuousAnalysisActive = false;
    this.extractedData = null;
    
    // DOM element references
    this.elements = {};
  }

  /**
   * Initialize the UI event handlers (compatibility method)
   */
  init() {
    this.initializeSidePanel();
  }

  /**
   * Initialize the side panel and set up all event listeners
   */
  initializeSidePanel() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    console.log('DOM Inspector Pro Side Panel initialized');
    
    // Add visual indicator that this is a side panel
    document.body.classList.add('side-panel-mode');
    
    // Cache DOM element references
    this.cacheElementReferences();
    
    // Create dynamic UI elements
    this.createDynamicElements();
    
    // Set up all event listeners
    this.setupEventListeners();
    
    // Initialize UI components
    this.initializeUIComponents();
  }

  /**
   * Cache references to frequently used DOM elements
   */
  cacheElementReferences() {
    this.elements = {
      extractBtn: document.getElementById("extractBtn"),
      downloadBtn: document.getElementById("downloadBtn"),
      copyBtn: document.getElementById("copyBtn"),
      continuousBtn: document.getElementById("continuousBtn"),
      exportConfigBtn: document.getElementById("exportConfigBtn"),
      toggleAdvancedBtn: document.getElementById("toggleAdvanced"),
      status: document.getElementById("status"),
      loadingSpinner: document.getElementById("loadingSpinner"),
      extractText: document.getElementById("extractText"),
      analysisStatus: document.getElementById("analysisStatus"),
      progressFill: document.getElementById("progressFill"),
      analysisDetails: document.getElementById("analysisDetails")
    };
  }

  /**
   * Create dynamic UI elements (chat ID container, MCP button, etc.)
   */
  createDynamicElements() {
    // Chat ID container
    const chatIdContainer = document.createElement("div");
    chatIdContainer.style.marginTop = "10px";
    chatIdContainer.innerHTML = `
      <label for="chatIdInput" style="display: block; margin-bottom: 5px; font-size: 12px; color: #666;">
        Chat ID (auto-detected from active chat):
      </label>
      <div style="position: relative;">
        <input type="text" id="chatIdInput" placeholder="Detecting chat ID..." 
               style="width: 100%; padding: 5px 30px 5px 5px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
        <div id="chatIdStatus" style="position: absolute; right: 8px; top: 6px; font-size: 12px;">🔍</div>
      </div>
      <div id="knowledgeChainStatus" style="font-size: 11px; color: #666; margin-bottom: 8px;">Knowledge Chain: Not connected</div>
    `;

    // MCP Tool button
    const sendToMCPBtn = document.createElement("button");
    sendToMCPBtn.id = "sendToMCPBtn";
    sendToMCPBtn.className = "btn btn-primary";
    sendToMCPBtn.innerHTML = "🚀 Send to Tool";
    sendToMCPBtn.disabled = true;
    sendToMCPBtn.style.marginTop = "5px";
    
    // Auto-save indicator
    const autoSaveIndicator = document.createElement("div");
    autoSaveIndicator.id = "autoSaveIndicator";
    autoSaveIndicator.style.cssText = "font-size: 10px; color: #666; margin-top: 5px; opacity: 0; transition: opacity 0.3s;";
    autoSaveIndicator.textContent = "⚡ Settings auto-saved";

    // Insert into DOM
    this.elements.copyBtn.parentNode.insertBefore(chatIdContainer, this.elements.copyBtn.nextSibling);
    chatIdContainer.appendChild(sendToMCPBtn);
    chatIdContainer.appendChild(autoSaveIndicator);

    // Update element references
    this.elements.sendToMCPBtn = sendToMCPBtn;
    this.elements.autoSaveIndicator = autoSaveIndicator;
    this.elements.chatIdInput = document.getElementById("chatIdInput");
    this.elements.chatIdStatus = document.getElementById("chatIdStatus");
    this.elements.knowledgeChainStatus = document.getElementById("knowledgeChainStatus");
  }

  /**
   * Set up all event listeners for UI interactions
   */
  setupEventListeners() {
    // Main action buttons
    this.elements.extractBtn.addEventListener("click", () => this.handleExtract());
    this.elements.downloadBtn.addEventListener("click", () => this.handleDownload());
    this.elements.copyBtn.addEventListener("click", () => this.handleCopy());
    this.elements.continuousBtn.addEventListener("click", () => this.handleContinuousToggle());
    this.elements.exportConfigBtn.addEventListener("click", () => this.handleConfigExport());
    this.elements.toggleAdvancedBtn.addEventListener("click", () => this.handleAdvancedToggle());
    this.elements.sendToMCPBtn.addEventListener("click", () => this.handleMCPSend());

    // Listen for DOM change notifications from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'domChanged') {
        this.updateDOMChangeIndicator(message.data);
      }
    });
  }

  /**
   * Initialize UI components (sliders, configuration loading, etc.)
   */
  initializeUIComponents() {
    // Initialize sliders
    this.initializeSliders();
    
    // Load saved configuration
    if (window.configManager) {
      window.configManager.loadSavedConfiguration();
    }
    
    // Set up auto-save for configuration inputs
    this.setupAutoSave();
    
    // Initialize chat ID detection
    if (window.chatManager) {
      window.chatManager.initializeChatIdDetection();
    }
  }

  /**
   * Initialize range sliders with value displays
   */
  initializeSliders() {
    const sliders = [
      'diffDepth', 'maxDependencyDepth', 'stageTimeout', 'maxDepth'
    ];
    
    sliders.forEach(sliderId => {
      const slider = document.getElementById(sliderId);
      const valueDisplay = document.getElementById(sliderId + 'Value');
      
      if (slider && valueDisplay) {
        slider.addEventListener('input', function() {
          valueDisplay.textContent = this.value;
        });
      }
    });
  }

  /**
   * Set up auto-save listeners for configuration inputs
   */
  setupAutoSave() {
    const configInputs = [
      'includeHidden', 'includeText', 'includeAttributes', 'onlyFormElements',
      'diffEnabled', 'diffDepth', 'dependencyTracking', 'maxDependencyDepth',
      'multiStageEnabled', 'stageTimeout', 'templateRecognition', 'semanticAnalysis', 'maxDepth'
    ];
    
    configInputs.forEach(inputId => {
      const element = document.getElementById(inputId);
      if (element) {
        const eventType = element.type === 'checkbox' ? 'change' : 'input';
        element.addEventListener(eventType, () => this.saveConfigurationAutomatically());
      }
    });
    
    // Auto-save chat ID
    if (this.elements.chatIdInput) {
      this.elements.chatIdInput.addEventListener('input', (e) => {
        if (window.chatManager) {
          window.chatManager.saveChatId(e.target.value);
        }
      });
    }
  }

  /**
   * Handle extract button click
   */
  async handleExtract() {
    if (window.analysisManager) {
      this.extractedData = await window.analysisManager.extractElements();
      
      // Enable action buttons if extraction was successful
      if (this.extractedData) {
        this.elements.downloadBtn.disabled = false;
        this.elements.copyBtn.disabled = false;
        this.elements.continuousBtn.disabled = false;
        this.elements.sendToMCPBtn.disabled = false;
      }
    }
  }

  /**
   * Handle download button click
   */
  handleDownload() {
    if (window.fileManager && this.extractedData) {
      window.fileManager.downloadResults(this.extractedData);
    }
  }

  /**
   * Handle copy button click
   */
  async handleCopy() {
    if (window.fileManager && this.extractedData) {
      await window.fileManager.copyResults(this.extractedData);
    }
  }

  /**
   * Handle continuous analysis toggle
   */
  async handleContinuousToggle() {
    if (window.analysisManager) {
      this.continuousAnalysisActive = await window.analysisManager.toggleContinuousAnalysis(
        this.continuousAnalysisActive
      );
      
      // Update button state
      if (this.continuousAnalysisActive) {
        this.elements.continuousBtn.textContent = '⏹️ Stop Continuous';
        this.elements.continuousBtn.classList.add('btn-primary');
        this.elements.continuousBtn.classList.remove('btn-secondary');
      } else {
        this.elements.continuousBtn.textContent = '🔄 Start Continuous Analysis';
        this.elements.continuousBtn.classList.remove('btn-primary');
        this.elements.continuousBtn.classList.add('btn-secondary');
      }
    }
  }

  /**
   * Handle configuration export
   */
  handleConfigExport() {
    if (window.configManager) {
      window.configManager.exportConfiguration();
    }
  }

  /**
   * Handle advanced options toggle
   */
  handleAdvancedToggle() {
    const advancedOptions = document.getElementById('advancedOptions');
    const isVisible = advancedOptions.classList.contains('visible');
    
    if (isVisible) {
      advancedOptions.classList.remove('visible');
      this.elements.toggleAdvancedBtn.textContent = '🔧 Advanced Features';
    } else {
      advancedOptions.classList.add('visible');
      this.elements.toggleAdvancedBtn.textContent = '🔧 Hide Advanced';
    }
  }

  /**
   * Handle MCP tool send button click
   */
  async handleMCPSend() {
    if (window.mcpManager && this.extractedData) {
      await window.mcpManager.sendToMCPTool(this.extractedData);
    }
  }

  /**
   * Update progress bar during analysis
   */
  updateProgress(percentage, message) {
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = percentage + '%';
    }
    if (this.elements.analysisDetails) {
      this.elements.analysisDetails.textContent = message;
    }
  }

  /**
   * Update DOM change indicator for continuous analysis
   */
  updateDOMChangeIndicator(changeData) {
    const changeCount = changeData.changes.added + changeData.changes.modified + changeData.changes.removed;
    
    if (changeCount > 0) {
      this.showStatus(
        `🔄 DOM changed: +${changeData.changes.added} ~${changeData.changes.modified} -${changeData.changes.removed}`,
        'success'
      );
      
      // Flash the continuous button to indicate activity
      this.elements.continuousBtn.style.backgroundColor = '#10b981';
      setTimeout(() => {
        this.elements.continuousBtn.style.backgroundColor = '';
      }, 500);
    }
  }

  /**
   * Save configuration automatically with visual feedback
   */
  saveConfigurationAutomatically() {
    if (window.configManager) {
      const config = window.configManager.getAnalysisConfiguration();
      window.configManager.saveConfiguration(config);
      
      // Show visual feedback
      if (this.elements.autoSaveIndicator) {
        this.elements.autoSaveIndicator.style.opacity = '1';
        setTimeout(() => {
          this.elements.autoSaveIndicator.style.opacity = '0';
        }, 1500);
      }
    }
  }

  /**
   * Show status message to user
   */
  showStatus(message, type) {
    if (this.elements.status) {
      this.elements.status.textContent = message;
      this.elements.status.className = `status ${type}`;
      this.elements.status.style.display = "block";

      setTimeout(() => {
        this.elements.status.style.display = "none";
      }, 3000);
    }
  }

  /**
   * Set loading state for extraction
   */
  setLoadingState(isLoading, message = '') {
    if (this.elements.extractBtn) {
      this.elements.extractBtn.disabled = isLoading;
    }
    
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.style.display = isLoading ? "inline-block" : "none";
    }
    
    if (this.elements.extractText) {
      this.elements.extractText.textContent = isLoading ? "Analyzing..." : "Extract All Elements";
    }
    
    if (this.elements.analysisStatus) {
      if (isLoading) {
        this.elements.analysisStatus.classList.add('active');
      } else {
        this.elements.analysisStatus.classList.remove('active');
      }
    }
  }
}

// Export for use in popup context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIEventHandlers;
} else {
  window.UIEventHandlers = UIEventHandlers;
}
