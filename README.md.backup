# Treewise

A **TypeScript** library for managing tree (or forest) data structures, providing advanced features like:

- Multiple **root** support  
- **Batch operations** (add/remove children in bulk)  
- **Event handling** (`onNodeAdded`, `onNodeRemoved`, `onNodeUpdated`, `onNodeMoved`)  
- **Depth-first** and **breadth-first** traversals  
- **Internal indexing** for fast lookups (`findById`)  
- **Serialization** and **deserialization** (with version checks)  
- **Cloning** of individual nodes or the entire forest  
- **Utility functions** for deep copying and batch processing arrays  

## Table of Contents

- [Installation](#installation)  
- [Usage](#usage)  
  - [Creating a Treewise Instance](#creating-a-treewise-instance)  
  - [Adding and Removing Nodes](#adding-and-removing-nodes)  
  - [Traversing the Tree](#traversing-the-tree)  
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
`onNodeMoved` can be emitted if you implement custom re-parenting logic.

---

### Searching

**Find** a node via a custom predicate:

```typescript
const foundNode = tree.find((node) => node.value.id === 3);
if (foundNode) {
  console.log('Found node with ID 3');
}
```

**Find by ID** with internal indexing:

```typescript
const nodeById = tree.findById(3);
```

---

### Cloning

**Clone** a specific node’s subtree (ignoring its parent reference):

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

**Serialize** the forest to JSON:

```typescript
const jsonString = tree.serialize();
```

**Deserialize**:

```typescript
const newTree = new Treewise<MyNode>();
await newTree.deserialize(Promise.resolve(jsonString));
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

This package includes an example Jest test suite. To run it:

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

## License

[MIT](LICENSE) Made with ❤️ @pooyanpm
