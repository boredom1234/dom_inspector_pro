/**
 * Comprehensive Extractor - Advanced DOM analysis and extraction capabilities
 * Handles semantic analysis, accessibility auditing, and testing strategy generation
 */
class ComprehensiveExtractor {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Perform comprehensive extraction with all advanced features
     */
    performComprehensiveExtraction(domTree) {
        return {
            semanticStructure: this.extractSemanticStructure(domTree),
            navigationMap: this.buildNavigationMap(domTree),
            contentBlocks: this.identifyContentBlocks(domTree),
            interactionMap: this.buildInteractionMap(domTree),
            accessibilityAudit: this.performAccessibilityAudit(domTree),
            testabilityScore: this.calculateTestabilityScore(domTree),
            locatorStrategies: this.generateLocatorStrategies(domTree),
            riskAssessment: this.assessTestingRisks(domTree)
        };
    }

    /**
     * Extract semantic structure of the document
     */
    extractSemanticStructure(tree) {
        const structure = {
            headings: [],
            landmarks: [],
            sections: [],
            lists: [],
            forms: [],
            mediaElements: []
        };

        this.traverseForSemantics(tree, structure);
        return structure;
    }

    /**
     * Build navigation map of the page
     */
    buildNavigationMap(tree) {
        const navigationMap = {
            primaryNav: [],
            secondaryNav: [],
            breadcrumbs: [],
            pagination: [],
            inPageNavigation: []
        };

        this.traverseForNavigation(tree, navigationMap);
        return navigationMap;
    }

    /**
     * Identify distinct content blocks
     */
    identifyContentBlocks(tree) {
        const blocks = [];
        this.traverseForContentBlocks(tree, blocks);
        return blocks;
    }

    /**
     * Build interaction map showing user flows
     */
    buildInteractionMap(tree) {
        const interactionMap = {
            formElements: [],
            buttons: [],
            links: [],
            interactiveWidgets: [],
            keyboardTabbableElements: []
        };

        this.traverseForInteractions(tree, interactionMap);
        return interactionMap;
    }

    /**
     * Perform comprehensive accessibility audit
     */
    performAccessibilityAudit(tree) {
        const audit = {
            issues: [],
            warnings: [],
            score: 0,
            categories: {
                images: { score: 0, issues: [] },
                forms: { score: 0, issues: [] },
                headings: { score: 0, issues: [] },
                landmarks: { score: 0, issues: [] },
                keyboard: { score: 0, issues: [] },
                colorContrast: { score: 0, issues: [] }
            }
        };

        this.auditAccessibility(tree, audit);
        audit.score = this.calculateAccessibilityScore(audit);
        return audit;
    }

    /**
     * Calculate testability score based on element identifiers
     */
    calculateTestabilityScore(tree) {
        let totalElements = 0;
        let wellIdentifiedElements = 0;
        let testableElements = 0;

        this.traverseForTestability(tree, (element) => {
            totalElements++;
            
            if (this.hasStableIdentifiers(element)) {
                wellIdentifiedElements++;
            }
            
            if (element.metadata?.isInteractive) {
                testableElements++;
            }
        });

        const identifierScore = totalElements > 0 ? wellIdentifiedElements / totalElements : 0;
        const interactivityScore = totalElements > 0 ? testableElements / totalElements : 0;
        
        return {
            overall: Math.round((identifierScore * 0.6 + interactivityScore * 0.4) * 100),
            identifierCoverage: Math.round(identifierScore * 100),
            interactivityCoverage: Math.round(interactivityScore * 100),
            recommendations: this.generateTestabilityRecommendations(identifierScore, interactivityScore)
        };
    }

    /**
     * Generate locator strategies for testing frameworks
     */
    generateLocatorStrategies(tree) {
        const strategies = {
            preferred: [],
            alternative: [],
            unreliable: []
        };

        this.traverseForLocators(tree, strategies);
        return strategies;
    }

    /**
     * Assess testing risks and complexity
     */
    assessTestingRisks(tree) {
        const risks = {
            high: [],
            medium: [],
            low: [],
            complexity: {
                dynamicContent: 0,
                asyncOperations: 0,
                complexForms: 0,
                mediaElements: 0
            }
        };

        this.assessRisks(tree, risks);
        return risks;
    }

    // Helper methods for comprehensive extraction
    
    traverseForSemantics(node, structure) {
        if (!node) return;

        const tagName = node.tagName;
        
        // Collect headings
        if (tagName.match(/^h[1-6]$/)) {
            structure.headings.push({
                level: parseInt(tagName.substring(1)),
                text: node.text,
                xpath: node.xpath
            });
        }
        
        // Collect landmarks
        if (['header', 'nav', 'main', 'aside', 'footer'].includes(tagName) || 
            node.attributes?.role) {
            structure.landmarks.push({
                type: tagName,
                role: node.attributes?.role,
                xpath: node.xpath
            });
        }
        
        // Collect forms
        if (tagName === 'form') {
            structure.forms.push({
                action: node.attributes?.action,
                method: node.attributes?.method,
                xpath: node.xpath
            });
        }

        // Recursively process children
        (node.children || []).forEach(child => this.traverseForSemantics(child, structure));
    }

    traverseForNavigation(node, navigationMap) {
        if (!node) return;

        if (node.tagName === 'nav' || node.attributes?.role === 'navigation') {
            navigationMap.primaryNav.push({
                xpath: node.xpath,
                ariaLabel: node.attributes?.['aria-label'],
                links: this.extractLinksFromNode(node)
            });
        }

        (node.children || []).forEach(child => this.traverseForNavigation(child, navigationMap));
    }

    traverseForContentBlocks(node, blocks) {
        if (!node) return;

        if (['article', 'section', 'div'].includes(node.tagName)) {
            const hasSignificantContent = node.text && node.text.length > 50;
            if (hasSignificantContent) {
                blocks.push({
                    type: node.tagName,
                    xpath: node.xpath,
                    textLength: node.text?.length || 0,
                    hasImages: this.containsImages(node),
                    hasLinks: this.containsLinks(node)
                });
            }
        }

        (node.children || []).forEach(child => this.traverseForContentBlocks(child, blocks));
    }

    traverseForInteractions(node, interactionMap) {
        if (!node) return;

        if (node.metadata?.isInteractive) {
            const category = this.categorizeInteractiveElement(node);
            if (interactionMap[category]) {
                interactionMap[category].push({
                    tagName: node.tagName,
                    xpath: node.xpath,
                    text: node.text,
                    type: node.attributes?.type
                });
            }
        }

        (node.children || []).forEach(child => this.traverseForInteractions(child, interactionMap));
    }

    auditAccessibility(node, audit) {
        if (!node) return;

        // Check for images without alt text
        if (node.tagName === 'img' && !node.attributes?.alt) {
            audit.categories.images.issues.push({
                type: 'missing_alt',
                xpath: node.xpath,
                severity: 'high'
            });
        }

        // Check for form elements without labels
        if (this.isFormInput(node) && !this.hasAssociatedLabel(node)) {
            audit.categories.forms.issues.push({
                type: 'missing_label',
                xpath: node.xpath,
                severity: 'high'
            });
        }

        (node.children || []).forEach(child => this.auditAccessibility(child, audit));
    }

    traverseForTestability(node, callback) {
        if (!node) return;
        
        callback(node);
        (node.children || []).forEach(child => this.traverseForTestability(child, callback));
    }

    traverseForLocators(node, strategies) {
        if (!node) return;

        if (node.metadata?.isInteractive) {
            const locator = this.generateBestLocator(node);
            const category = this.categorizeLocatorQuality(locator, node);
            strategies[category].push(locator);
        }

        (node.children || []).forEach(child => this.traverseForLocators(child, strategies));
    }

    assessRisks(node, risks) {
        if (!node) return;

        // Assess dynamic content risks
        if (this.isDynamicElement(node)) {
            risks.complexity.dynamicContent++;
            risks.medium.push({
                type: 'dynamic_content',
                xpath: node.xpath,
                reason: 'Element may change dynamically'
            });
        }

        (node.children || []).forEach(child => this.assessRisks(child, risks));
    }

    // Utility helper methods

    hasStableIdentifiers(element) {
        const attrs = element.attributes || {};
        return !!(attrs['data-testid'] || attrs['data-test'] || attrs.id || attrs.name);
    }

    extractLinksFromNode(node) {
        const links = [];
        if (node.tagName === 'a') {
            links.push({ href: node.attributes?.href, text: node.text });
        }
        (node.children || []).forEach(child => {
            links.push(...this.extractLinksFromNode(child));
        });
        return links;
    }

    containsImages(node) {
        if (node.tagName === 'img') return true;
        return (node.children || []).some(child => this.containsImages(child));
    }

    containsLinks(node) {
        if (node.tagName === 'a') return true;
        return (node.children || []).some(child => this.containsLinks(child));
    }

    categorizeInteractiveElement(node) {
        const tagName = node.tagName;
        if (['input', 'select', 'textarea'].includes(tagName)) return 'formElements';
        if (tagName === 'button') return 'buttons';
        if (tagName === 'a') return 'links';
        return 'interactiveWidgets';
    }

    isFormInput(node) {
        return ['input', 'select', 'textarea'].includes(node.tagName);
    }

    hasAssociatedLabel(node) {
        const attrs = node.attributes || {};
        return !!(attrs['aria-label'] || attrs['aria-labelledby'] || 
                 (attrs.id && document.querySelector(`label[for="${attrs.id}"]`)));
    }

    generateBestLocator(node) {
        const attrs = node.attributes || {};
        
        if (attrs['data-testid']) return { type: 'testid', value: attrs['data-testid'], xpath: node.xpath };
        if (attrs.id && !/\d+$/.test(attrs.id)) return { type: 'id', value: attrs.id, xpath: node.xpath };
        if (attrs.name) return { type: 'name', value: attrs.name, xpath: node.xpath };
        
        return { type: 'xpath', value: node.xpath, xpath: node.xpath };
    }

    categorizeLocatorQuality(locator, node) {
        if (locator.type === 'testid') return 'preferred';
        if (locator.type === 'id' || locator.type === 'name') return 'alternative';
        return 'unreliable';
    }

    isDynamicElement(node) {
        const attrs = node.attributes || {};
        return !!(attrs.class?.includes('dynamic') || 
                 attrs.class?.includes('loading') || 
                 attrs['data-dynamic']);
    }

    calculateAccessibilityScore(audit) {
        const categories = Object.values(audit.categories);
        const totalIssues = categories.reduce((sum, cat) => sum + cat.issues.length, 0);
        return Math.max(0, 100 - (totalIssues * 5)); // Rough scoring
    }

    generateTestabilityRecommendations(identifierScore, interactivityScore) {
        const recommendations = [];
        
        if (identifierScore < 0.5) {
            recommendations.push('Add data-testid attributes to key interactive elements');
        }
        if (interactivityScore < 0.3) {
            recommendations.push('Consider adding more interactive testing points');
        }
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComprehensiveExtractor;
} else {
    window.ComprehensiveExtractor = ComprehensiveExtractor;
}
