# Treewise

A **TypeScript** library for managing tree (or forest) data structures, providing advanced features like:

- Multiple **root** support  
- **Batch operations** (add/remove children in bulk)  
- **Event handling** (`onNodeAdded`, `onNodeRemoved`, `onNodeUpdated`, `onNodeMoved`)  
- **Depth-first** and **breadth-first** traversals  
- **Internal indexing** for fast lookups (`findById`)  
- **Path operations** (find paths between nodes, get ancestors/descendants)
- **Sibling navigation** (get previous/next siblings)
- **Tree validation** (circular reference detection, duplicate ID checks)
- **Filtering and mapping** (functional programming style operations)
- **Tree statistics** (depth, width, node counts)
- **Multiple serialization formats** (JSON, flat format with parent IDs)
- **Serialization** and **deserialization** (with version checks)  
- **Cloning** of individual nodes or the entire forest  
- **Utility functions** for deep copying and batch processing arrays  

## Table of Contents

- [Installation](#installation)  
- [Usage](#usage)  
  - [Creating a Treewise Instance](#creating-a-treewise-instance)  
  - [Adding and Removing Nodes](#adding-and-removing-nodes)
  - [Moving Nodes](#moving-nodes)
  - [Path Operations](#path-operations)
  - [Sibling Navigation](#sibling-navigation)
  - [Traversing the Tree](#traversing-the-tree)
  - [Filtering and Mapping](#filtering-and-mapping)
  - [Tree Validation](#tree-validation)
  - [Tree Statistics](#tree-statistics)
  - [Events](#events)  
  - [Searching](#searching)  
  - [Cloning](#cloning)  
  - [Serialization/Deserialization](#serializationdeserialization)  
  - [Utility Functions](#utility-functions)  
- [Testing](#testing)  
- [License](#license)

---

## Installation

Install via npm (or yarn) by adding it to your `package.json`:

```bash
npm install treewise
```

**or**:

```bash
yarn add treewise
```

Then import it in your **TypeScript** or **JavaScript** files:

```typescript
import { Treewise, TTreeNode } from 'treewise';
```

---

## Usage

### Creating a Treewise Instance

```typescript
import { Treewise } from 'treewise';

interface MyNode {
  id: number;
  name: string;
}

// Create a new tree with one optional root node
const tree = new Treewise<MyNode>({ id: 1, name: 'Root' });
```

By default, `Treewise` supports **multiple roots**. You can add more root nodes later:

```typescript
const root2 = { value: { id: 2, name: 'Another Root' } };
tree.addRoot(root2);
```

---

### Adding and Removing Nodes

#### Add a Child

```typescript
// Add a child node to an existing root
const childNode = tree.addNodeAsChild(
  tree.roots[0], 
  { id: 3, name: 'Child Node' }
);
```

#### Batch Add Children

```typescript
tree.addChildren(tree.roots[0], [
  { id: 4, name: 'Batch Child 1' },
  { id: 5, name: 'Batch Child 2' },
]);
```

#### Remove a Node

```typescript
tree.removeNode(childNode); // Removes a specific node
```

#### Remove Children in Batch

```typescript
const childNodes = [ /* ...some TTreeNode<MyNode>[] ... */ ];
tree.removeChildren(tree.roots[0], childNodes);
```

#### Remove All Roots

```typescript
tree.removeAllRoots(); // Clears all roots (and the index)
```

---

### Moving Nodes

Move nodes within the tree with automatic circular reference detection:

```typescript
const parentNode = tree.findById(1);
const nodeToMove = tree.findById(5);
const newParent = tree.findById(3);

// Move node to new parent (throws error if it would create circular reference)
tree.moveNode(nodeToMove, newParent);
```

---

### Path Operations

#### Get Path from Root to Node

```typescript
const node = tree.findById(5);
const path = tree.getPath(node);
// Returns: [rootNode, parentNode, node]
```

#### Find Path Between Two Nodes

```typescript
const node1 = tree.findById(3);
const node2 = tree.findById(7);
const path = tree.findPath(node1, node2);
// Returns path through common ancestor, or null if in different trees
```

#### Get Ancestors

```typescript
const node = tree.findById(5);
const ancestors = tree.getAncestors(node);
// Returns all nodes from parent to root
```

#### Get Descendants

```typescript
const node = tree.findById(3);
const descendants = tree.getDescendants(node);
// Returns all child nodes recursively
```

#### Check Ancestor Relationship

```typescript
const parent = tree.findById(1);
const child = tree.findById(5);
const isAncestor = tree.isAncestorOf(parent, child);
// Returns true if parent is an ancestor of child
```

---

### Sibling Navigation

```typescript
const node = tree.findById(5);

// Get all siblings
const siblings = tree.getSiblings(node);

// Get next sibling
const nextSibling = tree.getNextSibling(node);

// Get previous sibling
const previousSibling = tree.getPreviousSibling(node);
```

---

### Traversing the Tree

**Depth-First** with **pre-order** or **post-order**:

```typescript
tree.traverse((node, depth) => {
  console.log('Visited node:', node.value, 'at depth', depth);
}, 'pre-order');
```

You can also **limit the traversal depth**:

```typescript
tree.traverse(
  (node, depth) => console.log(node.value),
  'pre-order',
  2 // maxDepth
);
```

**Breadth-First** traversal:

```typescript
tree.traverseBreadthFirst((node, depth) => {
  console.log('BFS node:', node.value, 'depth:', depth);
});
```

---

### Filtering and Mapping

**Filter nodes** based on criteria:

```typescript
const activeNodes = tree.filterNodes(node => node.value.status === 'active');
```

**Map nodes** to transform data:

```typescript
const nodeIds = tree.mapNodes((node, depth) => ({
  id: node.value.id,
  depth: depth,
  name: node.value.name
}));
```

**Batch update** nodes matching a predicate:

```typescript
tree.batchUpdate(
  node => node.value.status === 'pending',
  node => { node.value.status = 'active'; }
);
```

---

### Tree Validation

**Validate tree structure**:

```typescript
const validation = tree.validateTree();
if (!validation.valid) {
  console.error('Tree errors:', validation.errors);
}
// Checks for: circular references, duplicate IDs, inconsistent parent references
```

**Quick circular reference check**:

```typescript
if (tree.hasCircularReference()) {
  console.error('Tree has circular reference!');
}
```

---

### Tree Statistics

**Get comprehensive statistics**:

```typescript
const stats = tree.getStatistics();
console.log(stats);
// {
//   depth: 3,           // Maximum depth
//   width: 5,           // Maximum width (nodes at any level)
//   nodeCount: 15,      // Total nodes
//   leafCount: 7,       // Leaf nodes
//   rootCount: 1        // Root nodes
// }
```

**Individual statistics**:

```typescript
const depth = tree.getDepth();           // Maximum depth
const width = tree.getWidth();           // Maximum width
const nodeCount = tree.countNodes();     // Total nodes
const leaves = tree.findLeafNodes();     // All leaf nodes

// Get all nodes at a specific depth
const level2Nodes = tree.getNodesAtDepth(2);
```

---

### Events

You can listen for various events like **onNodeAdded**, **onNodeRemoved**, **onNodeUpdated**, **onNodeMoved**.

```typescript
// Register an event handler
const onNodeAddedHandler = (node) => {
  console.log('Node added:', node.value.id);
};

tree.on('onNodeAdded', onNodeAddedHandler);

// Remove the event handler when no longer needed
tree.off('onNodeAdded', onNodeAddedHandler);
```

`onNodeUpdated` is called for nodes changed via `batchUpdate`.  
`onNodeMoved` is emitted when nodes are moved with `moveNode()`.

---

### Searching

**Find** a node via a custom predicate:

```typescript
const foundNode = tree.find((node) => node.value.id === 3);
if (foundNode) {
  console.log('Found node with ID 3');
}
```

**Find by ID** with internal indexing (O(1) lookup):

```typescript
const nodeById = tree.findById(3);
```

---

### Cloning

**Clone** a specific node's subtree (ignoring its parent reference):

```typescript
const clonedSubtree = tree.cloneNode(nodeById);
console.log('Cloned node:', clonedSubtree);
```

**Clone the entire forest** into a separate `Treewise` instance:

```typescript
const clonedForest = tree.cloneForest();
console.log('Cloned forest node count:', clonedForest.countNodes());
```

---

### Serialization/Deserialization

#### Standard JSON Format

**Serialize** the forest to JSON:

```typescript
const jsonString = tree.serialize();
```

**Deserialize**:

```typescript
const newTree = new Treewise<MyNode>();
await newTree.deserialize(Promise.resolve(jsonString));
```

#### Flat Format (for Databases)

**Serialize to flat format** with parent ID references:

```typescript
const flatData = tree.serializeFlat();
// [
//   { id: 1, name: 'Root', parentId: null },
//   { id: 2, name: 'Child', parentId: 1 },
//   ...
// ]
```

**Deserialize from flat format**:

```typescript
tree.deserializeFlat(flatData);
```

#### Nested JSON Format

**Export as nested JSON**:

```typescript
const nestedJson = tree.toJSON();
```

**Import from nested JSON**:

```typescript
tree.fromJSON(nestedJson);
```

Version mismatches in the JSON data will throw an error, ensuring compatibility.

---

### Utility Functions

**`deepCopy`** deeply copies objects or arrays (including `Date`, `RegExp`, `Map`, and `Set`):

```typescript
import { deepCopy } from 'treewise';

const original = { a: 1, b: [2, 3], date: new Date() };
const copy = deepCopy(original);
```

**`processArrayInBatches`** yields slices of an array in specified batch sizes:

```typescript
import { processArrayInBatches } from 'treewise';

const data = [1, 2, 3, 4, 5];
for (const batch of processArrayInBatches(data, 2)) {
  console.log('Batch:', batch);
}
```

---

## Testing

This package includes a comprehensive Jest test suite with 65+ tests. To run it:

1. Install dependencies:
   ```bash
   npm install --save-dev jest ts-jest @types/jest
   ```
2. Configure Jest in your `package.json` or `jest.config.js`.
3. Place the test file (e.g., `treewise.test.ts`) in your test directory.
4. Run tests:
   ```bash
   npm test
   ```

---

## API Reference

### Core Methods

- `addRoot(node)` - Add a root node
- `addNodeAsChild(parent, value)` - Add child to a node
- `addChildren(parent, values)` - Batch add children
- `removeNode(node)` - Remove a node
- `removeChildren(parent, nodes)` - Batch remove children
- `moveNode(node, newParent)` - Move node to new parent

### Path & Navigation

- `getPath(node)` - Get path from root to node
- `findPath(from, to)` - Find path between two nodes
- `getAncestors(node)` - Get all ancestors
- `getDescendants(node)` - Get all descendants
- `isAncestorOf(ancestor, descendant)` - Check ancestor relationship
- `getSiblings(node)` - Get all siblings
- `getNextSibling(node)` - Get next sibling
- `getPreviousSibling(node)` - Get previous sibling

### Search & Filter

- `find(predicate)` - Find node by predicate
- `findById(id)` - Find node by ID (O(1))
- `filterNodes(predicate)` - Filter nodes
- `mapNodes(mapFn)` - Map nodes to array

### Traversal

- `traverse(callback, strategy, maxDepth)` - Depth-first traversal
- `traverseBreadthFirst(callback, maxDepth)` - Breadth-first traversal

### Validation & Statistics

- `validateTree()` - Validate tree structure
- `hasCircularReference()` - Check for circular references
- `getStatistics()` - Get comprehensive statistics
- `getDepth()` - Get maximum depth
- `getWidth()` - Get maximum width
- `getNodesAtDepth(depth)` - Get nodes at specific depth
- `countNodes()` - Count total nodes
- `findLeafNodes()` - Find all leaf nodes

### Serialization

- `serialize()` - Standard JSON serialization
- `deserialize(dataPromise)` - Standard JSON deserialization
- `serializeFlat()` - Flat format with parent IDs
- `deserializeFlat(flatData)` - Flat format deserialization
- `toJSON()` - Nested JSON export
- `fromJSON(jsonData)` - Nested JSON import

### Events

- `on(event, handler)` - Register event handler
- `off(event, handler)` - Remove event handler

### Utility

- `cloneNode(node)` - Clone a subtree
- `cloneForest()` - Clone entire tree
- `toArray()` - Convert to flat array
- `visualize()` - ASCII visualization

---

## License

[MIT](LICENSE) Made with ❤️ @pooyanpm
