// treewise.ts

/**
 * An interface representing an identifiable object with an `id` property.
 */
export interface Identifiable {
  id: number;
}

/**
 * Represents a node in a tree structure.
 */
export interface TTreeNode<T extends Identifiable> {
  readonly value: T;
  children?: TTreeNode<T>[];
  parent?: TTreeNode<T>;
}

/**
 * Event types that can be emitted by the Treewise class.
 */
export type TreewiseEvent =
  | 'onNodeAdded'
  | 'onNodeRemoved'
  | 'onNodeUpdated'
  | 'onNodeMoved';

/**
 * Basic event handling signature.
 */
export type TreewiseEventHandler<T extends Identifiable> = (node: TTreeNode<T>) => void;

/**
 * A class providing methods to manipulate tree structures.
 * Supports single or multiple root nodes.
 */
export class Treewise<T extends Identifiable> {
  public roots: Array<TTreeNode<T>> = [];

  /**
   * Maintains a map of node IDs to nodes for faster searches.
   */
  private nodeIndex = new Map<number, TTreeNode<T>>();

  /**
   * Holds event handlers for different event types.
   */
  private eventHandlers: Record<TreewiseEvent, TreewiseEventHandler<T>[]> = {
    onNodeAdded: [],
    onNodeRemoved: [],
    onNodeUpdated: [],
    onNodeMoved: [],
  };

  /**
   * Tree versioning (used in serialization/deserialization).
   */
  private treeVersion = 1;

  /**
   * Creates an instance of Treewise.
   * @param rootValue Optional. If provided, initializes a single root node.
   */
  constructor(rootValue?: T) {
    if (rootValue !== undefined) {
      const rootNode: TTreeNode<T> = { value: rootValue };
      this.addRoot(rootNode);
    }
  }

  /**
   * Adds a new root node to the tree (supports multiple roots).
   */
  addRoot(node: TTreeNode<T>): void {
    node.parent = undefined;
    this.roots.push(node);
    this.indexNodeAndChildren(node);
  }

  /**
   * Removes all root nodes and clears indexing.
   */
  removeAllRoots(): void {
    for (const root of this.roots) {
      this.unindexNodeAndChildren(root);
    }
    this.roots = [];
  }

  /**
   * Adds a new child node to a specified parent node.
   */
  addNodeAsChild(parentNode: TTreeNode<T>, childValue: T): TTreeNode<T> {
    if (!parentNode || !childValue) {
      throw new Error('Parent node and child value must be provided.');
    }
    const childNode: TTreeNode<T> = { value: childValue, parent: parentNode };
    parentNode.children = parentNode.children || [];
    parentNode.children.push(childNode);

    this.indexNodeAndChildren(childNode);
    this.emit('onNodeAdded', childNode);

    return childNode;
  }

  /**
   * Batch operation to add multiple children to a parent at once.
   */
  addChildren(parentNode: TTreeNode<T>, childValues: T[]): void {
    if (!parentNode || !Array.isArray(childValues)) {
      throw new Error('Invalid parent node or child values array.');
    }
    for (const value of childValues) {
      this.addNodeAsChild(parentNode, value);
    }
  }

  /**
   * Removes a node from the tree. Throws if node is malformed or not found.
   */
  removeNode(targetNode: TTreeNode<T>): boolean {
    if (!targetNode) {
      throw new Error('Target node cannot be null or undefined.');
    }

    const rootIndex = this.roots.indexOf(targetNode);
    if (rootIndex !== -1) {
      this.roots.splice(rootIndex, 1);
      this.unindexNodeAndChildren(targetNode);
      this.emit('onNodeRemoved', targetNode);
      return true;
    }

    const parentNode = targetNode.parent;
    if (!parentNode || !parentNode.children) {
      throw new Error('The target node or its parent is malformed.');
    }

    const index = parentNode.children.indexOf(targetNode);
    if (index === -1) {
      throw new Error('Target node does not exist in parent children.');
    }

    parentNode.children.splice(index, 1);
    this.unindexNodeAndChildren(targetNode);
    this.emit('onNodeRemoved', targetNode);

    return true;
  }

  /**
   * Removes multiple children from a parent node at once.
   */
  removeChildren(parentNode: TTreeNode<T>, childNodes: TTreeNode<T>[]): void {
    if (!parentNode || !Array.isArray(childNodes)) {
      throw new Error('Invalid parent node or childNodes array.');
    }
    for (const node of childNodes) {
      if (node.parent !== parentNode) {
        throw new Error('One or more nodes do not belong to the specified parent.');
      }
      this.removeNode(node);
    }
  }

  /**
   * Traverses all roots and applies a callback to each node (DFS).
   * @param strategy 'pre-order' or 'post-order'.
   * @param maxDepth Optional maximum depth to traverse.
   */
  traverse(
    callback: (node: TTreeNode<T>, depth: number) => void,
    strategy: 'pre-order' | 'post-order' = 'pre-order',
    maxDepth?: number
  ): void {
    for (const root of this.roots) {
      this.traverseSubtree(root, callback, strategy, 0, maxDepth);
    }
  }

  private traverseSubtree(
    startNode: TTreeNode<T>,
    callback: (node: TTreeNode<T>, depth: number) => void,
    strategy: 'pre-order' | 'post-order',
    startDepth: number,
    maxDepth?: number
  ): void {
    if (strategy === 'pre-order') {
      const stack: Array<{ node: TTreeNode<T>; depth: number }> = [
        { node: startNode, depth: startDepth },
      ];
      while (stack.length > 0) {
        const { node, depth } = stack.pop()!;
        callback(node, depth);

        if (maxDepth !== undefined && depth >= maxDepth) continue;
        if (node.children) {
          for (let i = node.children.length - 1; i >= 0; i--) {
            stack.push({ node: node.children[i], depth: depth + 1 });
          }
        }
      }
    } else {
      const stack1: Array<{ node: TTreeNode<T>; depth: number }> = [
        { node: startNode, depth: startDepth },
      ];
      const stack2: Array<{ node: TTreeNode<T>; depth: number }> = [];
      while (stack1.length > 0) {
        const { node, depth } = stack1.pop()!;
        stack2.push({ node, depth });
        if (maxDepth !== undefined && depth >= maxDepth) continue;
        if (node.children) {
          for (const child of node.children) {
            stack1.push({ node: child, depth: depth + 1 });
          }
        }
      }
      while (stack2.length > 0) {
        const { node, depth } = stack2.pop()!;
        callback(node, depth);
      }
    }
  }

  /**
   * Performs a BFS across all roots.
   */
  traverseBreadthFirst(
    callback: (node: TTreeNode<T>, depth: number) => void,
    maxDepth?: number
  ): void {
    for (const root of this.roots) {
      const queue: Array<{ node: TTreeNode<T>; depth: number }> = [
        { node: root, depth: 0 },
      ];

      while (queue.length > 0) {
        const { node, depth } = queue.shift()!;
        callback(node, depth);
        if (maxDepth !== undefined && depth >= maxDepth) continue;
        if (node.children) {
          for (const child of node.children) {
            queue.push({ node: child, depth: depth + 1 });
          }
        }
      }
    }
  }

  /**
   * Bulk transformation method.
   */
  transform(transformFn: (node: TTreeNode<T>) => void): void {
    this.traverse((node) => {
      transformFn(node);
    });
  }

  /**
   * Applies a transformation function to all nodes matching a predicate.
   */
  batchUpdate(
    predicate: (node: TTreeNode<T>) => boolean,
    transformFn: (node: TTreeNode<T>) => void
  ): void {
    const matchingNodes: TTreeNode<T>[] = [];
    this.traverse((node) => {
      if (predicate(node)) {
        matchingNodes.push(node);
      }
    });
    matchingNodes.forEach((node) => {
      transformFn(node);
      this.emit('onNodeUpdated', node);
    });
  }

  /**
   * Moves a node to a new parent, with circular reference detection.
   * Throws if the move would create a circular reference.
   */
  moveNode(node: TTreeNode<T>, newParent: TTreeNode<T>): void {
    if (!node || !newParent) {
      throw new Error('Node and new parent must be provided.');
    }

    // Check if newParent is a descendant of node (would create circular reference)
    if (this.isAncestorOf(node, newParent)) {
      throw new Error('Cannot move node: would create circular reference.');
    }

    // Remove from current parent or roots
    const rootIndex = this.roots.indexOf(node);
    if (rootIndex !== -1) {
      this.roots.splice(rootIndex, 1);
    } else if (node.parent && node.parent.children) {
      const index = node.parent.children.indexOf(node);
      if (index !== -1) {
        node.parent.children.splice(index, 1);
      }
    }

    // Add to new parent
    node.parent = newParent;
    newParent.children = newParent.children || [];
    newParent.children.push(node);

    this.emit('onNodeMoved', node);
  }

  /**
   * Gets the path from root to the specified node.
   * Returns an array of nodes from root to the target node.
   */
  getPath(node: TTreeNode<T>): TTreeNode<T>[] {
    const path: TTreeNode<T>[] = [];
    let current: TTreeNode<T> | undefined = node;
    
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    
    return path;
  }

  /**
   * Finds the path between two nodes.
   * Returns null if nodes are in different trees.
   */
  findPath(from: TTreeNode<T>, to: TTreeNode<T>): TTreeNode<T>[] | null {
    const fromPath = this.getPath(from);
    const toPath = this.getPath(to);
    
    // Find common ancestor
    let commonAncestorIndex = 0;
    while (
      commonAncestorIndex < fromPath.length &&
      commonAncestorIndex < toPath.length &&
      fromPath[commonAncestorIndex] === toPath[commonAncestorIndex]
    ) {
      commonAncestorIndex++;
    }
    
    if (commonAncestorIndex === 0) {
      return null; // Different trees
    }
    
    // Build path: from -> common ancestor -> to
    const pathUp = fromPath.slice(commonAncestorIndex - 1).reverse();
    const pathDown = toPath.slice(commonAncestorIndex);
    
    return [...pathUp, ...pathDown];
  }

  /**
   * Gets all ancestors of a node (from parent to root).
   */
  getAncestors(node: TTreeNode<T>): TTreeNode<T>[] {
    const ancestors: TTreeNode<T>[] = [];
    let current = node.parent;
    
    while (current) {
      ancestors.push(current);
      current = current.parent;
    }
    
    return ancestors;
  }

  /**
   * Gets all descendants of a node.
   */
  getDescendants(node: TTreeNode<T>): TTreeNode<T>[] {
    const descendants: TTreeNode<T>[] = [];
    
    if (node.children) {
      for (const child of node.children) {
        descendants.push(child);
        descendants.push(...this.getDescendants(child));
      }
    }
    
    return descendants;
  }

  /**
   * Checks if a node is an ancestor of another node.
   */
  isAncestorOf(ancestor: TTreeNode<T>, descendant: TTreeNode<T>): boolean {
    let current = descendant.parent;
    
    while (current) {
      if (current === ancestor) {
        return true;
      }
      current = current.parent;
    }
    
    return false;
  }

  /**
   * Gets all siblings of a node (nodes with the same parent).
   */
  getSiblings(node: TTreeNode<T>): TTreeNode<T>[] {
    if (!node.parent) {
      // Root node - siblings are other roots
      return this.roots.filter(root => root !== node);
    }
    
    if (!node.parent.children) {
      return [];
    }
    
    return node.parent.children.filter(child => child !== node);
  }

  /**
   * Gets the next sibling of a node.
   */
  getNextSibling(node: TTreeNode<T>): TTreeNode<T> | null {
    const siblings = node.parent ? node.parent.children : this.roots;
    
    if (!siblings) {
      return null;
    }
    
    const index = siblings.indexOf(node);
    if (index === -1 || index === siblings.length - 1) {
      return null;
    }
    
    return siblings[index + 1];
  }

  /**
   * Gets the previous sibling of a node.
   */
  getPreviousSibling(node: TTreeNode<T>): TTreeNode<T> | null {
    const siblings = node.parent ? node.parent.children : this.roots;
    
    if (!siblings) {
      return null;
    }
    
    const index = siblings.indexOf(node);
    if (index <= 0) {
      return null;
    }
    
    return siblings[index - 1];
  }

  /**
   * Searches for a node via predicate. Uses nodeIndex for quick ID checks.
   */
  find(predicate: (node: TTreeNode<T>) => boolean): TTreeNode<T> | null {
    for (const node of this.nodeIndex.values()) {
      if (predicate(node)) return node;
    }
    let result: TTreeNode<T> | null = null;
    this.traverse((node) => {
      if (result === null && predicate(node)) {
        result = node;
      }
    });
    return result;
  }

  /**
   * Searches for a node by ID (fast lookup).
   */
  findById(id: number): TTreeNode<T> | null {
    return this.nodeIndex.get(id) || null;
  }

  /**
   * Filters nodes based on a predicate.
   */
  filterNodes(predicate: (node: TTreeNode<T>) => boolean): TTreeNode<T>[] {
    const filtered: TTreeNode<T>[] = [];
    this.traverse((node) => {
      if (predicate(node)) {
        filtered.push(node);
      }
    });
    return filtered;
  }

  /**
   * Maps all nodes to a new array using a transformation function.
   */
  mapNodes<U>(mapFn: (node: TTreeNode<T>, depth: number) => U): U[] {
    const result: U[] = [];
    this.traverse((node, depth) => {
      result.push(mapFn(node, depth));
    });
    return result;
  }

  /**
   * Validates the tree structure for circular references and orphaned nodes.
   * Returns an object with validation results.
   */
  validateTree(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visitedNodes = new Set<TTreeNode<T>>();

    // Check for circular references using path tracking
    const checkCircular = (node: TTreeNode<T>, path: Set<TTreeNode<T>>): void => {
      if (path.has(node)) {
        errors.push(`Circular reference detected at node ${node.value.id}`);
        return;
      }

      if (visitedNodes.has(node)) {
        return; // Already checked this subtree
      }

      visitedNodes.add(node);
      path.add(node);

      if (node.children) {
        for (const child of node.children) {
          // Check parent reference consistency
          if (child.parent !== node) {
            errors.push(
              `Inconsistent parent reference at node ${child.value.id}`
            );
          }
          checkCircular(child, new Set(path));
        }
      }
    };

    for (const root of this.roots) {
      if (root.parent) {
        errors.push(`Root node ${root.value.id} has a parent reference`);
      }
      checkCircular(root, new Set());
    }

    // Check for duplicate IDs
    const idCounts = new Map<number, number>();
    this.traverse((node) => {
      const count = idCounts.get(node.value.id) || 0;
      idCounts.set(node.value.id, count + 1);
    });

    for (const [id, count] of idCounts.entries()) {
      if (count > 1) {
        errors.push(`Duplicate ID ${id} found ${count} times`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if the tree has any circular references.
   */
  hasCircularReference(): boolean {
    return !this.validateTree().valid;
  }

  /**
   * Computes the maximum depth among all roots.
   */
  getDepth(): number {
    let maxDepth = 0;
    this.traverse((_, depth) => {
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    });
    return maxDepth;
  }

  /**
   * Counts total nodes across all roots (via index size).
   */
  countNodes(): number {
    return this.nodeIndex.size;
  }

  /**
   * Gets the maximum width (number of nodes at any level) of the tree.
   */
  getWidth(): number {
    const levelCounts = new Map<number, number>();
    
    this.traverse((node, depth) => {
      levelCounts.set(depth, (levelCounts.get(depth) || 0) + 1);
    });
    
    return Math.max(...Array.from(levelCounts.values()), 0);
  }

  /**
   * Gets all nodes at a specific depth level.
   */
  getNodesAtDepth(targetDepth: number): TTreeNode<T>[] {
    const nodes: TTreeNode<T>[] = [];
    
    this.traverse((node, depth) => {
      if (depth === targetDepth) {
        nodes.push(node);
      }
    });
    
    return nodes;
  }

  /**
   * Calculates tree statistics including depth, width, node count, and leaf count.
   */
  getStatistics(): {
    depth: number;
    width: number;
    nodeCount: number;
    leafCount: number;
    rootCount: number;
  } {
    return {
      depth: this.getDepth(),
      width: this.getWidth(),
      nodeCount: this.countNodes(),
      leafCount: this.findLeafNodes().length,
      rootCount: this.roots.length,
    };
  }

  /**
   * Finds all leaf nodes in the forest.
   */
  findLeafNodes(): TTreeNode<T>[] {
    const leaves: TTreeNode<T>[] = [];
    this.traverse((node) => {
      if (!node.children || node.children.length === 0) {
        leaves.push(node);
      }
    });
    return leaves;
  }

  /**
   * Returns a flat array of all nodes in the forest.
   */
  toArray(): TTreeNode<T>[] {
    return Array.from(this.nodeIndex.values());
  }

  /**
   * Clones a specific node (and its subtree), ignoring parent references.
   */
  cloneNode(node: TTreeNode<T>): TTreeNode<T> {
    return this.deepCopyNode(node);
  }

  /**
   * Clones the entire forest into a separate Treewise instance.
   */
  cloneForest(): Treewise<T> {
    const newTree = new Treewise<T>();
    newTree.removeAllRoots();
    for (const root of this.roots) {
      const clonedRoot = this.deepCopyNode(root);
      newTree.addRoot(clonedRoot);
    }
    return newTree;
  }

  /**
   * Simple ASCII visualization of the forest (for debugging).
   */
  visualize(): string {
    const lines: string[] = [];
    this.traverse((node, depth) => {
      lines.push(`${' '.repeat(depth * 2)}- ${node.value.id}`);
    });
    return lines.join('\n');
  }

  /**
   * Placeholder for performance benchmarking.
   */
  benchmarkOperations(): void {
    // Implementation depends on specific performance needs.
  }

  /**
   * Serializes the forest into JSON, including a version for migrations.
   */
  serialize(): string {
    const replacer = (key: string, value: any) => {
      if (key === 'parent') return undefined;
      return value;
    };
    const data = {
      version: this.treeVersion,
      roots: this.roots,
    };
    return JSON.stringify(data, replacer);
  }

  /**
   * Deserializes a JSON string, re-building the forest.
   * Throws an error if there's a version mismatch or invalid data.
   */
  async deserialize(dataPromise: Promise<string>): Promise<void> {
    const data = await dataPromise;
    const parsed = JSON.parse(data);

    if (parsed.version !== this.treeVersion) {
      throw new Error(
        `Tree version mismatch. Got ${parsed.version}, expected ${this.treeVersion}.`
      );
    }

    if (!Array.isArray(parsed.roots)) {
      throw new Error('Invalid format: missing "roots" array.');
    }

    this.roots = parsed.roots;
    this.nodeIndex.clear();

    for (const root of this.roots) {
      this.reconstructParentReferences(root, null);
      this.indexNodeAndChildren(root);
    }
  }

  /**
   * Serializes the tree to a flat format with parent ID references.
   * Useful for database storage.
   */
  serializeFlat(): Array<T & { parentId: number | null }> {
    const flat: Array<T & { parentId: number | null }> = [];
    
    this.traverse((node) => {
      flat.push({
        ...node.value,
        parentId: node.parent ? node.parent.value.id : null,
      });
    });
    
    return flat;
  }

  /**
   * Deserializes from a flat format with parent ID references.
   * Reconstructs the tree structure from flat data.
   */
  deserializeFlat(flatData: Array<T & { parentId: number | null }>): void {
    this.removeAllRoots();
    
    const nodeMap = new Map<number, TTreeNode<T>>();
    
    // First pass: create all nodes
    for (const item of flatData) {
      const { parentId, ...value } = item;
      const node: TTreeNode<T> = { value: value as any as T };
      nodeMap.set(item.id, node);
    }
    
    // Second pass: establish relationships
    for (const item of flatData) {
      const node = nodeMap.get(item.id)!;
      
      if (item.parentId === null) {
        // Root node
        this.addRoot(node);
      } else {
        // Child node
        const parent = nodeMap.get(item.parentId);
        if (parent) {
          node.parent = parent;
          parent.children = parent.children || [];
          parent.children.push(node);
          this.indexNodeAndChildren(node);
        }
      }
    }
  }

  /**
   * Exports the tree as nested JSON (alternative format).
   */
  toJSON(): any {
    const convertNode = (node: TTreeNode<T>): any => {
      const result: any = { ...node.value };
      if (node.children && node.children.length > 0) {
        result.children = node.children.map(convertNode);
      }
      return result;
    };
    
    return this.roots.map(convertNode);
  }

  /**
   * Imports tree from nested JSON format.
   */
  fromJSON(jsonData: any[]): void {
    this.removeAllRoots();
    
    const buildNode = (data: any, parent?: TTreeNode<T>): TTreeNode<T> => {
      const { children, ...value } = data;
      const node: TTreeNode<T> = { value: value as T, parent };
      
      if (children && Array.isArray(children)) {
        node.children = children.map((childData) => buildNode(childData, node));
      }
      
      return node;
    };
    
    for (const rootData of jsonData) {
      const rootNode = buildNode(rootData);
      this.addRoot(rootNode);
    }
  }

  /**
   * Registers an event handler for tree changes.
   */
  on(event: TreewiseEvent, handler: TreewiseEventHandler<T>): void {
    this.eventHandlers[event].push(handler);
  }

  /**
   * Removes a previously registered event handler.
   */
  off(event: TreewiseEvent, handler: TreewiseEventHandler<T>): void {
    const handlers = this.eventHandlers[event];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  private emit(event: TreewiseEvent, node: TTreeNode<T>): void {
    for (const handler of this.eventHandlers[event]) {
      handler(node);
    }
  }

  private reconstructParentReferences(node: TTreeNode<T>, parent: TTreeNode<T> | null): void {
    node.parent = parent || undefined;
    if (node.children) {
      for (const child of node.children) {
        this.reconstructParentReferences(child, node);
      }
    }
  }

  private indexNodeAndChildren(node: TTreeNode<T>): void {
    this.nodeIndex.set(node.value.id, node);
    if (node.children) {
      for (const child of node.children) {
        this.indexNodeAndChildren(child);
      }
    }
  }

  private unindexNodeAndChildren(node: TTreeNode<T>): void {
    this.nodeIndex.delete(node.value.id);
    if (node.children) {
      for (const child of node.children) {
        this.unindexNodeAndChildren(child);
      }
    }
  }

  private deepCopyNode(node: TTreeNode<T>): TTreeNode<T> {
    const copiedValue = { ...node.value };
    const newNode: TTreeNode<T> = { value: copiedValue };
    if (node.children && node.children.length > 0) {
      newNode.children = node.children.map((child) => this.deepCopyNode(child));
    }
    return newNode;
  }
}

/**
 * Deeply copies an object or array, handling special types like Date, RegExp, Map, and Set.
 */
export function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  if (obj instanceof Map) {
    const result = new Map();
    for (const [key, value] of obj.entries()) {
      result.set(key, deepCopy(value));
    }
    return result as unknown as T;
  }

  if (obj instanceof Set) {
    const result = new Set();
    for (const value of obj.values()) {
      result.add(deepCopy(value));
    }
    return result as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepCopy(item)) as unknown as T;
  }

  const copy: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy((obj as { [key: string]: any })[key]);
    }
  }
  return copy as T;
}

/**
 * Generates batches from an array of a specified size.
 */
export function* processArrayInBatches<T>(array: T[], batchSize: number): Generator<T[]> {
  if (batchSize <= 0) {
    throw new Error('Batch size must be greater than zero.');
  }
  for (let i = 0; i < array.length; i += batchSize) {
    yield array.slice(i, i + batchSize);
  }
}