/**
 * Multi-Stage Analyzer - Progressive disclosure and staged analysis
 * Performs DOM analysis in multiple stages for progressive detail and performance optimization
 */

import { PERFORMANCE_LIMITS, DOM_SELECTORS } from '../../shared/constants.js';
import { DOMUtils } from '../../shared/utils/dom-utils.js';
import { ValidationUtils } from '../../shared/utils/validation-utils.js';
import { ElementExtractor } from '../core/element-extractor.js';
import { TreeBuilder } from '../core/tree-builder.js';

export class MultiStageAnalyzer {
    constructor(options = {}) {
        this.options = {
            maxStages: options.maxStages || 5,
            stageTimeout: options.stageTimeout || 10000,
            minElementsPerStage: options.minElementsPerStage || 10,
            progressiveDepth: options.progressiveDepth !== false,
            adaptiveStaging: options.adaptiveStaging !== false,
            enableCaching: options.enableCaching !== false,
            reportProgress: options.reportProgress !== false,
            ...options
        };
        
        this.currentStage = 0;
        this.totalStages = 0;
        this.stageResults = [];
        this.progressCallbacks = [];
        this.analysisState = {
            running: false,
            paused: false,
            completed: false,
            canceled: false
        };
        
        this.elementExtractor = new ElementExtractor(options);
        this.treeBuilder = new TreeBuilder(options);
        
        this.stageDefinitions = this.initializeStageDefinitions();
    }

    /**
     * Perform multi-stage DOM analysis
     */
    async performMultiStageAnalysis(rootElement = document.body, config = {}) {
        const startTime = performance.now();
        const mergedConfig = { ...this.options, ...config };
        
        try {
            this.resetAnalysis();
            this.analysisState.running = true;
            
            // Plan analysis stages
            const stages = await this.planAnalysisStages(rootElement, mergedConfig);
            this.totalStages = stages.length;
            
            this.reportProgress(0, 'Starting multi-stage analysis...');
            
            // Execute each stage
            for (let i = 0; i < stages.length; i++) {
                if (this.analysisState.canceled) {
                    throw new Error('Analysis canceled by user');
                }
                
                if (this.analysisState.paused) {
                    await this.waitForResume();
                }
                
                this.currentStage = i + 1;
                const stage = stages[i];
                
                this.reportProgress((i / stages.length) * 100, `Executing stage ${i + 1}: ${stage.name}`);
                
                const stageResult = await this.executeStage(stage, rootElement, mergedConfig);
                this.stageResults.push(stageResult);
                
                // Allow for breathing room between stages
                await this.stageDelay(50);
            }
            
            // Combine results from all stages
            const combinedResult = this.combineStageResults(this.stageResults, mergedConfig);
            
            this.analysisState.completed = true;
            this.analysisState.running = false;
            
            this.reportProgress(100, 'Multi-stage analysis completed');
            
            return {
                result: combinedResult,
                stages: this.stageResults,
                metadata: {
                    totalStages: this.totalStages,
                    executionTime: performance.now() - startTime,
                    configuration: mergedConfig,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Multi-stage analysis failed:', error);
            this.analysisState.running = false;
            this.analysisState.completed = false;
            
            return {
                result: null,
                stages: this.stageResults,
                metadata: { 
                    error: error.message,
                    completedStages: this.stageResults.length,
                    totalStages: this.totalStages
                }
            };
        }
    }

    /**
     * Plan analysis stages based on DOM complexity
     */
    async planAnalysisStages(rootElement, config) {
        const stages = [];
        
        // Stage 1: Quick overview analysis
        stages.push({
            name: 'Overview',
            type: 'overview',
            description: 'Quick DOM structure analysis',
            priority: 'high',
            config: {
                maxDepth: 3,
                maxElements: 50,
                includeComputedStyles: false,
                includePosition: false
            }
        });
        
        // Stage 2: Structure analysis
        stages.push({
            name: 'Structure',
            type: 'structure', 
            description: 'Detailed structural analysis',
            priority: 'high',
            config: {
                maxDepth: config.maxDepth || 10,
                maxElements: Math.min(config.maxElements || 1000, 200),
                includeComputedStyles: false,
                includePosition: true
            }
        });
        
        // Stage 3: Interactive elements
        stages.push({
            name: 'Interactive',
            type: 'interactive',
            description: 'Interactive elements analysis',
            priority: 'medium',
            config: {
                filterInteractiveOnly: true,
                includeComputedStyles: true,
                includePosition: true,
                includeAccessibility: true
            }
        });
        
        // Stage 4: Content analysis
        stages.push({
            name: 'Content',
            type: 'content',
            description: 'Text and media content analysis',
            priority: 'medium',
            config: {
                includeTextContent: true,
                includeMediaData: true,
                analyzeSemantic: true
            }
        });
        
        // Stage 5: Advanced features (conditional)
        if (config.enableAdvancedFeatures) {
            stages.push({
                name: 'Advanced',
                type: 'advanced',
                description: 'Advanced analysis features',
                priority: 'low',
                config: {
                    includeComputedStyles: true,
                    analyzeDependencies: true,
                    detectPatterns: true,
                    buildTree: true
                }
            });
        }
        
        // Adaptive staging - adjust based on DOM complexity
        if (config.adaptiveStaging) {
            return this.adaptStagesForComplexity(stages, rootElement);
        }
        
        return stages;
    }

    /**
     * Execute individual analysis stage
     */
    async executeStage(stage, rootElement, globalConfig) {
        const stageStartTime = performance.now();
        const stageConfig = { ...globalConfig, ...stage.config };
        
        try {
            let result = null;
            
            switch (stage.type) {
                case 'overview':
                    result = await this.executeOverviewStage(rootElement, stageConfig);
                    break;
                    
                case 'structure':
                    result = await this.executeStructureStage(rootElement, stageConfig);
                    break;
                    
                case 'interactive':
                    result = await this.executeInteractiveStage(rootElement, stageConfig);
                    break;
                    
                case 'content':
                    result = await this.executeContentStage(rootElement, stageConfig);
                    break;
                    
                case 'advanced':
                    result = await this.executeAdvancedStage(rootElement, stageConfig);
                    break;
                    
                default:
                    result = await this.executeCustomStage(stage, rootElement, stageConfig);
            }
            
            return {
                stage: stage,
                result: result,
                success: true,
                executionTime: performance.now() - stageStartTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`Stage ${stage.name} failed:`, error);
            
            return {
                stage: stage,
                result: null,
                success: false,
                error: error.message,
                executionTime: performance.now() - stageStartTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Execute overview stage
     */
    async executeOverviewStage(rootElement, config) {
        const quickScan = this.elementExtractor.extractElements(rootElement, {
            ...config,
            maxDepth: 3,
            maxElements: 50
        });
        
        const overview = {
            elementCount: quickScan.elements.length,
            mainStructure: this.analyzeMainStructure(quickScan.elements),
            pageType: this.inferPageType(quickScan.elements),
            complexity: this.estimateComplexity(rootElement),
            recommendations: this.generateStageRecommendations(quickScan.elements)
        };
        
        return overview;
    }

    /**
     * Execute structure stage
     */
    async executeStructureStage(rootElement, config) {
        const structuralData = this.elementExtractor.extractElements(rootElement, {
            ...config,
            includePosition: true,
            includeRelationships: true
        });
        
        const structure = {
            elements: structuralData.elements,
            hierarchy: this.analyzeHierarchy(structuralData.elements),
            layout: this.analyzeLayout(structuralData.elements),
            navigation: this.identifyNavigationElements(structuralData.elements)
        };
        
        return structure;
    }

    /**
     * Execute interactive stage
     */
    async executeInteractiveStage(rootElement, config) {
        // Filter for interactive elements
        const allElements = this.elementExtractor.extractElements(rootElement, config);
        const interactiveElements = allElements.elements.filter(el => 
            el.classification?.isInteractive || 
            DOMUtils.isInteractiveElement({ tagName: el.tagName, ...el })
        );
        
        const interactive = {
            elements: interactiveElements,
            forms: this.analyzeForms(interactiveElements),
            buttons: this.analyzeButtons(interactiveElements),
            links: this.analyzeLinks(interactiveElements),
            inputs: this.analyzeInputs(interactiveElements),
            accessibility: this.analyzeAccessibility(interactiveElements)
        };
        
        return interactive;
    }

    /**
     * Execute content stage
     */
    async executeContentStage(rootElement, config) {
        const contentData = this.elementExtractor.extractElements(rootElement, {
            ...config,
            includeTextContent: true,
            includeMediaData: true
        });
        
        const content = {
            textElements: this.analyzeTextContent(contentData.elements),
            mediaElements: this.analyzeMediaContent(contentData.elements),
            headings: this.analyzeHeadings(contentData.elements),
            lists: this.analyzeLists(contentData.elements),
            tables: this.analyzeTables(contentData.elements),
            semantic: this.analyzeSemanticStructure(contentData.elements)
        };
        
        return content;
    }

    /**
     * Execute advanced stage
     */
    async executeAdvancedStage(rootElement, config) {
        const fullData = this.elementExtractor.extractElements(rootElement, config);
        
        const advanced = {
            tree: config.buildTree ? this.treeBuilder.buildTree(rootElement, config) : null,
            patterns: config.detectPatterns ? this.detectPatterns(fullData.elements) : null,
            dependencies: config.analyzeDependencies ? this.analyzeDependencies(fullData.elements) : null,
            performance: this.analyzePerformanceImpact(fullData.elements),
            recommendations: this.generateAdvancedRecommendations(fullData.elements)
        };
        
        return advanced;
    }

    /**
     * Combine results from all stages
     */
    combineStageResults(stageResults, config) {
        const combined = {
            overview: null,
            structure: null,
            interactive: null,
            content: null,
            advanced: null,
            metadata: {
                stages: stageResults.length,
                successful: stageResults.filter(r => r.success).length,
                failed: stageResults.filter(r => !r.success).length,
                totalExecutionTime: stageResults.reduce((sum, r) => sum + r.executionTime, 0)
            }
        };
        
        // Extract results from each stage
        stageResults.forEach(stageResult => {
            if (stageResult.success && stageResult.result) {
                const stageType = stageResult.stage.type;
                combined[stageType] = stageResult.result;
            }
        });
        
        // Generate comprehensive analysis
        combined.analysis = this.generateComprehensiveAnalysis(combined);
        
        return combined;
    }

    /**
     * Generate comprehensive analysis from all stages
     */
    generateComprehensiveAnalysis(combinedResult) {
        const analysis = {
            summary: this.generateAnalysisSummary(combinedResult),
            insights: this.generateInsights(combinedResult),
            issues: this.identifyIssues(combinedResult),
            opportunities: this.identifyOpportunities(combinedResult),
            recommendations: this.generateFinalRecommendations(combinedResult)
        };
        
        return analysis;
    }

    /**
     * Adaptive staging based on DOM complexity
     */
    adaptStagesForComplexity(stages, rootElement) {
        const complexity = this.estimateComplexity(rootElement);
        
        if (complexity.level === 'low') {
            // Skip some stages for simple pages
            return stages.filter(stage => stage.priority === 'high');
        } else if (complexity.level === 'high') {
            // Add more granular stages for complex pages
            const extraStages = this.generateExtraStages(complexity);
            return [...stages, ...extraStages];
        }
        
        return stages;
    }

    /**
     * Control methods
     */
    
    pauseAnalysis() {
        this.analysisState.paused = true;
    }
    
    resumeAnalysis() {
        this.analysisState.paused = false;
    }
    
    cancelAnalysis() {
        this.analysisState.canceled = true;
        this.analysisState.running = false;
    }
    
    async waitForResume() {
        while (this.analysisState.paused && !this.analysisState.canceled) {
            await this.stageDelay(100);
        }
    }

    /**
     * Progress reporting
     */
    
    addProgressCallback(callback) {
        this.progressCallbacks.push(callback);
    }
    
    removeProgressCallback(callback) {
        const index = this.progressCallbacks.indexOf(callback);
        if (index > -1) {
            this.progressCallbacks.splice(index, 1);
        }
    }
    
    reportProgress(percentage, message) {
        if (this.options.reportProgress) {
            this.progressCallbacks.forEach(callback => {
                try {
                    callback({
                        percentage: Math.round(percentage),
                        message: message,
                        stage: this.currentStage,
                        totalStages: this.totalStages,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('Progress callback error:', error);
                }
            });
        }
    }

    /**
     * Utility methods
     */
    
    resetAnalysis() {
        this.currentStage = 0;
        this.totalStages = 0;
        this.stageResults = [];
        this.analysisState = {
            running: false,
            paused: false,
            completed: false,
            canceled: false
        };
    }
    
    async stageDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    estimateComplexity(rootElement) {
        try {
            const elementCount = rootElement.getElementsByTagName('*').length;
            const depthSample = this.sampleDepth(rootElement, 10);
            const interactiveCount = rootElement.querySelectorAll('button, input, select, textarea, a[href]').length;
            
            let level = 'low';
            let score = 0;
            
            if (elementCount > 500) score += 3;
            else if (elementCount > 200) score += 2;
            else if (elementCount > 50) score += 1;
            
            if (depthSample.maxDepth > 15) score += 2;
            else if (depthSample.maxDepth > 10) score += 1;
            
            if (interactiveCount > 50) score += 2;
            else if (interactiveCount > 20) score += 1;
            
            if (score >= 5) level = 'high';
            else if (score >= 3) level = 'medium';
            
            return {
                level: level,
                score: score,
                elementCount: elementCount,
                maxDepth: depthSample.maxDepth,
                interactiveCount: interactiveCount
            };
            
        } catch (error) {
            return { level: 'medium', score: 3, error: error.message };
        }
    }
    
    sampleDepth(element, sampleSize) {
        const depths = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
        let node;
        let count = 0;
        
        while ((node = walker.nextNode()) && count < sampleSize) {
            let depth = 0;
            let parent = node.parentElement;
            while (parent && parent !== element) {
                depth++;
                parent = parent.parentElement;
            }
            depths.push(depth);
            count++;
        }
        
        return {
            maxDepth: Math.max(...depths, 0),
            avgDepth: depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
            sample: depths
        };
    }
    
    initializeStageDefinitions() {
        return {
            overview: { timeout: 2000, retries: 2 },
            structure: { timeout: 5000, retries: 1 },
            interactive: { timeout: 3000, retries: 1 },
            content: { timeout: 4000, retries: 1 },
            advanced: { timeout: 10000, retries: 0 }
        };
    }

    /**
     * Analysis helper methods (simplified implementations)
     */
    
    analyzeMainStructure(elements) {
        return {
            hasHeader: elements.some(el => el.tagName === 'header' || el.tagName === 'nav'),
            hasMain: elements.some(el => el.tagName === 'main'),
            hasFooter: elements.some(el => el.tagName === 'footer'),
            hasSidebar: elements.some(el => el.tagName === 'aside'),
            sections: elements.filter(el => el.tagName === 'section').length
        };
    }
    
    inferPageType(elements) {
        const tagCounts = {};
        elements.forEach(el => {
            tagCounts[el.tagName] = (tagCounts[el.tagName] || 0) + 1;
        });
        
        if (tagCounts.form > 0) return 'form';
        if (tagCounts.article > 2) return 'blog';
        if (tagCounts.table > 0) return 'data';
        if (tagCounts.video || tagCounts.audio) return 'media';
        
        return 'general';
    }
    
    generateStageRecommendations(elements) {
        const recommendations = [];
        
        if (elements.length > 100) {
            recommendations.push('Consider enabling progressive loading for better performance');
        }
        
        const interactiveCount = elements.filter(el => el.classification?.isInteractive).length;
        if (interactiveCount > 20) {
            recommendations.push('High number of interactive elements - consider UX review');
        }
        
        return recommendations;
    }
    
    // Additional analysis methods would be implemented here
    analyzeHierarchy(elements) { return { depth: 0, branching: 0 }; }
    analyzeLayout(elements) { return { columns: 1, responsive: false }; }
    identifyNavigationElements(elements) { return []; }
    analyzeForms(elements) { return []; }
    analyzeButtons(elements) { return []; }
    analyzeLinks(elements) { return []; }
    analyzeInputs(elements) { return []; }
    analyzeAccessibility(elements) { return { score: 0, issues: [] }; }
    analyzeTextContent(elements) { return { wordCount: 0, readability: 0 }; }
    analyzeMediaContent(elements) { return { images: 0, videos: 0 }; }
    analyzeHeadings(elements) { return { structure: [], outline: [] }; }
    analyzeLists(elements) { return []; }
    analyzeTables(elements) { return []; }
    analyzeSemanticStructure(elements) { return { semantic: true, landmarks: [] }; }
    detectPatterns(elements) { return []; }
    analyzeDependencies(elements) { return { dependencies: [], cycles: [] }; }
    analyzePerformanceImpact(elements) { return { score: 100, issues: [] }; }
    generateAdvancedRecommendations(elements) { return []; }
    generateAnalysisSummary(result) { return 'Analysis completed successfully'; }
    generateInsights(result) { return []; }
    identifyIssues(result) { return []; }
    identifyOpportunities(result) { return []; }
    generateFinalRecommendations(result) { return []; }
    generateExtraStages(complexity) { return []; }
    executeCustomStage(stage, rootElement, config) { return {}; }
    
    /**
     * Get analysis state
     */
    getAnalysisState() {
        return {
            ...this.analysisState,
            currentStage: this.currentStage,
            totalStages: this.totalStages,
            progress: this.totalStages > 0 ? (this.currentStage / this.totalStages) * 100 : 0
        };
    }
    
    /**
     * Get stage results
     */
    getStageResults() {
        return [...this.stageResults];
    }
}

export default MultiStageAnalyzer;
