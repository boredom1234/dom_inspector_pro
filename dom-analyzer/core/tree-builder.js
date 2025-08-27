/**
 * Tree Builder - DOM tree construction and hierarchical analysis
 * Builds comprehensive DOM tree structures with relationships and metadata
 */

import { PERFORMANCE_LIMITS, DOM_SELECTORS } from '../../shared/constants.js';
import { DOMUtils } from '../../shared/utils/dom-utils.js';
import { ValidationUtils } from '../../shared/utils/validation-utils.js';
import { ElementExtractor } from './element-extractor.js';

export class TreeBuilder {
    constructor(options = {}) {
        this.options = {
            maxDepth: options.maxDepth || PERFORMANCE_LIMITS.MAX_DEPTH,
            maxNodes: options.maxNodes || PERFORMANCE_LIMITS.MAX_ELEMENTS,
            includeTextNodes: options.includeTextNodes || false,
            includeCommentNodes: options.includeCommentNodes || false,
            preserveWhitespace: options.preserveWhitespace || false,
            buildRelationshipMap: options.buildRelationshipMap !== false,
            generateNodeIds: options.generateNodeIds !== false,
            trackNodeMetrics: options.trackNodeMetrics !== false,
            ...options
        };
        
        this.nodeCounter = 0;
        this.nodeMap = new Map();
        this.relationshipMap = new Map();
        this.treeMetrics = {
            totalNodes: 0,
            elementNodes: 0,
            textNodes: 0,
            commentNodes: 0,
            maxDepth: 0,
            buildTime: 0
        };
        
        this.elementExtractor = new ElementExtractor(options);
    }

    /**
     * Build comprehensive DOM tree from root element
     */
    buildTree(rootElement = document.body, config = {}) {
        const startTime = performance.now();
        this.resetCounters();
        
        const mergedConfig = { ...this.options, ...config };
        
        try {
            // Validate root element
            if (!rootElement || rootElement.nodeType !== Node.ELEMENT_NODE) {
                throw new Error('Invalid root element provided');
            }

            // Build tree structure recursively
            const treeRoot = this.buildNodeRecursive(rootElement, null, 0, mergedConfig);
            
            // Post-process tree
            const processedTree = this.postProcessTree(treeRoot, mergedConfig);
            
            // Calculate metrics
            this.treeMetrics.buildTime = performance.now() - startTime;
            this.treeMetrics.maxDepth = this.calculateMaxDepth(processedTree);
            
            return {
                tree: processedTree,
                nodeMap: this.options.buildRelationshipMap ? Object.fromEntries(this.nodeMap) : null,
                relationshipMap: this.options.buildRelationshipMap ? Object.fromEntries(this.relationshipMap) : null,
                metrics: { ...this.treeMetrics },
                metadata: this.generateTreeMetadata(mergedConfig)
            };
            
        } catch (error) {
            console.error('Tree building failed:', error);
            return {
                tree: null,
                nodeMap: null,
                relationshipMap: null,
                metrics: { ...this.treeMetrics, error: error.message },
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Build tree node recursively
     */
    buildNodeRecursive(element, parent, depth, config) {
        // Check limits
        if (this.shouldStopBuilding(depth, config)) {
            return null;
        }

        // Create tree node
        const node = this.createTreeNode(element, parent, depth, config);
        
        if (!node) return null;
        
        // Track node in maps
        if (config.buildRelationshipMap) {
            this.trackNodeInMaps(node, parent);
        }
        
        // Process child nodes
        const children = [];
        
        if (element.childNodes && depth < config.maxDepth) {
            for (const child of element.childNodes) {
                const childNode = this.processChildNode(child, node, depth + 1, config);
                if (childNode) {
                    children.push(childNode);
                }
            }
        }
        
        node.children = children;
        node.childCount = children.length;
        
        return node;
    }

    /**
     * Create tree node from DOM element
     */
    createTreeNode(element, parent, depth, config) {
        try {
            const nodeId = config.generateNodeIds ? `node_${++this.nodeCounter}` : null;
            
            // Extract element data using ElementExtractor
            const elementData = this.elementExtractor.extractElementData(element, depth, config);
            
            if (!elementData) return null;
            
            // Create tree node structure
            const treeNode = {
                id: nodeId,
                nodeType: element.nodeType,
                nodeName: element.nodeName,
                depth: depth,
                
                // Element data
                ...elementData,
                
                // Tree-specific properties
                parent: parent ? {
                    id: parent.id,
                    tagName: parent.tagName,
                    depth: parent.depth
                } : null,
                
                children: [],
                childCount: 0,
                
                // Node metrics
                metrics: config.trackNodeMetrics ? this.calculateNodeMetrics(element, depth) : null,
                
                // Tree path
                treePath: this.generateTreePath(element, parent),
                
                // Sibling information
                siblingInfo: this.extractSiblingInfo(element, parent)
            };
            
            // Update counters
            this.treeMetrics.totalNodes++;
            this.treeMetrics.elementNodes++;
            
            return treeNode;
            
        } catch (error) {
            console.warn('Failed to create tree node for element:', element, error);
            return null;
        }
    }

    /**
     * Process child node (element, text, or comment)
     */
    processChildNode(childElement, parentNode, depth, config) {
        switch (childElement.nodeType) {
            case Node.ELEMENT_NODE:
                return this.buildNodeRecursive(childElement, parentNode, depth, config);
                
            case Node.TEXT_NODE:
                if (config.includeTextNodes) {
                    return this.createTextNode(childElement, parentNode, depth, config);
                }
                break;
                
            case Node.COMMENT_NODE:
                if (config.includeCommentNodes) {
                    return this.createCommentNode(childElement, parentNode, depth, config);
                }
                break;
                
            default:
                // Skip other node types
                break;
        }
        
        return null;
    }

    /**
     * Create text node
     */
    createTextNode(textNode, parent, depth, config) {
        const textContent = textNode.textContent || '';
        
        // Skip empty or whitespace-only text nodes unless preserveWhitespace is true
        if (!config.preserveWhitespace && !textContent.trim()) {
            return null;
        }
        
        const nodeId = config.generateNodeIds ? `text_${++this.nodeCounter}` : null;
        
        const treeNode = {
            id: nodeId,
            nodeType: Node.TEXT_NODE,
            nodeName: '#text',
            depth: depth,
            textContent: textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent,
            fullTextContent: textContent,
            parent: parent ? {
                id: parent.id,
                tagName: parent.tagName,
                depth: parent.depth
            } : null,
            children: [],
            childCount: 0,
            treePath: parent ? `${parent.treePath}/text()` : '/text()'
        };
        
        this.treeMetrics.totalNodes++;
        this.treeMetrics.textNodes++;
        
        return treeNode;
    }

    /**
     * Create comment node
     */
    createCommentNode(commentNode, parent, depth, config) {
        const commentContent = commentNode.textContent || '';
        const nodeId = config.generateNodeIds ? `comment_${++this.nodeCounter}` : null;
        
        const treeNode = {
            id: nodeId,
            nodeType: Node.COMMENT_NODE,
            nodeName: '#comment',
            depth: depth,
            textContent: commentContent.length > 100 ? commentContent.substring(0, 100) + '...' : commentContent,
            fullTextContent: commentContent,
            parent: parent ? {
                id: parent.id,
                tagName: parent.tagName,
                depth: parent.depth
            } : null,
            children: [],
            childCount: 0,
            treePath: parent ? `${parent.treePath}/comment()` : '/comment()'
        };
        
        this.treeMetrics.totalNodes++;
        this.treeMetrics.commentNodes++;
        
        return treeNode;
    }

    /**
     * Generate tree path for node
     */
    generateTreePath(element, parent) {
        if (!parent) {
            return `/${element.tagName.toLowerCase()}`;
        }
        
        // Find position among siblings of same tag
        const siblings = Array.from(element.parentElement?.children || [])
            .filter(sibling => sibling.tagName === element.tagName);
        const position = siblings.indexOf(element) + 1;
        
        const tagName = element.tagName.toLowerCase();
        const positionSuffix = siblings.length > 1 ? `[${position}]` : '';
        
        return `${parent.treePath}/${tagName}${positionSuffix}`;
    }

    /**
     * Extract sibling information
     */
    extractSiblingInfo(element, parent) {
        if (!element.parentElement) {
            return { index: 0, totalSiblings: 1, previousSibling: null, nextSibling: null };
        }
        
        const siblings = Array.from(element.parentElement.children);
        const index = siblings.indexOf(element);
        
        return {
            index: index,
            totalSiblings: siblings.length,
            previousSibling: index > 0 ? {
                tagName: siblings[index - 1].tagName.toLowerCase(),
                id: siblings[index - 1].id,
                className: siblings[index - 1].className
            } : null,
            nextSibling: index < siblings.length - 1 ? {
                tagName: siblings[index + 1].tagName.toLowerCase(),
                id: siblings[index + 1].id,
                className: siblings[index + 1].className
            } : null
        };
    }

    /**
     * Calculate node metrics
     */
    calculateNodeMetrics(element, depth) {
        try {
            return {
                depth: depth,
                childElementCount: element.children ? element.children.length : 0,
                totalDescendants: this.countDescendants(element),
                textLength: (element.textContent || '').length,
                attributeCount: element.attributes ? element.attributes.length : 0,
                hasId: !!element.id,
                hasClass: !!element.className,
                isVisible: DOMUtils.isElementVisible(element),
                isInteractive: DOMUtils.isInteractiveElement(element)
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Count total descendants
     */
    countDescendants(element) {
        let count = 0;
        
        const walk = (node) => {
            if (node.children) {
                count += node.children.length;
                for (const child of node.children) {
                    walk(child);
                }
            }
        };
        
        walk(element);
        return count;
    }

    /**
     * Track node in relationship maps
     */
    trackNodeInMaps(node, parent) {
        // Add to node map
        if (node.id) {
            this.nodeMap.set(node.id, {
                element: node,
                depth: node.depth,
                parent: parent ? parent.id : null,
                children: []
            });
        }
        
        // Add to relationship map
        if (parent && parent.id && node.id) {
            if (!this.relationshipMap.has(parent.id)) {
                this.relationshipMap.set(parent.id, { children: [], parent: null });
            }
            this.relationshipMap.get(parent.id).children.push(node.id);
            
            if (!this.relationshipMap.has(node.id)) {
                this.relationshipMap.set(node.id, { children: [], parent: parent.id });
            }
        }
    }

    /**
     * Post-process tree structure
     */
    postProcessTree(tree, config) {
        if (!tree) return null;
        
        // Add tree-wide indices
        this.addTreeIndices(tree);
        
        // Calculate tree statistics
        if (config.trackNodeMetrics) {
            this.calculateTreeStatistics(tree);
        }
        
        // Validate tree structure
        if (config.validateTree !== false) {
            this.validateTreeStructure(tree);
        }
        
        return tree;
    }

    /**
     * Add tree-wide indices to nodes
     */
    addTreeIndices(tree) {
        let index = 0;
        
        const addIndex = (node) => {
            node.treeIndex = index++;
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(addIndex);
            }
        };
        
        addIndex(tree);
    }

    /**
     * Calculate tree statistics
     */
    calculateTreeStatistics(tree) {
        const stats = {
            nodesByDepth: new Map(),
            nodesByType: new Map(),
            interactiveNodes: 0,
            visibleNodes: 0,
            nodesWithId: 0,
            nodesWithClass: 0
        };
        
        const analyze = (node) => {
            // Count by depth
            const depth = node.depth || 0;
            stats.nodesByDepth.set(depth, (stats.nodesByDepth.get(depth) || 0) + 1);
            
            // Count by type
            const type = node.tagName || node.nodeName || 'unknown';
            stats.nodesByType.set(type, (stats.nodesByType.get(type) || 0) + 1);
            
            // Count special properties
            if (node.classification?.isInteractive) stats.interactiveNodes++;
            if (node.classification?.isVisible) stats.visibleNodes++;
            if (node.id) stats.nodesWithId++;
            if (node.className) stats.nodesWithClass++;
            
            // Recurse to children
            if (node.children) {
                node.children.forEach(analyze);
            }
        };
        
        analyze(tree);
        tree.statistics = stats;
    }

    /**
     * Validate tree structure
     */
    validateTreeStructure(tree) {
        const issues = [];
        
        const validate = (node, path = '') => {
            const currentPath = path ? `${path}/${node.tagName || node.nodeName}` : node.tagName || node.nodeName;
            
            // Check required properties
            if (node.nodeType === undefined) {
                issues.push(`Missing nodeType at ${currentPath}`);
            }
            
            if (!node.nodeName) {
                issues.push(`Missing nodeName at ${currentPath}`);
            }
            
            // Check depth consistency
            if (node.children && node.children.length > 0) {
                node.children.forEach((child, index) => {
                    if (child.depth !== node.depth + 1) {
                        issues.push(`Incorrect depth at ${currentPath}/child[${index}]`);
                    }
                    validate(child, currentPath);
                });
            }
        };
        
        validate(tree);
        
        if (issues.length > 0) {
            console.warn('Tree validation issues found:', issues);
            tree.validationIssues = issues;
        }
    }

    /**
     * Calculate maximum depth of tree
     */
    calculateMaxDepth(tree) {
        let maxDepth = 0;
        
        const findMaxDepth = (node) => {
            maxDepth = Math.max(maxDepth, node.depth || 0);
            
            if (node.children) {
                node.children.forEach(findMaxDepth);
            }
        };
        
        if (tree) {
            findMaxDepth(tree);
        }
        
        return maxDepth;
    }

    /**
     * Generate tree metadata
     */
    generateTreeMetadata(config) {
        return {
            buildTime: this.treeMetrics.buildTime,
            configuration: { ...config },
            timestamp: new Date().toISOString(),
            nodeCounter: this.nodeCounter,
            metrics: { ...this.treeMetrics },
            generator: 'TreeBuilder v2.0'
        };
    }

    /**
     * Check if tree building should stop
     */
    shouldStopBuilding(depth, config) {
        return depth >= config.maxDepth || 
               this.treeMetrics.totalNodes >= config.maxNodes;
    }

    /**
     * Reset counters and metrics
     */
    resetCounters() {
        this.nodeCounter = 0;
        this.nodeMap.clear();
        this.relationshipMap.clear();
        this.treeMetrics = {
            totalNodes: 0,
            elementNodes: 0,
            textNodes: 0,
            commentNodes: 0,
            maxDepth: 0,
            buildTime: 0
        };
    }

    /**
     * Find node by ID in tree
     */
    findNodeById(tree, targetId) {
        if (!tree || !targetId) return null;
        
        const search = (node) => {
            if (node.id === targetId) {
                return node;
            }
            
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    const result = search(child);
                    if (result) return result;
                }
            }
            
            return null;
        };
        
        return search(tree);
    }

    /**
     * Find nodes by criteria
     */
    findNodesByCriteria(tree, criteria) {
        const results = [];
        
        const search = (node) => {
            let matches = true;
            
            // Check each criterion
            for (const [key, value] of Object.entries(criteria)) {
                if (node[key] !== value) {
                    matches = false;
                    break;
                }
            }
            
            if (matches) {
                results.push(node);
            }
            
            // Search children
            if (node.children && node.children.length > 0) {
                node.children.forEach(search);
            }
        };
        
        if (tree) {
            search(tree);
        }
        
        return results;
    }

    /**
     * Get node path from root
     */
    getNodePath(tree, targetNode) {
        const path = [];
        
        const search = (node, currentPath = []) => {
            const newPath = [...currentPath, node];
            
            if (node === targetNode || (node.id && node.id === targetNode.id)) {
                path.push(...newPath);
                return true;
            }
            
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    if (search(child, newPath)) {
                        return true;
                    }
                }
            }
            
            return false;
        };
        
        if (tree) {
            search(tree);
        }
        
        return path;
    }

    /**
     * Convert tree to flat array
     */
    flattenTree(tree) {
        const flattened = [];
        
        const flatten = (node) => {
            flattened.push(node);
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(flatten);
            }
        };
        
        if (tree) {
            flatten(tree);
        }
        
        return flattened;
    }

    /**
     * Get tree summary
     */
    getTreeSummary(tree) {
        if (!tree) return null;
        
        const flattened = this.flattenTree(tree);
        
        return {
            totalNodes: flattened.length,
            maxDepth: this.calculateMaxDepth(tree),
            elementNodes: flattened.filter(n => n.nodeType === Node.ELEMENT_NODE).length,
            textNodes: flattened.filter(n => n.nodeType === Node.TEXT_NODE).length,
            commentNodes: flattened.filter(n => n.nodeType === Node.COMMENT_NODE).length,
            interactiveNodes: flattened.filter(n => n.classification?.isInteractive).length,
            visibleNodes: flattened.filter(n => n.classification?.isVisible).length,
            buildTime: this.treeMetrics.buildTime
        };
    }
}

export default TreeBuilder;
