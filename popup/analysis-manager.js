/**
 * Analysis Manager - Coordinates DOM analysis operations
 * Handles analysis workflow, continuous analysis, and result processing
 */

import { MESSAGE_TYPES, UI_CONSTANTS, ERROR_MESSAGES } from '../shared/constants.js';
import { globalEvents, EVENTS } from '../shared/event-emitter.js';
import { AnalysisStorage } from '../shared/utils/storage-utils.js';

export class AnalysisManager {
    constructor() {
        this.currentAnalysis = null;
        this.continuousAnalysis = null;
        this.isAnalyzing = false;
        this.extractedData = null;
        this.analysisConfig = {};
        this.isInitialized = false;
    }

    /**
     * Initialize analysis manager
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.isInitialized = true;
        
        globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Analysis Manager initialized', UI_CONSTANTS.STATUS_TYPES.INFO);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for DOM changes from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === MESSAGE_TYPES.DOM_CHANGED) {
                this.handleDOMChange(message.data);
            }
        });

        // Listen for configuration changes
        globalEvents.on(EVENTS.CONFIG_CHANGED, (config) => {
            this.analysisConfig = { ...this.analysisConfig, ...config };
        });
    }

    /**
     * Start DOM analysis
     */
    async startAnalysis(config = {}) {
        if (this.isAnalyzing) {
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Analysis already in progress', UI_CONSTANTS.STATUS_TYPES.WARNING);
            return;
        }

        try {
            this.isAnalyzing = true;
            this.analysisConfig = config;
            
            globalEvents.emit(EVENTS.ANALYSIS_START, config);
            
            const startTime = Date.now();
            globalEvents.emit(EVENTS.UI_PROGRESS_UPDATE, 10, "Initializing analysis...");

            // Get current tab
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });

            if (!tab) {
                throw new Error('No active tab found');
            }

            globalEvents.emit(EVENTS.UI_PROGRESS_UPDATE, 20, "Configuration loaded");
            
            // Store configuration for future use
            await AnalysisStorage.saveAnalysisHistory({ config, timestamp: new Date().toISOString() });

            globalEvents.emit(EVENTS.UI_PROGRESS_UPDATE, 30, "Starting DOM analysis...");

            // Execute enhanced analysis via content script
            let response;
            try {
                // First try to ping the content script
                await chrome.tabs.sendMessage(tab.id, { action: MESSAGE_TYPES.PING });
                
                // If ping succeeds, send the actual analysis request
                response = await chrome.tabs.sendMessage(tab.id, {
                    action: MESSAGE_TYPES.ANALYZE_DOM,
                    config: config,
                    options: config
                });
            } catch (connectionError) {
                // Content script not loaded, use legacy method
                console.log('Content script not responding, using legacy extraction method');
                globalEvents.emit(EVENTS.UI_PROGRESS_UPDATE, 40, "Injecting analysis script...");
                
                response = await this.executeScriptInjection(tab.id, config);
            }

            globalEvents.emit(EVENTS.UI_PROGRESS_UPDATE, 70, "Processing results...");

            if (response && response.success && response.data) {
                this.extractedData = response.data;
                
                globalEvents.emit(EVENTS.UI_PROGRESS_UPDATE, 90, "Finalizing...");
                
                // Store analysis result
                await AnalysisStorage.saveLastSnapshot(this.extractedData);
                
                const analysisResult = {
                    ...this.extractedData,
                    duration: Date.now() - startTime,
                    config: config,
                    timestamp: new Date().toISOString(),
                    tabInfo: {
                        url: tab.url,
                        title: tab.title
                    }
                };
                
                globalEvents.emit(EVENTS.ANALYSIS_COMPLETE, analysisResult);
                globalEvents.emit(EVENTS.DOM_ANALYSIS_READY, this.extractedData);
                
                return analysisResult;
                
            } else {
                throw new Error(response?.error || "No data extracted");
            }
        } catch (error) {
            console.error("Analysis error:", error);
            globalEvents.emit(EVENTS.ANALYSIS_ERROR, error.message);
            throw error;
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Execute script injection as fallback
     */
    async executeScriptInjection(tabId, config) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                function: this.extractElementDataWithAnalyzer,
                args: [config],
            });
            
            if (results && results[0] && results[0].result) {
                return { success: true, data: results[0].result };
            } else {
                throw new Error("Script injection failed");
            }
        } catch (error) {
            throw new Error(`Script injection error: ${error.message}`);
        }
    }

    /**
     * Injected function for legacy analysis (fallback)
     */
    extractElementDataWithAnalyzer(config) {
        // This function runs in the page context
        if (typeof DOMAnalyzer === 'undefined') {
            throw new Error('DOMAnalyzer not available');
        }
        
        const analyzer = new DOMAnalyzer(config);
        return analyzer.analyzeDOM(config);
    }

    /**
     * Start continuous analysis
     */
    async startContinuousAnalysis(config = {}) {
        if (this.continuousAnalysis) {
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Continuous analysis already active', UI_CONSTANTS.STATUS_TYPES.WARNING);
            return;
        }

        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });

            if (!tab) {
                throw new Error('No active tab found');
            }

            const analysisConfig = {
                ...config,
                analysisInterval: config.analysisInterval || 5000
            };

            await chrome.tabs.sendMessage(tab.id, {
                action: MESSAGE_TYPES.CONTINUOUS_ANALYSIS,
                config: analysisConfig
            });

            this.continuousAnalysis = {
                tabId: tab.id,
                config: analysisConfig,
                startTime: Date.now()
            };

            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, '🔄 Continuous analysis started', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            globalEvents.emit('ui:continuous:update', true);
            
        } catch (error) {
            console.error('Failed to start continuous analysis:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Failed to start continuous analysis: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
            throw error;
        }
    }

    /**
     * Stop continuous analysis
     */
    async stopContinuousAnalysis() {
        if (!this.continuousAnalysis) {
            return;
        }

        try {
            await chrome.tabs.sendMessage(this.continuousAnalysis.tabId, {
                action: MESSAGE_TYPES.STOP_CONTINUOUS_ANALYSIS
            });

            this.continuousAnalysis = null;
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, '⏹️ Continuous analysis stopped', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            globalEvents.emit('ui:continuous:update', false);
            
        } catch (error) {
            console.error('Failed to stop continuous analysis:', error);
            // Clear locally even if communication failed
            this.continuousAnalysis = null;
            globalEvents.emit('ui:continuous:update', false);
        }
    }

    /**
     * Toggle continuous analysis
     */
    async toggleContinuousAnalysis(config = {}) {
        if (this.continuousAnalysis) {
            await this.stopContinuousAnalysis();
        } else {
            await this.startContinuousAnalysis(config);
        }
    }

    /**
     * Handle DOM change notifications
     */
    handleDOMChange(changeData) {
        if (!this.continuousAnalysis) return;

        const changeCount = changeData.changes.added + changeData.changes.modified + changeData.changes.removed;
        
        if (changeCount > 0) {
            globalEvents.emit('ui:domChange:notification', changeData);
            globalEvents.emit(EVENTS.DOM_CHANGED, changeData);
        }
    }

    /**
     * Download analysis results
     */
    async downloadResults() {
        if (!this.extractedData) {
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'No analysis data to download', UI_CONSTANTS.STATUS_TYPES.WARNING);
            return;
        }

        try {
            // Enhanced download with analysis metadata
            const downloadData = {
                ...this.extractedData,
                metadata: {
                    generatedBy: 'DOM Inspector Pro with Advanced Analysis',
                    version: '2.0',
                    downloadTimestamp: new Date().toISOString(),
                    configuration: this.analysisConfig,
                    summary: this.generateAnalysisSummary(this.extractedData)
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

            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, "📥 Advanced analysis downloaded!", UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            console.error('Download error:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Download failed: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Copy results to clipboard
     */
    async copyResults() {
        if (!this.extractedData) {
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'No analysis data to copy', UI_CONSTANTS.STATUS_TYPES.WARNING);
            return;
        }

        try {
            const jsonData = JSON.stringify(this.extractedData, null, 2);
            await navigator.clipboard.writeText(jsonData);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, "Copied to clipboard!", UI_CONSTANTS.STATUS_TYPES.SUCCESS);
        } catch (error) {
            console.error('Copy error:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, "Failed to copy to clipboard", UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Generate analysis summary
     */
    generateAnalysisSummary(data) {
        if (!data) return {};

        return {
            totalElements: data.elements?.length || 0,
            detectedPatterns: data.detectedPatterns?.length || 0,
            analysisFeatures: {
                domDiff: !!data.domDiff,
                dependencyGraph: !!data.dependencyGraph,
                multiStage: !!data.multiStageFlow,
                templateRecognition: !!data.detectedPatterns,
                comprehensiveExtraction: !!data.comprehensiveExtraction
            },
            performance: data.performance || {},
            warnings: data.warnings || [],
            suggestions: data.suggestions || []
        };
    }

    /**
     * Get current extracted data
     */
    getExtractedData() {
        return this.extractedData;
    }

    /**
     * Get analysis status
     */
    getAnalysisStatus() {
        return {
            isAnalyzing: this.isAnalyzing,
            hasData: !!this.extractedData,
            continuousActive: !!this.continuousAnalysis,
            currentConfig: this.analysisConfig
        };
    }

    /**
     * Clear analysis data
     */
    clearAnalysisData() {
        this.extractedData = null;
        globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Analysis data cleared', UI_CONSTANTS.STATUS_TYPES.INFO);
        globalEvents.emit(EVENTS.UI_BUTTON_STATE, 'downloadBtn', false);
        globalEvents.emit(EVENTS.UI_BUTTON_STATE, 'copyBtn', false);
        globalEvents.emit(EVENTS.UI_BUTTON_STATE, 'sendToMCPBtn', false);
    }

    /**
     * Get analysis history
     */
    async getAnalysisHistory(limit = 10) {
        try {
            return await AnalysisStorage.getAnalysisHistory(limit);
        } catch (error) {
            console.error('Failed to get analysis history:', error);
            return [];
        }
    }

    /**
     * Clear analysis history
     */
    async clearAnalysisHistory() {
        try {
            await AnalysisStorage.clearAnalysisHistory();
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Analysis history cleared', UI_CONSTANTS.STATUS_TYPES.INFO);
        } catch (error) {
            console.error('Failed to clear analysis history:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Failed to clear analysis history', UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Validate analysis prerequisites
     */
    async validatePrerequisites() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                return { isValid: false, error: 'No active tab found' };
            }

            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                return { isValid: false, error: 'Cannot analyze Chrome internal pages' };
            }

            // Try to ping content script
            try {
                await chrome.tabs.sendMessage(tab.id, { action: MESSAGE_TYPES.PING });
            } catch (error) {
                // Content script not loaded - this is OK, we can inject
                console.log('Content script not loaded, will use injection method');
            }

            return { isValid: true, tab };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    /**
     * Get manager state for debugging
     */
    getState() {
        return {
            isAnalyzing: this.isAnalyzing,
            hasExtractedData: !!this.extractedData,
            continuousAnalysis: this.continuousAnalysis,
            analysisConfig: this.analysisConfig,
            isInitialized: this.isInitialized
        };
    }
}

export default AnalysisManager;
