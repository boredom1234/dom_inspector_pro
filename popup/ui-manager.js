/**
 * UI Manager - Handles all DOM manipulation and UI updates for the popup
 * Focused solely on user interface concerns
 */

import { UI_CONSTANTS, CSS_CLASSES, TIMEOUTS } from '../shared/constants.js';
import { globalEvents, EVENTS } from '../shared/event-emitter.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Initialize UI manager
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.cacheElements();
        this.setupEventListeners();
        this.setupSidePanel();
        
        this.isInitialized = true;
        globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'UI Manager initialized', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
    }

    /**
     * Cache all DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Buttons
            extractBtn: document.getElementById("extractBtn"),
            downloadBtn: document.getElementById("downloadBtn"),
            copyBtn: document.getElementById("copyBtn"),
            continuousBtn: document.getElementById("continuousBtn"),
            exportConfigBtn: document.getElementById("exportConfigBtn"),
            toggleAdvancedBtn: document.getElementById("toggleAdvanced"),
            sendToMCPBtn: document.getElementById("sendToMCPBtn"),

            // Status and feedback elements
            status: document.getElementById("status"),
            loadingSpinner: document.getElementById("loadingSpinner"),
            extractText: document.getElementById("extractText"),
            analysisStatus: document.getElementById("analysisStatus"),
            progressFill: document.getElementById("progressFill"),
            analysisDetails: document.getElementById("analysisDetails"),
            autoSaveIndicator: document.getElementById("autoSaveIndicator"),

            // Configuration elements
            advancedOptions: document.getElementById("advancedOptions"),
            
            // Chat elements
            chatIdInput: document.getElementById("chatIdInput"),
            chatIdStatus: document.getElementById("chatIdStatus"),
            knowledgeChainStatus: document.getElementById("knowledgeChainStatus")
        };

        // Validate required elements exist
        this.validateRequiredElements();
    }

    /**
     * Validate that required UI elements exist
     */
    validateRequiredElements() {
        const required = ['extractBtn', 'status', 'loadingSpinner'];
        const missing = required.filter(id => !this.elements[id]);
        
        if (missing.length > 0) {
            console.error('Missing required UI elements:', missing);
            globalEvents.emit(EVENTS.EXTENSION_ERROR, `Missing UI elements: ${missing.join(', ')}`);
        }
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Listen for global events
        globalEvents.on(EVENTS.UI_STATUS_UPDATE, (message, type) => {
            this.showStatus(message, type);
        });

        globalEvents.on(EVENTS.UI_PROGRESS_UPDATE, (percentage, message) => {
            this.updateProgress(percentage, message);
        });

        globalEvents.on(EVENTS.UI_BUTTON_STATE, (buttonId, enabled) => {
            this.setButtonState(buttonId, enabled);
        });

        globalEvents.on(EVENTS.ANALYSIS_START, () => {
            this.showAnalysisStart();
        });

        globalEvents.on(EVENTS.ANALYSIS_COMPLETE, (data) => {
            this.showAnalysisComplete(data);
        });

        globalEvents.on(EVENTS.ANALYSIS_ERROR, (error) => {
            this.showAnalysisError(error);
        });

        globalEvents.on(EVENTS.CONFIG_SAVED, () => {
            this.showAutoSaveIndicator();
        });
    }

    /**
     * Setup side panel mode
     */
    setupSidePanel() {
        document.body.classList.add(CSS_CLASSES.SIDE_PANEL_MODE);
    }

    /**
     * Show status message with type styling
     * @param {string} message - Status message
     * @param {string} type - Status type (success, error, warning, info)
     */
    showStatus(message, type = UI_CONSTANTS.STATUS_TYPES.INFO) {
        if (!this.elements.status) return;

        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type}`;
        
        // Auto-clear success messages after delay
        if (type === UI_CONSTANTS.STATUS_TYPES.SUCCESS) {
            setTimeout(() => {
                this.clearStatus();
            }, 3000);
        }
    }

    /**
     * Clear status message
     */
    clearStatus() {
        if (this.elements.status) {
            this.elements.status.textContent = '';
            this.elements.status.className = 'status';
        }
    }

    /**
     * Show/hide loading spinner
     * @param {boolean} show - Whether to show spinner
     */
    showLoading(show = true) {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = show ? 'inline-block' : 'none';
        }
    }

    /**
     * Update progress bar and message
     * @param {number} percentage - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    updateProgress(percentage, message) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percentage}%`;
        }
        
        if (this.elements.analysisDetails) {
            this.elements.analysisDetails.textContent = message;
        }
    }

    /**
     * Show analysis status container
     */
    showAnalysisStatus() {
        if (this.elements.analysisStatus) {
            this.elements.analysisStatus.classList.add(CSS_CLASSES.ACTIVE);
        }
    }

    /**
     * Hide analysis status container
     */
    hideAnalysisStatus() {
        if (this.elements.analysisStatus) {
            this.elements.analysisStatus.classList.remove(CSS_CLASSES.ACTIVE);
        }
    }

    /**
     * Set button state (enabled/disabled)
     * @param {string} buttonId - Button ID
     * @param {boolean} enabled - Whether button should be enabled
     */
    setButtonState(buttonId, enabled) {
        const button = this.elements[buttonId];
        if (button) {
            button.disabled = !enabled;
        }
    }

    /**
     * Enable multiple buttons
     * @param {string[]} buttonIds - Array of button IDs
     */
    enableButtons(buttonIds) {
        buttonIds.forEach(buttonId => {
            this.setButtonState(buttonId, true);
        });
    }

    /**
     * Disable multiple buttons
     * @param {string[]} buttonIds - Array of button IDs
     */
    disableButtons(buttonIds) {
        buttonIds.forEach(buttonId => {
            this.setButtonState(buttonId, false);
        });
    }

    /**
     * Toggle advanced options visibility
     */
    toggleAdvancedOptions() {
        if (!this.elements.advancedOptions || !this.elements.toggleAdvancedBtn) return;

        const isVisible = this.elements.advancedOptions.classList.contains(CSS_CLASSES.VISIBLE);
        
        if (isVisible) {
            this.elements.advancedOptions.classList.remove(CSS_CLASSES.VISIBLE);
            this.elements.toggleAdvancedBtn.textContent = '🔧 Advanced Features';
        } else {
            this.elements.advancedOptions.classList.add(CSS_CLASSES.VISIBLE);
            this.elements.toggleAdvancedBtn.textContent = '🔧 Hide Advanced';
        }

        globalEvents.emit(EVENTS.CONFIG_CHANGED, { advancedOptionsVisible: !isVisible });
    }

    /**
     * Show analysis start UI state
     */
    showAnalysisStart() {
        this.setButtonState('extractBtn', false);
        this.showLoading(true);
        this.updateExtractText('Analyzing...');
        this.showAnalysisStatus();
        this.updateProgress(10, 'Initializing analysis...');
    }

    /**
     * Show analysis complete UI state
     * @param {Object} data - Analysis result data
     */
    showAnalysisComplete(data) {
        this.setButtonState('extractBtn', true);
        this.showLoading(false);
        this.updateExtractText('Extract All Elements');
        
        // Enable action buttons
        this.enableButtons(['downloadBtn', 'copyBtn', 'continuousBtn', 'sendToMCPBtn']);
        
        this.updateProgress(100, 'Analysis complete!');
        
        // Auto-hide progress after delay
        setTimeout(() => {
            this.hideAnalysisStatus();
        }, TIMEOUTS.AUTO_HIDE_PROGRESS);

        // Show summary
        if (data) {
            const summary = this.generateAnalysisSummary(data);
            this.showStatus(summary, UI_CONSTANTS.STATUS_TYPES.SUCCESS);
        }
    }

    /**
     * Show analysis error UI state
     * @param {string|Error} error - Error message or object
     */
    showAnalysisError(error) {
        this.setButtonState('extractBtn', true);
        this.showLoading(false);
        this.updateExtractText('Extract All Elements');
        this.hideAnalysisStatus();
        
        const message = error instanceof Error ? error.message : error;
        this.showStatus(`Analysis failed: ${message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
    }

    /**
     * Update extract button text
     * @param {string} text - Button text
     */
    updateExtractText(text) {
        if (this.elements.extractText) {
            this.elements.extractText.textContent = text;
        }
    }

    /**
     * Show auto-save indicator
     */
    showAutoSaveIndicator() {
        if (!this.elements.autoSaveIndicator) return;

        this.elements.autoSaveIndicator.style.opacity = '1';
        setTimeout(() => {
            this.elements.autoSaveIndicator.style.opacity = '0';
        }, TIMEOUTS.STATUS_FADE);
    }

    /**
     * Update chat ID status indicator
     * @param {string} status - Status ('detected', 'error', 'detecting')
     * @param {string} message - Tooltip message
     */
    updateChatIdStatus(status, message = '') {
        if (!this.elements.chatIdStatus) return;

        const statusIcons = {
            detected: '✅',
            error: '❌',
            warning: '⚠️',
            detecting: '🔍'
        };

        this.elements.chatIdStatus.textContent = statusIcons[status] || '❓';
        this.elements.chatIdStatus.title = message;

        // Update input border color
        if (this.elements.chatIdInput) {
            const colors = {
                detected: '#4CAF50',
                error: '#f44336',
                warning: '#ff9800',
                detecting: '#2196F3'
            };
            this.elements.chatIdInput.style.borderColor = colors[status] || '';
        }
    }

    /**
     * Update knowledge chain status
     * @param {string} message - Status message
     * @param {string} type - Status type for color
     */
    updateKnowledgeChainStatus(message, type = 'info') {
        if (!this.elements.knowledgeChainStatus) return;

        this.elements.knowledgeChainStatus.textContent = message;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#666'
        };
        
        this.elements.knowledgeChainStatus.style.color = colors[type] || colors.info;
    }

    /**
     * Update continuous analysis button state
     * @param {boolean} active - Whether continuous analysis is active
     */
    updateContinuousButton(active) {
        if (!this.elements.continuousBtn) return;

        if (active) {
            this.elements.continuousBtn.textContent = '⏹️ Stop Continuous';
            this.elements.continuousBtn.classList.add(CSS_CLASSES.BTN_PRIMARY);
            this.elements.continuousBtn.classList.remove(CSS_CLASSES.BTN_SECONDARY);
        } else {
            this.elements.continuousBtn.textContent = '🔄 Start Continuous Analysis';
            this.elements.continuousBtn.classList.remove(CSS_CLASSES.BTN_PRIMARY);
            this.elements.continuousBtn.classList.add(CSS_CLASSES.BTN_SECONDARY);
        }
    }

    /**
     * Flash button to indicate activity
     * @param {string} buttonId - Button ID
     * @param {string} color - Flash color
     * @param {number} duration - Flash duration
     */
    flashButton(buttonId, color = '#10b981', duration = 500) {
        const button = this.elements[buttonId];
        if (!button) return;

        const originalColor = button.style.backgroundColor;
        button.style.backgroundColor = color;
        
        setTimeout(() => {
            button.style.backgroundColor = originalColor;
        }, duration);
    }

    /**
     * Generate analysis summary text
     * @param {Object} data - Analysis data
     * @returns {string} - Summary text
     */
    generateAnalysisSummary(data) {
        if (!data) return 'Analysis completed';

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
     * Show DOM change notification
     * @param {Object} changeData - Change data from continuous analysis
     */
    showDOMChangeNotification(changeData) {
        const changeCount = changeData.changes.added + changeData.changes.modified + changeData.changes.removed;
        
        if (changeCount > 0) {
            this.showStatus(
                `🔄 DOM changed: +${changeData.changes.added} ~${changeData.changes.modified} -${changeData.changes.removed}`,
                UI_CONSTANTS.STATUS_TYPES.SUCCESS
            );
            
            // Flash the continuous button to indicate activity
            this.flashButton('continuousBtn');
        }
    }

    /**
     * Create and insert chat ID container (if not exists)
     */
    createChatIdContainer() {
        if (this.elements.chatIdInput) return; // Already exists

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

        // Insert after copy button
        if (this.elements.copyBtn) {
            this.elements.copyBtn.parentNode.insertBefore(chatIdContainer, this.elements.copyBtn.nextSibling);
            
            // Update cached elements
            this.elements.chatIdInput = document.getElementById('chatIdInput');
            this.elements.chatIdStatus = document.getElementById('chatIdStatus');
            this.elements.knowledgeChainStatus = document.getElementById('knowledgeChainStatus');
        }
    }

    /**
     * Create and insert send to MCP button (if not exists)
     */
    createSendToMCPButton() {
        if (this.elements.sendToMCPBtn) return; // Already exists

        const sendToMCPBtn = document.createElement("button");
        sendToMCPBtn.id = "sendToMCPBtn";
        sendToMCPBtn.className = "btn btn-primary";
        sendToMCPBtn.innerHTML = "🚀 Send to Tool";
        sendToMCPBtn.disabled = true;
        sendToMCPBtn.style.marginTop = "5px";

        // Add to chat ID container or after copy button
        const container = this.elements.chatIdInput?.parentElement?.parentElement || this.elements.copyBtn?.parentNode;
        if (container) {
            container.appendChild(sendToMCPBtn);
            this.elements.sendToMCPBtn = sendToMCPBtn;
        }
    }

    /**
     * Create auto-save indicator (if not exists)
     */
    createAutoSaveIndicator() {
        if (this.elements.autoSaveIndicator) return; // Already exists

        const autoSaveIndicator = document.createElement("div");
        autoSaveIndicator.id = "autoSaveIndicator";
        autoSaveIndicator.style.cssText = "font-size: 10px; color: #666; margin-top: 5px; opacity: 0; transition: opacity 0.3s;";
        autoSaveIndicator.textContent = "⚡ Settings auto-saved";

        // Add to appropriate container
        const container = this.elements.sendToMCPBtn?.parentElement || this.elements.copyBtn?.parentNode;
        if (container) {
            container.appendChild(autoSaveIndicator);
            this.elements.autoSaveIndicator = autoSaveIndicator;
        }
    }

    /**
     * Initialize dynamic UI elements
     */
    initializeDynamicElements() {
        this.createChatIdContainer();
        this.createSendToMCPButton();
        this.createAutoSaveIndicator();
    }

    /**
     * Get current UI state
     * @returns {Object} - Current UI state
     */
    getUIState() {
        return {
            isInitialized: this.isInitialized,
            buttonsEnabled: {
                extract: !this.elements.extractBtn?.disabled,
                download: !this.elements.downloadBtn?.disabled,
                copy: !this.elements.copyBtn?.disabled,
                continuous: !this.elements.continuousBtn?.disabled,
                sendToMCP: !this.elements.sendToMCPBtn?.disabled
            },
            status: {
                message: this.elements.status?.textContent || '',
                type: this.elements.status?.className || ''
            },
            loading: this.elements.loadingSpinner?.style.display === 'inline-block',
            advancedVisible: this.elements.advancedOptions?.classList.contains(CSS_CLASSES.VISIBLE)
        };
    }

    /**
     * Reset UI to initial state
     */
    reset() {
        this.clearStatus();
        this.showLoading(false);
        this.hideAnalysisStatus();
        this.updateExtractText('Extract All Elements');
        this.disableButtons(['downloadBtn', 'copyBtn', 'continuousBtn', 'sendToMCPBtn']);
        this.setButtonState('extractBtn', true);
        this.updateProgress(0, '');
    }
}

export default UIManager;
