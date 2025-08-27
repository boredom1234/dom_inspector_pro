/**
 * Diff Analyzer - DOM diffing functionality
 * Analyzes changes between DOM snapshots and tracks element modifications
 */

import { PERFORMANCE_LIMITS, DOM_SELECTORS } from '../../shared/constants.js';
import { DOMUtils } from '../../shared/utils/dom-utils.js';
import { ValidationUtils } from '../../shared/utils/validation-utils.js';

export class DiffAnalyzer {
    constructor(options = {}) {
        this.options = {
            trackTextChanges: options.trackTextChanges !== false,
            trackAttributeChanges: options.trackAttributeChanges !== false,
            trackStyleChanges: options.trackStyleChanges !== false,
            trackPositionChanges: options.trackPositionChanges !== false,
            ignoreWhitespace: options.ignoreWhitespace !== false,
            maxDiffElements: options.maxDiffElements || PERFORMANCE_LIMITS.MAX_ELEMENTS,
            diffTimeout: options.diffTimeout || 10000,
            ...options
        };
        
        this.previousSnapshot = null;
        this.currentSnapshot = null;
        this.diffResults = null;
        this.changeHistory = [];
    }

    /**
     * Analyze differences between two DOM snapshots
     */
    analyzeDifferences(previousSnapshot, currentSnapshot, config = {}) {
        const startTime = performance.now();
        const mergedConfig = { ...this.options, ...config };
        
        try {
            // Validate input snapshots
            if (!this.validateSnapshots(previousSnapshot, currentSnapshot)) {
                throw new Error('Invalid snapshots provided for diff analysis');
            }
            
            this.previousSnapshot = previousSnapshot;
            this.currentSnapshot = currentSnapshot;
            
            // Create element maps for efficient comparison
            const previousMap = this.createElementMap(previousSnapshot);
            const currentMap = this.createElementMap(currentSnapshot);
            
            // Analyze different types of changes
            const changes = {
                added: this.findAddedElements(previousMap, currentMap, mergedConfig),
                removed: this.findRemovedElements(previousMap, currentMap, mergedConfig),
                modified: this.findModifiedElements(previousMap, currentMap, mergedConfig),
                moved: this.findMovedElements(previousMap, currentMap, mergedConfig)
            };
            
            // Calculate diff statistics
            const statistics = this.calculateDiffStatistics(changes);
            
            // Generate change summary
            const summary = this.generateChangeSummary(changes, statistics);
            
            const diffResult = {
                changes: changes,
                statistics: statistics,
                summary: summary,
                metadata: {
                    previousTimestamp: previousSnapshot.metadata?.timestamp,
                    currentTimestamp: currentSnapshot.metadata?.timestamp,
                    diffTime: performance.now() - startTime,
                    configuration: mergedConfig
                }
            };
            
            this.diffResults = diffResult;
            this.addToChangeHistory(diffResult);
            
            return diffResult;
            
        } catch (error) {
            console.error('Diff analysis failed:', error);
            return {
                changes: { added: [], removed: [], modified: [], moved: [] },
                statistics: { totalChanges: 0, error: error.message },
                summary: `Diff analysis failed: ${error.message}`,
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Create element map for efficient lookup
     */
    createElementMap(snapshot) {
        const elementMap = new Map();
        
        if (!snapshot?.elements) return elementMap;
        
        snapshot.elements.forEach(element => {
            // Create multiple keys for different matching strategies
            const keys = this.generateElementKeys(element);
            
            keys.forEach(key => {
                if (!elementMap.has(key)) {
                    elementMap.set(key, []);
                }
                elementMap.get(key).push(element);
            });
        });
        
        return elementMap;
    }

    /**
     * Generate various keys for element identification
     */
    generateElementKeys(element) {
        const keys = [];
        
        // Primary key: xpath (most reliable)
        if (element.xpath) {
            keys.push(`xpath:${element.xpath}`);
        }
        
        // Secondary key: unique selector
        if (element.uniqueSelector) {
            keys.push(`selector:${element.uniqueSelector}`);
        }
        
        // Tertiary key: ID-based
        if (element.id) {
            keys.push(`id:${element.id}`);
        }
        
        // Fallback key: tag + position + content
        const contentHash = this.generateContentHash(element);
        keys.push(`content:${element.tagName}:${contentHash}`);
        
        return keys;
    }

    /**
     * Generate content-based hash for element
     */
    generateContentHash(element) {
        const content = [
            element.tagName || '',
            element.id || '',
            element.className || '',
            (element.textContent || '').substring(0, 100),
            element.attributes ? JSON.stringify(element.attributes).substring(0, 200) : ''
        ].join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash.toString();
    }

    /**
     * Find elements that were added
     */
    findAddedElements(previousMap, currentMap, config) {
        const addedElements = [];
        
        currentMap.forEach((elements, key) => {
            elements.forEach(element => {
                // Check if this element existed in previous snapshot
                const existed = this.elementExistsInMap(element, previousMap);
                
                if (!existed) {
                    addedElements.push({
                        element: element,
                        changeType: 'added',
                        timestamp: new Date().toISOString(),
                        metadata: this.generateChangeMetadata(element, null, 'added')
                    });
                }
            });
        });
        
        return addedElements;
    }

    /**
     * Find elements that were removed
     */
    findRemovedElements(previousMap, currentMap, config) {
        const removedElements = [];
        
        previousMap.forEach((elements, key) => {
            elements.forEach(element => {
                // Check if this element still exists in current snapshot
                const stillExists = this.elementExistsInMap(element, currentMap);
                
                if (!stillExists) {
                    removedElements.push({
                        element: element,
                        changeType: 'removed',
                        timestamp: new Date().toISOString(),
                        metadata: this.generateChangeMetadata(null, element, 'removed')
                    });
                }
            });
        });
        
        return removedElements;
    }

    /**
     * Find elements that were modified
     */
    findModifiedElements(previousMap, currentMap, config) {
        const modifiedElements = [];
        
        currentMap.forEach((currentElements, key) => {
            const previousElements = previousMap.get(key) || [];
            
            currentElements.forEach(currentElement => {
                // Find matching previous element
                const matchingPrevious = this.findBestMatch(currentElement, previousElements);
                
                if (matchingPrevious) {
                    const changes = this.detectElementChanges(matchingPrevious, currentElement, config);
                    
                    if (changes.length > 0) {
                        modifiedElements.push({
                            element: currentElement,
                            previousElement: matchingPrevious,
                            changeType: 'modified',
                            changes: changes,
                            timestamp: new Date().toISOString(),
                            metadata: this.generateChangeMetadata(currentElement, matchingPrevious, 'modified')
                        });
                    }
                }
            });
        });
        
        return modifiedElements;
    }

    /**
     * Find elements that were moved
     */
    findMovedElements(previousMap, currentMap, config) {
        const movedElements = [];
        
        // This is a simplified implementation - real move detection is complex
        currentMap.forEach((currentElements, key) => {
            const previousElements = previousMap.get(key) || [];
            
            currentElements.forEach(currentElement => {
                const matchingPrevious = this.findBestMatch(currentElement, previousElements);
                
                if (matchingPrevious && this.isElementMoved(matchingPrevious, currentElement)) {
                    movedElements.push({
                        element: currentElement,
                        previousElement: matchingPrevious,
                        changeType: 'moved',
                        previousPosition: matchingPrevious.position,
                        currentPosition: currentElement.position,
                        timestamp: new Date().toISOString(),
                        metadata: this.generateChangeMetadata(currentElement, matchingPrevious, 'moved')
                    });
                }
            });
        });
        
        return movedElements;
    }

    /**
     * Detect specific changes between two elements
     */
    detectElementChanges(previousElement, currentElement, config) {
        const changes = [];
        
        // Text content changes
        if (config.trackTextChanges && this.hasTextChanged(previousElement, currentElement)) {
            changes.push({
                type: 'textContent',
                previous: previousElement.textContent,
                current: currentElement.textContent,
                description: 'Text content changed'
            });
        }
        
        // Attribute changes
        if (config.trackAttributeChanges) {
            const attributeChanges = this.detectAttributeChanges(previousElement, currentElement);
            changes.push(...attributeChanges);
        }
        
        // Style changes
        if (config.trackStyleChanges && previousElement.computedStyles && currentElement.computedStyles) {
            const styleChanges = this.detectStyleChanges(previousElement, currentElement);
            changes.push(...styleChanges);
        }
        
        // Position changes
        if (config.trackPositionChanges && this.hasPositionChanged(previousElement, currentElement)) {
            changes.push({
                type: 'position',
                previous: previousElement.position,
                current: currentElement.position,
                description: 'Element position changed'
            });
        }
        
        // Class changes
        if (this.hasClassChanged(previousElement, currentElement)) {
            changes.push({
                type: 'className',
                previous: previousElement.className,
                current: currentElement.className,
                description: 'CSS classes changed'
            });
        }
        
        return changes;
    }

    /**
     * Detect attribute changes
     */
    detectAttributeChanges(previousElement, currentElement) {
        const changes = [];
        const prevAttrs = previousElement.attributes || {};
        const currAttrs = currentElement.attributes || {};
        
        // Find added/changed attributes
        Object.keys(currAttrs).forEach(attrName => {
            if (prevAttrs[attrName] !== currAttrs[attrName]) {
                changes.push({
                    type: 'attribute',
                    attribute: attrName,
                    previous: prevAttrs[attrName],
                    current: currAttrs[attrName],
                    description: `Attribute '${attrName}' ${prevAttrs[attrName] ? 'changed' : 'added'}`
                });
            }
        });
        
        // Find removed attributes
        Object.keys(prevAttrs).forEach(attrName => {
            if (!(attrName in currAttrs)) {
                changes.push({
                    type: 'attribute',
                    attribute: attrName,
                    previous: prevAttrs[attrName],
                    current: undefined,
                    description: `Attribute '${attrName}' removed`
                });
            }
        });
        
        return changes;
    }

    /**
     * Detect style changes
     */
    detectStyleChanges(previousElement, currentElement) {
        const changes = [];
        const prevStyles = previousElement.computedStyles || {};
        const currStyles = currentElement.computedStyles || {};
        
        // Key styles to monitor
        const keyStyles = ['display', 'visibility', 'opacity', 'position', 'width', 'height', 'color', 'background-color'];
        
        keyStyles.forEach(styleProp => {
            if (prevStyles[styleProp] !== currStyles[styleProp]) {
                changes.push({
                    type: 'style',
                    property: styleProp,
                    previous: prevStyles[styleProp],
                    current: currStyles[styleProp],
                    description: `Style '${styleProp}' changed`
                });
            }
        });
        
        return changes;
    }

    /**
     * Check if element exists in map
     */
    elementExistsInMap(element, elementMap) {
        const keys = this.generateElementKeys(element);
        
        return keys.some(key => {
            const candidates = elementMap.get(key) || [];
            return candidates.some(candidate => this.elementsMatch(element, candidate));
        });
    }

    /**
     * Find best matching element
     */
    findBestMatch(targetElement, candidateElements) {
        if (candidateElements.length === 0) return null;
        if (candidateElements.length === 1) return candidateElements[0];
        
        // Score each candidate
        const scored = candidateElements.map(candidate => ({
            element: candidate,
            score: this.calculateMatchScore(targetElement, candidate)
        }));
        
        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score);
        
        // Return best match if score is above threshold
        return scored[0].score > 0.5 ? scored[0].element : null;
    }

    /**
     * Calculate match score between elements
     */
    calculateMatchScore(element1, element2) {
        let score = 0;
        let factors = 0;
        
        // XPath match (highest weight)
        if (element1.xpath && element2.xpath) {
            score += element1.xpath === element2.xpath ? 5 : 0;
            factors += 5;
        }
        
        // ID match
        if (element1.id && element2.id) {
            score += element1.id === element2.id ? 3 : 0;
            factors += 3;
        }
        
        // Tag name match
        if (element1.tagName === element2.tagName) {
            score += 2;
        }
        factors += 2;
        
        // Class similarity
        const classSimilarity = this.calculateClassSimilarity(element1.className, element2.className);
        score += classSimilarity * 2;
        factors += 2;
        
        // Text content similarity
        const textSimilarity = this.calculateTextSimilarity(element1.textContent, element2.textContent);
        score += textSimilarity;
        factors += 1;
        
        return factors > 0 ? score / factors : 0;
    }

    /**
     * Calculate class similarity
     */
    calculateClassSimilarity(class1, class2) {
        if (!class1 && !class2) return 1;
        if (!class1 || !class2) return 0;
        
        const classes1 = new Set(class1.split(' ').filter(c => c.trim()));
        const classes2 = new Set(class2.split(' ').filter(c => c.trim()));
        
        const intersection = new Set([...classes1].filter(c => classes2.has(c)));
        const union = new Set([...classes1, ...classes2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Calculate text similarity
     */
    calculateTextSimilarity(text1, text2) {
        if (!text1 && !text2) return 1;
        if (!text1 || !text2) return 0;
        
        const clean1 = text1.trim().replace(/\s+/g, ' ');
        const clean2 = text2.trim().replace(/\s+/g, ' ');
        
        if (clean1 === clean2) return 1;
        
        // Simple character-based similarity
        const longer = clean1.length > clean2.length ? clean1 : clean2;
        const shorter = clean1.length > clean2.length ? clean2 : clean1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = this.calculateEditDistance(shorter, longer);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate simple edit distance
     */
    calculateEditDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Helper methods for change detection
     */
    
    elementsMatch(element1, element2) {
        return this.calculateMatchScore(element1, element2) > 0.8;
    }
    
    hasTextChanged(prev, curr) {
        const prevText = (prev.textContent || '').trim();
        const currText = (curr.textContent || '').trim();
        
        if (this.options.ignoreWhitespace) {
            return prevText.replace(/\s+/g, ' ') !== currText.replace(/\s+/g, ' ');
        }
        
        return prevText !== currText;
    }
    
    hasClassChanged(prev, curr) {
        return prev.className !== curr.className;
    }
    
    hasPositionChanged(prev, curr) {
        if (!prev.position || !curr.position) return false;
        
        return prev.position.x !== curr.position.x ||
               prev.position.y !== curr.position.y ||
               prev.position.width !== curr.position.width ||
               prev.position.height !== curr.position.height;
    }
    
    isElementMoved(prev, curr) {
        return this.hasPositionChanged(prev, curr) &&
               prev.depth !== curr.depth;
    }

    /**
     * Generate change metadata
     */
    generateChangeMetadata(currentElement, previousElement, changeType) {
        return {
            changeType: changeType,
            elementInfo: {
                tagName: currentElement?.tagName || previousElement?.tagName,
                id: currentElement?.id || previousElement?.id,
                className: currentElement?.className || previousElement?.className
            },
            timestamp: new Date().toISOString(),
            confidence: this.calculateMatchScore(currentElement, previousElement) || 1
        };
    }

    /**
     * Calculate diff statistics
     */
    calculateDiffStatistics(changes) {
        return {
            totalChanges: changes.added.length + changes.removed.length + changes.modified.length + changes.moved.length,
            added: changes.added.length,
            removed: changes.removed.length,
            modified: changes.modified.length,
            moved: changes.moved.length,
            changesByType: this.groupChangesByType(changes),
            impactLevel: this.calculateImpactLevel(changes)
        };
    }

    /**
     * Group changes by type
     */
    groupChangesByType(changes) {
        const groups = {};
        
        [...changes.added, ...changes.modified].forEach(change => {
            const tagName = change.element?.tagName || 'unknown';
            if (!groups[tagName]) groups[tagName] = 0;
            groups[tagName]++;
        });
        
        return groups;
    }

    /**
     * Calculate impact level
     */
    calculateImpactLevel(changes) {
        const total = changes.added.length + changes.removed.length + changes.modified.length + changes.moved.length;
        
        if (total === 0) return 'none';
        if (total <= 5) return 'low';
        if (total <= 20) return 'medium';
        if (total <= 50) return 'high';
        return 'critical';
    }

    /**
     * Generate change summary
     */
    generateChangeSummary(changes, statistics) {
        const parts = [];
        
        if (statistics.added > 0) parts.push(`${statistics.added} elements added`);
        if (statistics.removed > 0) parts.push(`${statistics.removed} elements removed`);
        if (statistics.modified > 0) parts.push(`${statistics.modified} elements modified`);
        if (statistics.moved > 0) parts.push(`${statistics.moved} elements moved`);
        
        if (parts.length === 0) {
            return 'No changes detected';
        }
        
        return parts.join(', ') + ` (${statistics.impactLevel} impact)`;
    }

    /**
     * Validate snapshots
     */
    validateSnapshots(snapshot1, snapshot2) {
        return snapshot1 && snapshot2 && 
               Array.isArray(snapshot1.elements) && 
               Array.isArray(snapshot2.elements);
    }

    /**
     * Add to change history
     */
    addToChangeHistory(diffResult) {
        this.changeHistory.unshift(diffResult);
        
        // Keep only last 100 entries
        if (this.changeHistory.length > 100) {
            this.changeHistory = this.changeHistory.slice(0, 100);
        }
    }

    /**
     * Get change history
     */
    getChangeHistory() {
        return [...this.changeHistory];
    }

    /**
     * Get latest diff results
     */
    getLatestDiff() {
        return this.diffResults;
    }

    /**
     * Clear change history
     */
    clearChangeHistory() {
        this.changeHistory = [];
    }

    /**
     * Export diff results
     */
    exportDiffResults(format = 'json') {
        if (!this.diffResults) return null;
        
        const exportData = {
            ...this.diffResults,
            exportTimestamp: new Date().toISOString(),
            format: format
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'csv':
                return this.convertToCSV(exportData);
            default:
                return exportData;
        }
    }

    /**
     * Convert diff results to CSV format
     */
    convertToCSV(diffResults) {
        const rows = [
            ['Type', 'Element', 'Change', 'Previous', 'Current', 'Timestamp']
        ];
        
        // Process all changes
        const allChanges = [
            ...diffResults.changes.added.map(c => ({ ...c, changeCategory: 'added' })),
            ...diffResults.changes.removed.map(c => ({ ...c, changeCategory: 'removed' })),
            ...diffResults.changes.modified.map(c => ({ ...c, changeCategory: 'modified' })),
            ...diffResults.changes.moved.map(c => ({ ...c, changeCategory: 'moved' }))
        ];
        
        allChanges.forEach(change => {
            const element = change.element || change.previousElement;
            rows.push([
                change.changeCategory,
                `${element?.tagName}${element?.id ? '#' + element.id : ''}${element?.className ? '.' + element.className.replace(/\s+/g, '.') : ''}`,
                change.changeType,
                change.previousElement ? JSON.stringify(change.previousElement).substring(0, 100) : '',
                change.element ? JSON.stringify(change.element).substring(0, 100) : '',
                change.timestamp
            ]);
        });
        
        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
}

export default DiffAnalyzer;
