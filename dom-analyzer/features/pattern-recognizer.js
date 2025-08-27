/**
 * Pattern Recognizer - Template pattern matching and UI component recognition
 * Identifies recurring patterns, templates, and common UI components in DOM structures
 */

import { PERFORMANCE_LIMITS, UI_PATTERNS } from '../../shared/constants.js';
import { DOMUtils } from '../../shared/utils/dom-utils.js';
import { ValidationUtils } from '../../shared/utils/validation-utils.js';

export class PatternRecognizer {
    constructor(options = {}) {
        this.options = {
            minPatternOccurrences: options.minPatternOccurrences || 2,
            maxPatternDepth: options.maxPatternDepth || 5,
            similarityThreshold: options.similarityThreshold || 0.7,
            includeTextPatterns: options.includeTextPatterns !== false,
            includeStructuralPatterns: options.includeStructuralPatterns !== false,
            includeStylePatterns: options.includeStylePatterns !== false,
            detectUIComponents: options.detectUIComponents !== false,
            ...options
        };
        
        this.recognizedPatterns = new Map();
        this.uiComponents = new Map();
        this.patternMetrics = {
            totalPatterns: 0,
            structuralPatterns: 0,
            textPatterns: 0,
            stylePatterns: 0,
            uiComponents: 0,
            recognitionTime: 0
        };
        
        this.knownPatterns = this.initializeKnownPatterns();
    }

    /**
     * Recognize patterns in DOM elements
     */
    recognizePatterns(elements, config = {}) {
        const startTime = performance.now();
        const mergedConfig = { ...this.options, ...config };
        
        try {
            this.resetRecognition();
            
            // Group elements for pattern analysis
            const elementGroups = this.groupElementsForAnalysis(elements, mergedConfig);
            
            // Detect different types of patterns
            if (mergedConfig.includeStructuralPatterns) {
                this.detectStructuralPatterns(elementGroups, mergedConfig);
            }
            
            if (mergedConfig.includeTextPatterns) {
                this.detectTextPatterns(elements, mergedConfig);
            }
            
            if (mergedConfig.includeStylePatterns) {
                this.detectStylePatterns(elements, mergedConfig);
            }
            
            if (mergedConfig.detectUIComponents) {
                this.detectUIComponents(elements, mergedConfig);
            }
            
            // Detect custom patterns
            this.detectCustomPatterns(elements, mergedConfig);
            
            // Calculate pattern metrics
            this.calculatePatternMetrics();
            
            // Generate pattern analysis
            const analysis = this.generatePatternAnalysis();
            
            this.patternMetrics.recognitionTime = performance.now() - startTime;
            
            return {
                patterns: Object.fromEntries(this.recognizedPatterns),
                uiComponents: Object.fromEntries(this.uiComponents),
                metrics: { ...this.patternMetrics },
                analysis: analysis,
                metadata: {
                    recognitionTime: this.patternMetrics.recognitionTime,
                    configuration: mergedConfig,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Pattern recognition failed:', error);
            return {
                patterns: {},
                uiComponents: {},
                metrics: { error: error.message },
                analysis: { error: error.message },
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Group elements for pattern analysis
     */
    groupElementsForAnalysis(elements, config) {
        const groups = {
            byTagName: new Map(),
            byClassName: new Map(),
            byStructure: new Map(),
            byParent: new Map()
        };
        
        elements.forEach(element => {
            // Group by tag name
            const tagName = element.tagName?.toLowerCase();
            if (tagName) {
                if (!groups.byTagName.has(tagName)) {
                    groups.byTagName.set(tagName, []);
                }
                groups.byTagName.get(tagName).push(element);
            }
            
            // Group by class names
            if (element.classNames && element.classNames.length > 0) {
                element.classNames.forEach(className => {
                    if (!groups.byClassName.has(className)) {
                        groups.byClassName.set(className, []);
                    }
                    groups.byClassName.get(className).push(element);
                });
            }
            
            // Group by structural signature
            const signature = this.generateStructuralSignature(element);
            if (!groups.byStructure.has(signature)) {
                groups.byStructure.set(signature, []);
            }
            groups.byStructure.get(signature).push(element);
            
            // Group by parent
            const parentInfo = element.relationships?.parent;
            if (parentInfo) {
                const parentKey = `${parentInfo.tagName}.${parentInfo.className || 'no-class'}`;
                if (!groups.byParent.has(parentKey)) {
                    groups.byParent.set(parentKey, []);
                }
                groups.byParent.get(parentKey).push(element);
            }
        });
        
        return groups;
    }

    /**
     * Detect structural patterns
     */
    detectStructuralPatterns(elementGroups, config) {
        // Analyze structural signatures
        elementGroups.byStructure.forEach((elements, signature) => {
            if (elements.length >= config.minPatternOccurrences) {
                const pattern = this.analyzeStructuralPattern(elements, signature);
                if (pattern) {
                    this.recognizedPatterns.set(`structural:${signature}`, pattern);
                    this.patternMetrics.structuralPatterns++;
                }
            }
        });
        
        // Analyze parent-child patterns
        elementGroups.byParent.forEach((elements, parentKey) => {
            if (elements.length >= config.minPatternOccurrences) {
                const pattern = this.analyzeParentChildPattern(elements, parentKey);
                if (pattern) {
                    this.recognizedPatterns.set(`parent-child:${parentKey}`, pattern);
                    this.patternMetrics.structuralPatterns++;
                }
            }
        });
        
        // Analyze sibling patterns
        this.detectSiblingPatterns(elementGroups, config);
    }

    /**
     * Detect text patterns
     */
    detectTextPatterns(elements, config) {
        const textGroups = new Map();
        
        elements.forEach(element => {
            if (element.textContent && element.textContent.trim()) {
                const textPattern = this.extractTextPattern(element.textContent);
                if (textPattern) {
                    if (!textGroups.has(textPattern)) {
                        textGroups.set(textPattern, []);
                    }
                    textGroups.get(textPattern).push(element);
                }
            }
        });
        
        textGroups.forEach((elements, pattern) => {
            if (elements.length >= config.minPatternOccurrences) {
                const recognizedPattern = {
                    type: 'text',
                    pattern: pattern,
                    occurrences: elements.length,
                    elements: elements,
                    confidence: this.calculatePatternConfidence(elements, 'text'),
                    examples: elements.slice(0, 5).map(el => el.textContent?.substring(0, 100))
                };
                
                this.recognizedPatterns.set(`text:${pattern}`, recognizedPattern);
                this.patternMetrics.textPatterns++;
            }
        });
    }

    /**
     * Detect style patterns
     */
    detectStylePatterns(elements, config) {
        const styleGroups = new Map();
        
        elements.forEach(element => {
            if (element.computedStyles) {
                const styleSignature = this.generateStyleSignature(element.computedStyles);
                if (styleSignature) {
                    if (!styleGroups.has(styleSignature)) {
                        styleGroups.set(styleSignature, []);
                    }
                    styleGroups.get(styleSignature).push(element);
                }
            }
        });
        
        styleGroups.forEach((elements, signature) => {
            if (elements.length >= config.minPatternOccurrences) {
                const pattern = {
                    type: 'style',
                    signature: signature,
                    occurrences: elements.length,
                    elements: elements,
                    confidence: this.calculatePatternConfidence(elements, 'style'),
                    styleProperties: this.extractCommonStyleProperties(elements)
                };
                
                this.recognizedPatterns.set(`style:${signature}`, pattern);
                this.patternMetrics.stylePatterns++;
            }
        });
    }

    /**
     * Detect UI components
     */
    detectUIComponents(elements, config) {
        // Detect common UI components
        this.detectButtons(elements, config);
        this.detectForms(elements, config);
        this.detectCards(elements, config);
        this.detectModals(elements, config);
        this.detectNavigations(elements, config);
        this.detectLists(elements, config);
        this.detectTables(elements, config);
        this.detectMediaComponents(elements, config);
    }

    /**
     * Detect button patterns
     */
    detectButtons(elements, config) {
        const buttonElements = elements.filter(el => 
            el.tagName === 'button' || 
            (el.tagName === 'input' && ['button', 'submit', 'reset'].includes(el.formData?.type)) ||
            (el.tagName === 'a' && el.classification?.isInteractive) ||
            el.attributes?.role === 'button'
        );
        
        if (buttonElements.length >= config.minPatternOccurrences) {
            const buttonGroups = this.groupByVisualSimilarity(buttonElements);
            
            buttonGroups.forEach((group, groupId) => {
                if (group.length >= config.minPatternOccurrences) {
                    const component = {
                        type: 'button',
                        subtype: this.identifyButtonSubtype(group),
                        instances: group.length,
                        elements: group,
                        properties: this.extractCommonProperties(group),
                        variations: this.analyzeVariations(group)
                    };
                    
                    this.uiComponents.set(`button:${groupId}`, component);
                    this.patternMetrics.uiComponents++;
                }
            });
        }
    }

    /**
     * Detect form patterns
     */
    detectForms(elements, config) {
        const formElements = elements.filter(el => 
            el.tagName === 'form' || 
            el.classification?.isForm
        );
        
        formElements.forEach(formElement => {
            const formControls = elements.filter(el => 
                el.relationships?.parent && 
                this.isFormControl(el) &&
                this.isDescendantOf(el, formElement)
            );
            
            if (formControls.length > 0) {
                const component = {
                    type: 'form',
                    subtype: this.identifyFormSubtype(formElement, formControls),
                    instances: 1,
                    elements: [formElement, ...formControls],
                    structure: this.analyzeFormStructure(formElement, formControls),
                    validation: this.analyzeFormValidation(formControls)
                };
                
                this.uiComponents.set(`form:${formElement.id || formElement.xpath}`, component);
                this.patternMetrics.uiComponents++;
            }
        });
    }

    /**
     * Detect card patterns
     */
    detectCards(elements, config) {
        const cardCandidates = elements.filter(el => 
            ['div', 'article', 'section'].includes(el.tagName) &&
            this.hasCardCharacteristics(el)
        );
        
        const cardGroups = this.groupByStructuralSimilarity(cardCandidates);
        
        cardGroups.forEach((group, groupId) => {
            if (group.length >= config.minPatternOccurrences) {
                const component = {
                    type: 'card',
                    subtype: this.identifyCardSubtype(group),
                    instances: group.length,
                    elements: group,
                    structure: this.analyzeCardStructure(group),
                    content: this.analyzeCardContent(group)
                };
                
                this.uiComponents.set(`card:${groupId}`, component);
                this.patternMetrics.uiComponents++;
            }
        });
    }

    /**
     * Generate structural signature for element
     */
    generateStructuralSignature(element) {
        const parts = [
            element.tagName?.toLowerCase() || '',
            element.relationships?.childrenCount || 0,
            element.relationships?.hasChildren ? '1' : '0',
            element.classification?.category || '',
            this.getAttributeSignature(element.attributes)
        ];
        
        return parts.join('|');
    }

    /**
     * Generate style signature
     */
    generateStyleSignature(computedStyles) {
        const keyStyles = ['display', 'position', 'width', 'height', 'color', 'background-color', 'font-size'];
        const signature = keyStyles
            .map(prop => `${prop}:${computedStyles[prop] || 'auto'}`)
            .join('|');
        
        return this.hashString(signature);
    }

    /**
     * Extract text pattern from content
     */
    extractTextPattern(textContent) {
        const text = textContent.trim();
        
        // Email pattern
        if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
            return 'email';
        }
        
        // Phone pattern
        if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
            return 'phone';
        }
        
        // Date pattern
        if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text)) {
            return 'date';
        }
        
        // URL pattern
        if (/https?:\/\/[^\s]+/.test(text)) {
            return 'url';
        }
        
        // Number pattern
        if (/^\$?\d+(\.\d{2})?$/.test(text)) {
            return 'currency';
        }
        
        // Generic patterns based on length and structure
        if (text.length < 10 && /^[A-Z\s]+$/.test(text)) {
            return 'label';
        }
        
        if (text.length > 50) {
            return 'paragraph';
        }
        
        return null;
    }

    /**
     * Analyze structural pattern
     */
    analyzeStructuralPattern(elements, signature) {
        const commonProperties = this.extractCommonProperties(elements);
        const variations = this.analyzeVariations(elements);
        
        return {
            type: 'structural',
            signature: signature,
            occurrences: elements.length,
            elements: elements,
            confidence: this.calculatePatternConfidence(elements, 'structural'),
            commonProperties: commonProperties,
            variations: variations,
            description: this.generatePatternDescription(elements, 'structural')
        };
    }

    /**
     * Calculate pattern confidence
     */
    calculatePatternConfidence(elements, patternType) {
        if (elements.length < 2) return 0;
        
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let i = 0; i < elements.length - 1; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                totalSimilarity += this.calculateElementSimilarity(elements[i], elements[j], patternType);
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }

    /**
     * Calculate element similarity
     */
    calculateElementSimilarity(element1, element2, type) {
        let similarity = 0;
        let factors = 0;
        
        // Tag name similarity
        if (element1.tagName === element2.tagName) {
            similarity += 0.3;
        }
        factors += 0.3;
        
        // Class similarity
        const classSimilarity = this.calculateClassSimilarity(element1.classNames, element2.classNames);
        similarity += classSimilarity * 0.2;
        factors += 0.2;
        
        // Structure similarity
        const structuralSimilarity = this.calculateStructuralSimilarity(element1, element2);
        similarity += structuralSimilarity * 0.3;
        factors += 0.3;
        
        // Type-specific similarity
        if (type === 'text') {
            const textSimilarity = this.calculateTextSimilarity(element1.textContent, element2.textContent);
            similarity += textSimilarity * 0.2;
            factors += 0.2;
        } else if (type === 'style') {
            const styleSimilarity = this.calculateStyleSimilarity(element1.computedStyles, element2.computedStyles);
            similarity += styleSimilarity * 0.2;
            factors += 0.2;
        }
        
        return factors > 0 ? similarity / factors : 0;
    }

    /**
     * Helper methods
     */
    
    resetRecognition() {
        this.recognizedPatterns.clear();
        this.uiComponents.clear();
        this.patternMetrics = {
            totalPatterns: 0,
            structuralPatterns: 0,
            textPatterns: 0,
            stylePatterns: 0,
            uiComponents: 0,
            recognitionTime: 0
        };
    }
    
    calculatePatternMetrics() {
        this.patternMetrics.totalPatterns = this.recognizedPatterns.size;
    }
    
    initializeKnownPatterns() {
        return {
            buttons: ['button', '.btn', '.button', '[role="button"]'],
            navigation: ['nav', '.nav', '.navbar', '.menu'],
            cards: ['.card', '.panel', '.item'],
            forms: ['form', '.form', '.contact-form'],
            modals: ['.modal', '.dialog', '.popup'],
            lists: ['ul', 'ol', '.list']
        };
    }
    
    getAttributeSignature(attributes) {
        if (!attributes) return '';
        
        const importantAttrs = ['id', 'class', 'role', 'type', 'href'];
        return importantAttrs
            .filter(attr => attributes[attr])
            .map(attr => `${attr}=${attributes[attr]}`)
            .join(',');
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    calculateClassSimilarity(classes1, classes2) {
        if (!classes1 || !classes2) return 0;
        
        const set1 = new Set(classes1);
        const set2 = new Set(classes2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    
    calculateStructuralSimilarity(element1, element2) {
        let similarity = 0;
        let factors = 0;
        
        // Child count similarity
        const childCount1 = element1.relationships?.childrenCount || 0;
        const childCount2 = element2.relationships?.childrenCount || 0;
        const maxChildren = Math.max(childCount1, childCount2);
        if (maxChildren > 0) {
            similarity += 1 - Math.abs(childCount1 - childCount2) / maxChildren;
            factors += 1;
        }
        
        // Depth similarity
        const depthDiff = Math.abs((element1.depth || 0) - (element2.depth || 0));
        similarity += Math.max(0, 1 - depthDiff / 10);
        factors += 1;
        
        return factors > 0 ? similarity / factors : 0;
    }
    
    calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const clean1 = text1.trim().toLowerCase();
        const clean2 = text2.trim().toLowerCase();
        
        if (clean1 === clean2) return 1;
        
        // Simple Levenshtein distance
        const longer = clean1.length > clean2.length ? clean1 : clean2;
        const shorter = clean1.length > clean2.length ? clean2 : clean1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = this.calculateEditDistance(shorter, longer);
        return (longer.length - editDistance) / longer.length;
    }
    
    calculateStyleSimilarity(styles1, styles2) {
        if (!styles1 || !styles2) return 0;
        
        const keyProps = ['display', 'position', 'color', 'background-color', 'font-size'];
        let matches = 0;
        
        keyProps.forEach(prop => {
            if (styles1[prop] === styles2[prop]) {
                matches++;
            }
        });
        
        return matches / keyProps.length;
    }
    
    calculateEditDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }
        
        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[j][i] = matrix[j - 1][i - 1];
                } else {
                    matrix[j][i] = Math.min(
                        matrix[j - 1][i - 1] + 1,
                        matrix[j][i - 1] + 1,
                        matrix[j - 1][i] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    extractCommonProperties(elements) {
        const commonProps = {};
        
        if (elements.length === 0) return commonProps;
        
        const firstElement = elements[0];
        const propsToCheck = ['tagName', 'className', 'classification'];
        
        propsToCheck.forEach(prop => {
            const values = elements.map(el => el[prop]).filter(v => v);
            const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];
            
            if (uniqueValues.length === 1) {
                commonProps[prop] = JSON.parse(uniqueValues[0]);
            }
        });
        
        return commonProps;
    }
    
    analyzeVariations(elements) {
        const variations = {
            textContent: new Set(),
            classNames: new Set(),
            attributes: new Map()
        };
        
        elements.forEach(element => {
            if (element.textContent) {
                variations.textContent.add(element.textContent.trim());
            }
            
            if (element.classNames) {
                element.classNames.forEach(className => {
                    variations.classNames.add(className);
                });
            }
            
            if (element.attributes) {
                Object.keys(element.attributes).forEach(attr => {
                    if (!variations.attributes.has(attr)) {
                        variations.attributes.set(attr, new Set());
                    }
                    variations.attributes.get(attr).add(element.attributes[attr]);
                });
            }
        });
        
        return {
            textVariations: Array.from(variations.textContent),
            classVariations: Array.from(variations.classNames),
            attributeVariations: Object.fromEntries(
                Array.from(variations.attributes.entries()).map(([attr, values]) => [attr, Array.from(values)])
            )
        };
    }
    
    generatePatternDescription(elements, type) {
        const commonProps = this.extractCommonProperties(elements);
        const tagName = commonProps.tagName || 'mixed';
        const className = commonProps.className || 'no-class';
        
        return `${type} pattern: ${tagName} elements${className !== 'no-class' ? ` with class ${className}` : ''} (${elements.length} occurrences)`;
    }
    
    generatePatternAnalysis() {
        return {
            summary: this.generatePatternSummary(),
            recommendations: this.generatePatternRecommendations(),
            coverage: this.calculatePatternCoverage()
        };
    }
    
    generatePatternSummary() {
        const total = this.patternMetrics.totalPatterns;
        const components = this.patternMetrics.uiComponents;
        
        return `Found ${total} patterns and ${components} UI components. ` +
               `${this.patternMetrics.structuralPatterns} structural, ` +
               `${this.patternMetrics.textPatterns} text, and ` +
               `${this.patternMetrics.stylePatterns} style patterns detected.`;
    }
    
    generatePatternRecommendations() {
        const recommendations = [];
        
        if (this.patternMetrics.totalPatterns > 20) {
            recommendations.push({
                type: 'optimization',
                message: 'High number of patterns detected. Consider component-based architecture.',
                priority: 'medium'
            });
        }
        
        if (this.patternMetrics.uiComponents < 3) {
            recommendations.push({
                type: 'consistency',
                message: 'Few UI components detected. Consider standardizing UI patterns.',
                priority: 'low'
            });
        }
        
        return recommendations;
    }
    
    calculatePatternCoverage() {
        // This would calculate what percentage of elements are part of recognized patterns
        return {
            patterned: 0, // Placeholder
            unpatterned: 0, // Placeholder
            coverage: 0 // Placeholder
        };
    }

    // Additional UI component detection methods (simplified implementations)
    detectModals(elements, config) { /* Simplified */ }
    detectNavigations(elements, config) { /* Simplified */ }
    detectLists(elements, config) { /* Simplified */ }
    detectTables(elements, config) { /* Simplified */ }
    detectMediaComponents(elements, config) { /* Simplified */ }
    detectSiblingPatterns(elementGroups, config) { /* Simplified */ }
    detectCustomPatterns(elements, config) { /* Simplified */ }
    
    // UI component analysis methods
    groupByVisualSimilarity(elements) { return new Map(); }
    groupByStructuralSimilarity(elements) { return new Map(); }
    identifyButtonSubtype(group) { return 'generic'; }
    identifyFormSubtype(form, controls) { return 'generic'; }
    identifyCardSubtype(group) { return 'generic'; }
    hasCardCharacteristics(element) { return false; }
    isFormControl(element) { return element.classification?.isForm || false; }
    isDescendantOf(element, ancestor) { return false; }
    analyzeFormStructure(form, controls) { return {}; }
    analyzeFormValidation(controls) { return {}; }
    analyzeCardStructure(group) { return {}; }
    analyzeCardContent(group) { return {}; }
    analyzeParentChildPattern(elements, parentKey) { return null; }
    extractCommonStyleProperties(elements) { return {}; }
}

export default PatternRecognizer;
