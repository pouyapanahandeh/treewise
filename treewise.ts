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
   * Stub for node re-parenting, emitting onNodeMoved if needed.
   */
  moveNode(node: TTreeNode<T>, newParent: TTreeNode<T>): void {
    // Actual re-parenting logic omitted.
    this.emit('onNodeMoved', node);
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