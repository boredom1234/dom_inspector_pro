/**
 * Dependency Graph - Dependency tracking and relationship analysis
 * Analyzes element dependencies, relationships, and interaction patterns
 */

import { PERFORMANCE_LIMITS, DOM_SELECTORS } from '../../shared/constants.js';
import { DOMUtils } from '../../shared/utils/dom-utils.js';
import { ValidationUtils } from '../../shared/utils/validation-utils.js';

export class DependencyGraph {
    constructor(options = {}) {
        this.options = {
            trackFormDependencies: options.trackFormDependencies !== false,
            trackScriptDependencies: options.trackScriptDependencies !== false,
            trackStyleDependencies: options.trackStyleDependencies !== false,
            trackEventDependencies: options.trackEventDependencies !== false,
            trackDataDependencies: options.trackDataDependencies !== false,
            maxDependencyDepth: options.maxDependencyDepth || 10,
            includeWeakDependencies: options.includeWeakDependencies || false,
            ...options
        };
        
        this.dependencies = new Map();
        this.dependencyTypes = new Map();
        this.cyclicDependencies = [];
        this.dependencyMetrics = {
            totalNodes: 0,
            totalEdges: 0,
            strongDependencies: 0,
            weakDependencies: 0,
            cyclicChains: 0
        };
    }

    /**
     * Build dependency graph from DOM elements
     */
    buildDependencyGraph(elements, config = {}) {
        const startTime = performance.now();
        const mergedConfig = { ...this.options, ...config };
        
        try {
            this.resetGraph();
            
            // Create element map for efficient lookup
            const elementMap = this.createElementMap(elements);
            
            // Analyze different types of dependencies
            this.analyzeDependencies(elements, elementMap, mergedConfig);
            
            // Detect cyclic dependencies
            this.detectCyclicDependencies();
            
            // Calculate graph metrics
            this.calculateGraphMetrics();
            
            // Generate dependency analysis
            const analysis = this.generateDependencyAnalysis();
            
            return {
                dependencies: Object.fromEntries(this.dependencies),
                dependencyTypes: Object.fromEntries(this.dependencyTypes),
                cyclicDependencies: this.cyclicDependencies,
                metrics: { ...this.dependencyMetrics },
                analysis: analysis,
                metadata: {
                    buildTime: performance.now() - startTime,
                    configuration: mergedConfig,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Dependency graph building failed:', error);
            return {
                dependencies: {},
                dependencyTypes: {},
                cyclicDependencies: [],
                metrics: { error: error.message },
                analysis: { error: error.message },
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Analyze various types of dependencies
     */
    analyzeDependencies(elements, elementMap, config) {
        elements.forEach(element => {
            const elementId = this.getElementId(element);
            
            // Initialize dependency entry
            this.dependencies.set(elementId, {
                element: element,
                dependsOn: [],
                dependents: [],
                types: new Set()
            });
            
            // Analyze different dependency types
            if (config.trackFormDependencies) {
                this.analyzeFormDependencies(element, elementMap);
            }
            
            if (config.trackScriptDependencies) {
                this.analyzeScriptDependencies(element, elementMap);
            }
            
            if (config.trackStyleDependencies) {
                this.analyzeStyleDependencies(element, elementMap);
            }
            
            if (config.trackEventDependencies) {
                this.analyzeEventDependencies(element, elementMap);
            }
            
            if (config.trackDataDependencies) {
                this.analyzeDataDependencies(element, elementMap);
            }
            
            // Analyze structural dependencies
            this.analyzeStructuralDependencies(element, elementMap);
            
            // Analyze ARIA dependencies
            this.analyzeAriaDependencies(element, elementMap);
        });
    }

    /**
     * Analyze form-related dependencies
     */
    analyzeFormDependencies(element, elementMap) {
        const elementId = this.getElementId(element);
        
        // Form control to form relationships
        if (element.form) {
            const formId = this.getElementId(element.form);
            this.addDependency(elementId, formId, 'form-control', 'strong');
        }
        
        // Label relationships
        if (element.tagName?.toLowerCase() === 'label') {
            const forAttr = element.getAttribute('for');
            if (forAttr) {
                const targetElement = elementMap.get(`id:${forAttr}`)?.[0];
                if (targetElement) {
                    const targetId = this.getElementId(targetElement);
                    this.addDependency(elementId, targetId, 'label', 'strong');
                }
            }
        }
        
        // Fieldset grouping
        if (element.tagName?.toLowerCase() === 'fieldset') {
            const controls = element.querySelectorAll('input, select, textarea, button');
            controls.forEach(control => {
                const controlId = this.getElementId(control);
                this.addDependency(controlId, elementId, 'fieldset-group', 'medium');
            });
        }
        
        // Form validation dependencies
        if (element.hasAttribute && element.hasAttribute('required')) {
            const form = element.closest('form');
            if (form) {
                const formId = this.getElementId(form);
                this.addDependency(formId, elementId, 'validation', 'strong');
            }
        }
    }

    /**
     * Analyze script-related dependencies
     */
    analyzeScriptDependencies(element, elementMap) {
        const elementId = this.getElementId(element);
        
        // Script src dependencies
        if (element.tagName?.toLowerCase() === 'script' && element.src) {
            this.addDependency(elementId, element.src, 'script-src', 'strong');
        }
        
        // Event handler dependencies
        const eventAttributes = ['onclick', 'onchange', 'onsubmit', 'onload', 'onerror'];
        eventAttributes.forEach(attr => {
            if (element.hasAttribute && element.hasAttribute(attr)) {
                this.addDependency(elementId, `event:${attr}`, 'event-handler', 'medium');
            }
        });
        
        // Data attributes that might indicate script dependencies
        if (element.attributes) {
            Array.from(element.attributes).forEach(attr => {
                if (attr.name.startsWith('data-') && this.isScriptRelated(attr.name)) {
                    this.addDependency(elementId, `data:${attr.name}`, 'data-script', 'weak');
                }
            });
        }
    }

    /**
     * Analyze style-related dependencies
     */
    analyzeStyleDependencies(element, elementMap) {
        const elementId = this.getElementId(element);
        
        // CSS class dependencies
        if (element.className) {
            element.classList.forEach(className => {
                this.addDependency(elementId, `css:${className}`, 'css-class', 'medium');
            });
        }
        
        // Inline style dependencies
        if (element.style && element.style.length > 0) {
            this.addDependency(elementId, 'inline-style', 'inline-style', 'weak');
        }
        
        // Link stylesheet dependencies
        if (element.tagName?.toLowerCase() === 'link' && element.rel === 'stylesheet') {
            this.addDependency(elementId, element.href, 'stylesheet', 'strong');
        }
        
        // Style element dependencies
        if (element.tagName?.toLowerCase() === 'style') {
            this.addDependency(elementId, 'embedded-style', 'embedded-style', 'strong');
        }
    }

    /**
     * Analyze event-related dependencies
     */
    analyzeEventDependencies(element, elementMap) {
        const elementId = this.getElementId(element);
        
        // Focus/blur relationships
        if (DOMUtils.isInteractiveElement(element)) {
            // Elements that can receive focus depend on the focus system
            this.addDependency(elementId, 'focus-system', 'focus', 'medium');
        }
        
        // Form submission dependencies
        if (element.tagName?.toLowerCase() === 'button' || 
           (element.tagName?.toLowerCase() === 'input' && element.type === 'submit')) {
            const form = element.closest('form');
            if (form) {
                const formId = this.getElementId(form);
                this.addDependency(elementId, formId, 'form-submit', 'strong');
            }
        }
        
        // Tab order dependencies
        if (element.tabIndex >= 0) {
            this.addDependency(elementId, 'tab-system', 'tab-order', 'medium');
        }
    }

    /**
     * Analyze data-related dependencies
     */
    analyzeDataDependencies(element, elementMap) {
        const elementId = this.getElementId(element);
        
        // ID references in attributes
        const referenceAttributes = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns'];
        referenceAttributes.forEach(attr => {
            const value = element.getAttribute && element.getAttribute(attr);
            if (value) {
                const ids = value.split(/\s+/);
                ids.forEach(id => {
                    const referencedElement = elementMap.get(`id:${id}`)?.[0];
                    if (referencedElement) {
                        const referencedId = this.getElementId(referencedElement);
                        this.addDependency(elementId, referencedId, `aria-${attr}`, 'strong');
                    }
                });
            }
        });
        
        // Form data relationships
        if (element.name) {
            this.addDependency(elementId, `name:${element.name}`, 'form-data', 'medium');
        }
        
        // Template dependencies
        if (element.hasAttribute && element.hasAttribute('template')) {
            const templateId = element.getAttribute('template');
            const templateElement = elementMap.get(`id:${templateId}`)?.[0];
            if (templateElement) {
                const templateElementId = this.getElementId(templateElement);
                this.addDependency(elementId, templateElementId, 'template', 'strong');
            }
        }
    }

    /**
     * Analyze structural dependencies
     */
    analyzeStructuralDependencies(element, elementMap) {
        const elementId = this.getElementId(element);
        
        // Parent-child structural dependencies
        if (element.parentElement) {
            const parentId = this.getElementId(element.parentElement);
            this.addDependency(elementId, parentId, 'parent-child', 'strong');
        }
        
        // List item dependencies
        if (element.tagName?.toLowerCase() === 'li') {
            const list = element.closest('ul, ol');
            if (list) {
                const listId = this.getElementId(list);
                this.addDependency(elementId, listId, 'list-item', 'strong');
            }
        }
        
        // Table cell dependencies
        if (element.tagName?.toLowerCase() === 'td' || element.tagName?.toLowerCase() === 'th') {
            const row = element.closest('tr');
            if (row) {
                const rowId = this.getElementId(row);
                this.addDependency(elementId, rowId, 'table-cell', 'strong');
            }
        }
        
        // Option dependencies
        if (element.tagName?.toLowerCase() === 'option') {
            const select = element.closest('select');
            if (select) {
                const selectId = this.getElementId(select);
                this.addDependency(elementId, selectId, 'select-option', 'strong');
            }
        }
    }

    /**
     * Analyze ARIA-related dependencies
     */
    analyzeAriaDependencies(element, elementMap) {
        const elementId = this.getElementId(element);
        
        // ARIA role dependencies
        const role = element.getAttribute && element.getAttribute('role');
        if (role) {
            this.addDependency(elementId, `role:${role}`, 'aria-role', 'medium');
        }
        
        // ARIA state dependencies
        const ariaStates = ['aria-expanded', 'aria-selected', 'aria-checked', 'aria-pressed'];
        ariaStates.forEach(state => {
            if (element.hasAttribute && element.hasAttribute(state)) {
                this.addDependency(elementId, `state:${state}`, 'aria-state', 'weak');
            }
        });
        
        // ARIA live regions
        const ariaLive = element.getAttribute && element.getAttribute('aria-live');
        if (ariaLive) {
            this.addDependency(elementId, `live:${ariaLive}`, 'aria-live', 'medium');
        }
    }

    /**
     * Add dependency relationship
     */
    addDependency(fromId, toId, type, strength = 'medium') {
        // Add forward dependency
        if (!this.dependencies.has(fromId)) {
            this.dependencies.set(fromId, {
                element: null,
                dependsOn: [],
                dependents: [],
                types: new Set()
            });
        }
        
        const fromDep = this.dependencies.get(fromId);
        fromDep.dependsOn.push({ id: toId, type: type, strength: strength });
        fromDep.types.add(type);
        
        // Add reverse dependency if toId is an element
        if (this.dependencies.has(toId)) {
            const toDep = this.dependencies.get(toId);
            toDep.dependents.push({ id: fromId, type: type, strength: strength });
        }
        
        // Track dependency type
        if (!this.dependencyTypes.has(type)) {
            this.dependencyTypes.set(type, {
                count: 0,
                strength: strength,
                examples: []
            });
        }
        
        const typeInfo = this.dependencyTypes.get(type);
        typeInfo.count++;
        if (typeInfo.examples.length < 5) {
            typeInfo.examples.push({ from: fromId, to: toId });
        }
    }

    /**
     * Create element map for efficient lookup
     */
    createElementMap(elements) {
        const elementMap = new Map();
        
        elements.forEach(element => {
            // Index by ID
            if (element.id) {
                if (!elementMap.has(`id:${element.id}`)) {
                    elementMap.set(`id:${element.id}`, []);
                }
                elementMap.get(`id:${element.id}`).push(element);
            }
            
            // Index by name
            if (element.name) {
                if (!elementMap.has(`name:${element.name}`)) {
                    elementMap.set(`name:${element.name}`, []);
                }
                elementMap.get(`name:${element.name}`).push(element);
            }
            
            // Index by class
            if (element.className) {
                element.classList?.forEach(className => {
                    if (!elementMap.has(`class:${className}`)) {
                        elementMap.set(`class:${className}`, []);
                    }
                    elementMap.get(`class:${className}`).push(element);
                });
            }
        });
        
        return elementMap;
    }

    /**
     * Get unique element identifier
     */
    getElementId(element) {
        if (typeof element === 'string') return element;
        if (!element) return 'unknown';
        
        if (element.id) return `id:${element.id}`;
        if (element.xpath) return `xpath:${element.xpath}`;
        if (element.uniqueSelector) return `selector:${element.uniqueSelector}`;
        
        // Generate fallback ID
        const tagName = element.tagName?.toLowerCase() || 'unknown';
        const className = element.className ? `.${element.className.replace(/\s+/g, '.')}` : '';
        const textContent = element.textContent ? element.textContent.substring(0, 20) : '';
        
        return `${tagName}${className}:${textContent}`;
    }

    /**
     * Detect cyclic dependencies
     */
    detectCyclicDependencies() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];
        
        this.dependencies.forEach((depInfo, nodeId) => {
            if (!visited.has(nodeId)) {
                this.detectCyclicDependenciesHelper(nodeId, visited, recursionStack, [], cycles);
            }
        });
        
        this.cyclicDependencies = cycles;
        this.dependencyMetrics.cyclicChains = cycles.length;
    }

    /**
     * Helper for cyclic dependency detection
     */
    detectCyclicDependenciesHelper(nodeId, visited, recursionStack, path, cycles) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);
        
        const depInfo = this.dependencies.get(nodeId);
        if (depInfo && depInfo.dependsOn) {
            depInfo.dependsOn.forEach(dependency => {
                const depId = dependency.id;
                
                if (!visited.has(depId)) {
                    this.detectCyclicDependenciesHelper(depId, visited, recursionStack, [...path], cycles);
                } else if (recursionStack.has(depId)) {
                    // Found cycle
                    const cycleStartIndex = path.indexOf(depId);
                    const cycle = path.slice(cycleStartIndex);
                    cycle.push(depId); // Complete the cycle
                    
                    cycles.push({
                        cycle: cycle,
                        length: cycle.length - 1,
                        strength: dependency.strength,
                        type: dependency.type
                    });
                }
            });
        }
        
        recursionStack.delete(nodeId);
    }

    /**
     * Calculate graph metrics
     */
    calculateGraphMetrics() {
        let totalEdges = 0;
        let strongDependencies = 0;
        let weakDependencies = 0;
        
        this.dependencies.forEach(depInfo => {
            if (depInfo.dependsOn) {
                totalEdges += depInfo.dependsOn.length;
                
                depInfo.dependsOn.forEach(dep => {
                    if (dep.strength === 'strong') {
                        strongDependencies++;
                    } else if (dep.strength === 'weak') {
                        weakDependencies++;
                    }
                });
            }
        });
        
        this.dependencyMetrics = {
            totalNodes: this.dependencies.size,
            totalEdges: totalEdges,
            strongDependencies: strongDependencies,
            weakDependencies: weakDependencies,
            cyclicChains: this.cyclicDependencies.length,
            averageDependencies: this.dependencies.size > 0 ? totalEdges / this.dependencies.size : 0,
            dependencyTypes: this.dependencyTypes.size
        };
    }

    /**
     * Generate dependency analysis
     */
    generateDependencyAnalysis() {
        const analysis = {
            complexity: this.analyzeComplexity(),
            criticalNodes: this.findCriticalNodes(),
            isolatedNodes: this.findIsolatedNodes(),
            dependencyChains: this.findLongestDependencyChains(),
            typeDistribution: this.analyzeDependencyTypeDistribution(),
            recommendations: this.generateRecommendations()
        };
        
        return analysis;
    }

    /**
     * Analyze graph complexity
     */
    analyzeComplexity() {
        const metrics = this.dependencyMetrics;
        let complexity = 'low';
        
        if (metrics.totalNodes > 100 || metrics.averageDependencies > 5) {
            complexity = 'high';
        } else if (metrics.totalNodes > 50 || metrics.averageDependencies > 3) {
            complexity = 'medium';
        }
        
        return {
            level: complexity,
            reasons: this.getComplexityReasons(),
            score: this.calculateComplexityScore()
        };
    }

    /**
     * Find critical nodes (high dependency count)
     */
    findCriticalNodes() {
        const critical = [];
        
        this.dependencies.forEach((depInfo, nodeId) => {
            const totalDependencies = (depInfo.dependsOn?.length || 0) + (depInfo.dependents?.length || 0);
            
            if (totalDependencies > 5) {
                critical.push({
                    id: nodeId,
                    totalDependencies: totalDependencies,
                    dependsOn: depInfo.dependsOn?.length || 0,
                    dependents: depInfo.dependents?.length || 0,
                    element: depInfo.element
                });
            }
        });
        
        return critical.sort((a, b) => b.totalDependencies - a.totalDependencies);
    }

    /**
     * Find isolated nodes (no dependencies)
     */
    findIsolatedNodes() {
        const isolated = [];
        
        this.dependencies.forEach((depInfo, nodeId) => {
            const totalDependencies = (depInfo.dependsOn?.length || 0) + (depInfo.dependents?.length || 0);
            
            if (totalDependencies === 0) {
                isolated.push({
                    id: nodeId,
                    element: depInfo.element
                });
            }
        });
        
        return isolated;
    }

    /**
     * Find longest dependency chains
     */
    findLongestDependencyChains() {
        const chains = [];
        const visited = new Set();
        
        this.dependencies.forEach((depInfo, nodeId) => {
            if (!visited.has(nodeId)) {
                const chain = this.traceDependencyChain(nodeId, visited);
                if (chain.length > 2) {
                    chains.push(chain);
                }
            }
        });
        
        return chains.sort((a, b) => b.length - a.length).slice(0, 10);
    }

    /**
     * Trace dependency chain from a node
     */
    traceDependencyChain(startNodeId, visited) {
        const chain = [startNodeId];
        visited.add(startNodeId);
        
        const depInfo = this.dependencies.get(startNodeId);
        if (depInfo && depInfo.dependsOn && depInfo.dependsOn.length > 0) {
            // Follow the first strong dependency
            const strongDep = depInfo.dependsOn.find(dep => dep.strength === 'strong');
            const nextDep = strongDep || depInfo.dependsOn[0];
            
            if (!visited.has(nextDep.id)) {
                const subChain = this.traceDependencyChain(nextDep.id, visited);
                chain.push(...subChain);
            }
        }
        
        return chain;
    }

    /**
     * Analyze dependency type distribution
     */
    analyzeDependencyTypeDistribution() {
        const distribution = {};
        
        this.dependencyTypes.forEach((typeInfo, type) => {
            distribution[type] = {
                count: typeInfo.count,
                percentage: (typeInfo.count / this.dependencyMetrics.totalEdges * 100).toFixed(1),
                strength: typeInfo.strength
            };
        });
        
        return distribution;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        // High complexity warning
        if (this.dependencyMetrics.averageDependencies > 5) {
            recommendations.push({
                type: 'warning',
                message: 'High average dependency count detected. Consider simplifying element relationships.',
                impact: 'high'
            });
        }
        
        // Cyclic dependencies
        if (this.cyclicDependencies.length > 0) {
            recommendations.push({
                type: 'error',
                message: `${this.cyclicDependencies.length} cyclic dependencies detected. These may cause issues.`,
                impact: 'high'
            });
        }
        
        // Too many isolated nodes
        const isolatedCount = this.findIsolatedNodes().length;
        if (isolatedCount > this.dependencyMetrics.totalNodes * 0.3) {
            recommendations.push({
                type: 'info',
                message: 'Many isolated elements detected. Consider if these are truly independent.',
                impact: 'low'
            });
        }
        
        return recommendations;
    }

    /**
     * Helper methods
     */
    
    resetGraph() {
        this.dependencies.clear();
        this.dependencyTypes.clear();
        this.cyclicDependencies = [];
        this.dependencyMetrics = {
            totalNodes: 0,
            totalEdges: 0,
            strongDependencies: 0,
            weakDependencies: 0,
            cyclicChains: 0
        };
    }
    
    isScriptRelated(attributeName) {
        const scriptAttributes = ['data-target', 'data-toggle', 'data-action', 'data-handler', 'data-bind'];
        return scriptAttributes.some(attr => attributeName.includes(attr));
    }
    
    getComplexityReasons() {
        const reasons = [];
        const metrics = this.dependencyMetrics;
        
        if (metrics.totalNodes > 100) reasons.push('High node count');
        if (metrics.averageDependencies > 5) reasons.push('High average dependencies');
        if (metrics.cyclicChains > 0) reasons.push('Cyclic dependencies present');
        if (metrics.dependencyTypes > 10) reasons.push('Many dependency types');
        
        return reasons;
    }
    
    calculateComplexityScore() {
        const metrics = this.dependencyMetrics;
        let score = 0;
        
        score += Math.min(metrics.totalNodes / 10, 10);
        score += Math.min(metrics.averageDependencies * 2, 10);
        score += metrics.cyclicChains * 2;
        score += Math.min(metrics.dependencyTypes, 5);
        
        return Math.min(score, 100);
    }

    /**
     * Export dependency graph
     */
    exportGraph(format = 'json') {
        const graphData = {
            dependencies: Object.fromEntries(this.dependencies),
            dependencyTypes: Object.fromEntries(this.dependencyTypes),
            cyclicDependencies: this.cyclicDependencies,
            metrics: this.dependencyMetrics,
            exportTimestamp: new Date().toISOString()
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(graphData, null, 2);
            case 'dot':
                return this.convertToDotFormat(graphData);
            case 'csv':
                return this.convertToCSVFormat(graphData);
            default:
                return graphData;
        }
    }

    /**
     * Convert to DOT format for Graphviz
     */
    convertToDotFormat(graphData) {
        const lines = ['digraph DependencyGraph {'];
        
        // Add nodes
        Object.keys(graphData.dependencies).forEach(nodeId => {
            const label = nodeId.replace(/['"]/g, '\\"');
            lines.push(`  "${nodeId}" [label="${label}"];`);
        });
        
        // Add edges
        Object.entries(graphData.dependencies).forEach(([nodeId, depInfo]) => {
            if (depInfo.dependsOn) {
                depInfo.dependsOn.forEach(dep => {
                    const color = dep.strength === 'strong' ? 'red' : dep.strength === 'weak' ? 'gray' : 'blue';
                    lines.push(`  "${nodeId}" -> "${dep.id}" [label="${dep.type}" color="${color}"];`);
                });
            }
        });
        
        lines.push('}');
        return lines.join('\n');
    }

    /**
     * Convert to CSV format
     */
    convertToCSVFormat(graphData) {
        const rows = [['From', 'To', 'Type', 'Strength']];
        
        Object.entries(graphData.dependencies).forEach(([nodeId, depInfo]) => {
            if (depInfo.dependsOn) {
                depInfo.dependsOn.forEach(dep => {
                    rows.push([nodeId, dep.id, dep.type, dep.strength]);
                });
            }
        });
        
        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
}

export default DependencyGraph;
