/**
 * Context Aggregator - Comprehensive context collector for LLM consumption
 * Combines DOM data, interactions, validations, and conditional rendering into unified context
 */

// Global class declaration for content script compatibility
window.ContextAggregator = class ContextAggregator {
    constructor(options = {}) {
        this.options = {
            enableInteractionTracking: options.enableInteractionTracking !== false,
            enableValidationTracking: options.enableValidationTracking !== false,
            enableConditionalTracking: options.enableConditionalTracking !== false,
            enableDOMExtraction: options.enableDOMExtraction !== false,
            aggregationInterval: options.aggregationInterval || 2000,
            maxContextSize: options.maxContextSize || 50000, // characters
            optimizeForTestGeneration: options.optimizeForTestGeneration !== false,
            ...options
        };
        
        this.elementExtractor = new window.ElementExtractor();
        this.interactionTracker = null;
        this.validationTracker = null;
        this.conditionalTracker = null;
        
        this.contextHistory = [];
        this.currentContext = null;
        this.isAggregating = false;
        this.aggregationTimer = null;
        
        // Context state tracking
        this.lastDOMSnapshot = null;
        this.lastInteractionSummary = null;
        this.lastValidationSummary = null;
        this.lastConditionalSummary = null;
        
        this.initializeTrackers();
    }

    /**
     * Initialize all tracking components
     */
    initializeTrackers() {
        if (this.options.enableInteractionTracking) {
            this.interactionTracker = new window.InteractionTracker({
                trackClicks: true,
                trackFocus: true,
                trackFormInteractions: true,
                trackKeyboard: false, // Reduce noise for test generation
                trackMouse: false,
                sendInterval: this.options.aggregationInterval
            });
        }

        if (this.options.enableValidationTracking) {
            this.validationTracker = new window.ValidationTracker({
                trackValidationStates: true,
                trackErrorMessages: true,
                trackConditionalFields: true,
                trackFormSteps: true
            });
        }

        if (this.options.enableConditionalTracking) {
            this.conditionalTracker = new window.ConditionalRendererTracker({
                trackVisibilityChanges: true,
                trackDynamicContent: true,
                trackStateChanges: true,
                trackAsyncLoading: true
            });
        }
    }

    /**
     * Start context aggregation
     */
    startAggregation() {
        if (this.isAggregating) return;
        
        try {
            this.isAggregating = true;
            
            // Start all trackers
            if (this.interactionTracker) {
                this.interactionTracker.startTracking();
            }
            
            if (this.validationTracker) {
                this.validationTracker.startTracking();
            }
            
            if (this.conditionalTracker) {
                this.conditionalTracker.startTracking();
            }
            
            // Start periodic aggregation
            this.startPeriodicAggregation();
            
            // Initial context capture
            this.captureCurrentContext();
            
            console.log('Context aggregation started');
            
        } catch (error) {
            console.error('Failed to start context aggregation:', error);
            this.isAggregating = false;
        }
    }

    /**
     * Stop context aggregation
     */
    stopAggregation() {
        if (!this.isAggregating) return;
        
        try {
            this.isAggregating = false;
            
            // Stop all trackers
            if (this.interactionTracker) {
                this.interactionTracker.stopTracking();
            }
            
            if (this.validationTracker) {
                this.validationTracker.stopTracking();
            }
            
            if (this.conditionalTracker) {
                this.conditionalTracker.stopTracking();
            }
            
            // Stop periodic aggregation
            this.stopPeriodicAggregation();
            
            // Final context capture
            this.captureCurrentContext();
            
            console.log('Context aggregation stopped');
            
        } catch (error) {
            console.error('Failed to stop context aggregation:', error);
        }
    }

    /**
     * Start periodic context aggregation
     */
    startPeriodicAggregation() {
        if (this.aggregationTimer) return;
        
        this.aggregationTimer = setInterval(() => {
            this.captureCurrentContext();
        }, this.options.aggregationInterval);
    }

    /**
     * Stop periodic aggregation
     */
    stopPeriodicAggregation() {
        if (this.aggregationTimer) {
            clearInterval(this.aggregationTimer);
            this.aggregationTimer = null;
        }
    }

    /**
     * Capture current comprehensive context
     */
    async captureCurrentContext() {
        try {
            const context = {
                timestamp: Date.now(),
                url: window.location.href,
                title: document.title,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };

            // Capture DOM state
            if (this.options.enableDOMExtraction) {
                context.domState = await this.captureDOMState();
            }

            // Capture interaction data
            if (this.interactionTracker) {
                context.interactions = this.captureInteractionData();
            }

            // Capture validation state
            if (this.validationTracker) {
                context.validations = this.captureValidationData();
            }

            // Capture conditional rendering state
            if (this.conditionalTracker) {
                context.conditionalRendering = this.captureConditionalData();
            }

            // Generate context summary for LLM
            context.llmSummary = this.generateLLMSummary(context);

            // Optimize context size
            const optimizedContext = this.optimizeContextSize(context);

            this.currentContext = optimizedContext;
            this.addToContextHistory(optimizedContext);

            // Send to background script for LLM consumption
            this.sendContextToLLM(optimizedContext);

        } catch (error) {
            console.error('Error capturing context:', error);
        }
    }

    /**
     * Capture current DOM state
     */
    async captureDOMState() {
        try {
            let domData;
            
            if (this.options.optimizeForTestGeneration) {
                // Use optimized extraction for test generation
                domData = this.elementExtractor.extractForTestGeneration(document.body, OPTIMIZED_EXTRACTION_CONFIG);
            } else {
                // Use full extraction
                domData = this.elementExtractor.extractElements(document.body, {
                    maxDepth: 10,
                    includeHidden: false,
                    includeComputedStyles: false
                });
            }

            // Add change detection
            const hasChanged = this.hasDOMChanged(domData);
            
            return {
                elements: domData.elements || [],
                elementCount: domData.elements?.length || 0,
                hasChanged: hasChanged,
                extractedAt: domData.extractedAt || new Date().toISOString(),
                optimized: this.options.optimizeForTestGeneration
            };
            
        } catch (error) {
            console.warn('Error capturing DOM state:', error);
            return { error: error.message };
        }
    }

    /**
     * Capture interaction data
     */
    captureInteractionData() {
        try {
            const sessionMetrics = this.interactionTracker.getSessionMetrics();
            const interactionCount = this.interactionTracker.getInteractionCount();
            
            return {
                sessionMetrics: sessionMetrics,
                interactionCount: interactionCount,
                isTracking: this.interactionTracker.isCurrentlyTracking(),
                recentInteractions: this.getRecentInteractions(),
                interactionPatterns: this.analyzeInteractionPatterns()
            };
            
        } catch (error) {
            console.warn('Error capturing interaction data:', error);
            return { error: error.message };
        }
    }

    /**
     * Capture validation data
     */
    captureValidationData() {
        try {
            return {
                validationStates: this.validationTracker.getValidationStates(),
                errorMessages: this.validationTracker.getErrorMessages(),
                conditionalFields: this.validationTracker.getConditionalFields(),
                formSteps: this.validationTracker.getFormSteps(),
                summary: this.validationTracker.getCurrentValidationSummary()
            };
            
        } catch (error) {
            console.warn('Error capturing validation data:', error);
            return { error: error.message };
        }
    }

    /**
     * Capture conditional rendering data
     */
    captureConditionalData() {
        try {
            return {
                trackedElements: this.conditionalTracker.getTrackedElements(),
                renderingPatterns: this.conditionalTracker.getRenderingPatterns(),
                currentState: this.conditionalTracker.getCurrentRenderingState()
            };
            
        } catch (error) {
            console.warn('Error capturing conditional data:', error);
            return { error: error.message };
        }
    }

    /**
     * Generate LLM-optimized summary
     */
    generateLLMSummary(context) {
        const summary = {
            pageInfo: {
                url: context.url,
                title: context.title,
                timestamp: context.timestamp
            },
            
            currentState: {
                interactiveElements: this.countInteractiveElements(context.domState),
                visibleForms: this.countVisibleForms(context.domState),
                errorStates: this.countErrorStates(context.validations),
                loadingStates: this.countLoadingStates(context.conditionalRendering)
            },
            
            userBehavior: {
                recentActions: this.summarizeRecentActions(context.interactions),
                validationIssues: this.summarizeValidationIssues(context.validations),
                dynamicChanges: this.summarizeDynamicChanges(context.conditionalRendering)
            },
            
            testGenerationContext: {
                keyElements: this.identifyKeyElements(context.domState),
                userFlow: this.reconstructUserFlow(context.interactions),
                validationRules: this.extractValidationRules(context.validations),
                conditionalLogic: this.extractConditionalLogic(context.conditionalRendering)
            }
        };

        return summary;
    }

    /**
     * Optimize context size for transmission
     */
    optimizeContextSize(context) {
        let contextString = JSON.stringify(context);
        
        if (contextString.length <= this.options.maxContextSize) {
            return context;
        }

        // Progressively reduce context size
        const optimized = { ...context };

        // 1. Reduce DOM elements (keep only interactive ones)
        if (optimized.domState?.elements) {
            optimized.domState.elements = optimized.domState.elements
                .filter(el => this.isElementImportantForTesting(el))
                .slice(0, 100); // Limit to 100 most important elements
        }

        // 2. Reduce interaction history
        if (optimized.interactions?.recentInteractions) {
            optimized.interactions.recentInteractions = optimized.interactions.recentInteractions.slice(-20);
        }

        // 3. Reduce validation states
        if (optimized.validations?.validationStates) {
            optimized.validations.validationStates = optimized.validations.validationStates.slice(-50);
        }

        // 4. Keep only essential conditional rendering data
        if (optimized.conditionalRendering?.trackedElements) {
            optimized.conditionalRendering.trackedElements = optimized.conditionalRendering.trackedElements.slice(-30);
        }

        return optimized;
    }

    /**
     * Send context to LLM via background script
     */
    sendContextToLLM(context) {
        try {
            chrome.runtime.sendMessage({
                action: MESSAGE_TYPES.CONTEXT_DATA,
                context: context,
                optimizedForLLM: true,
                timestamp: Date.now()
            }).catch(error => {
                console.warn('Failed to send context to LLM:', error);
            });
        } catch (error) {
            console.warn('Error sending context to LLM:', error);
        }
    }

    /**
     * Helper methods for context analysis
     */
    
    hasDOMChanged(currentDOM) {
        if (!this.lastDOMSnapshot) {
            this.lastDOMSnapshot = currentDOM;
            return true;
        }
        
        const hasChanged = currentDOM.elementCount !== this.lastDOMSnapshot.elementCount ||
                          JSON.stringify(currentDOM.elements?.slice(0, 10)) !== 
                          JSON.stringify(this.lastDOMSnapshot.elements?.slice(0, 10));
        
        if (hasChanged) {
            this.lastDOMSnapshot = currentDOM;
        }
        
        return hasChanged;
    }
    
    getRecentInteractions() {
        if (!this.interactionTracker) return [];
        
        // Get recent interactions from tracker
        // This would need to be implemented in InteractionTracker
        return [];
    }
    
    analyzeInteractionPatterns() {
        // Analyze patterns in user interactions
        return {
            mostClickedElements: [],
            formInteractionFlow: [],
            navigationPattern: []
        };
    }
    
    countInteractiveElements(domState) {
        if (!domState?.elements) return 0;
        return domState.elements.filter(el => 
            ['input', 'button', 'select', 'textarea', 'a'].includes(el.tagName)
        ).length;
    }
    
    countVisibleForms(domState) {
        if (!domState?.elements) return 0;
        return domState.elements.filter(el => el.tagName === 'form').length;
    }
    
    countErrorStates(validations) {
        if (!validations?.validationStates) return 0;
        return validations.validationStates.filter(state => state.hasError).length;
    }
    
    countLoadingStates(conditionalRendering) {
        if (!conditionalRendering?.trackedElements) return 0;
        return conditionalRendering.trackedElements.filter(el => 
            el.contentState?.hasLoadingState
        ).length;
    }
    
    summarizeRecentActions(interactions) {
        if (!interactions?.recentInteractions) return [];
        
        return interactions.recentInteractions.slice(-5).map(interaction => ({
            type: interaction.type,
            element: interaction.elementInfo?.tagName,
            timestamp: interaction.timestamp
        }));
    }
    
    summarizeValidationIssues(validations) {
        if (!validations?.errorMessages) return [];
        
        return validations.errorMessages.slice(-3).map(error => ({
            text: error.text,
            element: error.element?.tagName
        }));
    }
    
    summarizeDynamicChanges(conditionalRendering) {
        if (!conditionalRendering?.trackedElements) return [];
        
        return conditionalRendering.trackedElements
            .filter(el => el.source !== 'initial_scan')
            .slice(-3)
            .map(el => ({
                action: el.source,
                element: el.element?.tagName
            }));
    }
    
    identifyKeyElements(domState) {
        if (!domState?.elements) return [];
        
        // Identify elements most important for testing
        return domState.elements
            .filter(el => this.isElementImportantForTesting(el))
            .slice(0, 20)
            .map(el => ({
                tagName: el.tagName,
                xpath: el.xpath,
                name: el.name || el.attributes?.name,
                type: el.type || el.attributes?.type,
                text: el.text
            }));
    }
    
    reconstructUserFlow(interactions) {
        if (!interactions?.recentInteractions) return [];
        
        // Reconstruct the sequence of user actions
        return interactions.recentInteractions.slice(-10).map((interaction, index) => ({
            step: index + 1,
            action: interaction.type,
            target: interaction.elementInfo?.tagName,
            description: this.generateActionDescription(interaction)
        }));
    }
    
    extractValidationRules(validations) {
        if (!validations?.validationStates) return [];
        
        return validations.validationStates
            .filter(state => state.isRequired || state.customValidation)
            .map(state => ({
                element: state.element?.tagName,
                required: state.isRequired,
                rules: state.customValidation
            }));
    }
    
    extractConditionalLogic(conditionalRendering) {
        if (!conditionalRendering?.renderingPatterns) return {};
        
        return Object.entries(conditionalRendering.renderingPatterns).reduce((acc, [type, patterns]) => {
            acc[type] = patterns.length;
            return acc;
        }, {});
    }
    
    isElementImportantForTesting(element) {
        if (!element) return false;
        
        // Elements important for test generation
        const importantTags = ['input', 'button', 'select', 'textarea', 'a', 'form'];
        const hasImportantAttributes = element.name || element.attributes?.id || element.attributes?.name;
        const hasText = element.text && element.text.trim().length > 0;
        
        return importantTags.includes(element.tagName) || hasImportantAttributes || hasText;
    }
    
    generateActionDescription(interaction) {
        const element = interaction.elementInfo;
        if (!element) return `${interaction.type} action`;
        
        const elementDesc = element.name || element.id || element.tagName;
        return `${interaction.type} on ${elementDesc}`;
    }
    
    addToContextHistory(context) {
        this.contextHistory.push(context);
        
        // Keep only recent history
        if (this.contextHistory.length > 50) {
            this.contextHistory = this.contextHistory.slice(-25);
        }
    }

    /**
     * Public methods
     */
    
    getCurrentContext() {
        return this.currentContext;
    }
    
    getContextHistory() {
        return this.contextHistory;
    }
    
    isCurrentlyAggregating() {
        return this.isAggregating;
    }
    
    getAggregationStatus() {
        return {
            isAggregating: this.isAggregating,
            trackersActive: {
                interactions: this.interactionTracker?.isCurrentlyTracking() || false,
                validations: this.validationTracker?.isTracking || false,
                conditionalRendering: this.conditionalTracker?.isTracking || false
            },
            contextHistorySize: this.contextHistory.length,
            lastContextTimestamp: this.currentContext?.timestamp
        };
    }
    
    async captureManualContext() {
        await this.captureCurrentContext();
        return this.currentContext;
    }
}

export default ContextAggregator;
