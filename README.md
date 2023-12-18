# treewise

`treewise` is a TypeScript utility library providing functions for deep copying objects and arrays, processing arrays in batches, and performing various operations on tree data structures. It is designed for high efficiency and ease of use in managing complex data structures.

## Installation

Install `treewise` using npm:

```bash
npm install treewise
```

## Usage

Import the functions you need from `treewise`:

```typescript
import { deepCopy, processArrayInBatches, traverseTree, modifyTree } from 'treewise';
```

## API Reference

### `deepCopy<T>(obj: T): T`

Deeply copies an object or array.

- **Parameters**:
  - `obj: T` - The object or array to be copied.
- **Returns**: A deep copy of the object or array.

#### Example

```typescript
const original = [{ a: 1 }, { b: 2 }];
const copied = deepCopy(original);
```

### `processArrayInBatches<T>(array: T[], batchSize: number): T[][]`

Processes a large array by dividing it into batches of a specified size.

- **Parameters**:
  - `array: T[]` - The array to be processed.
  - `batchSize: number` - The size of each batch.
- **Returns**: An array of batches.

#### Example

```typescript
const data = [1, 2, 3, 4, 5];
const batches = processArrayInBatches(data, 2);
```

### `traverseTree<T>(root: TTreeNode<T>, callback: (node: TTreeNode<T>, depth: number) => void, depth: number = 0)`

Performs a depth-first traversal of a tree.

- **Parameters**:
  - `root: TTreeNode<T>` - The root node of the tree.
  - `callback: (node: TTreeNode<T>, depth: number) => void` - The callback function to be invoked for each node.
  - `depth: number` (optional) - The current depth in the tree (default is 0).
- **Returns**: void.

#### Example

```typescript
const tree = { value: 1, children: [{ value: 2, children: [] }] };
traverseTree(tree, (node, depth) => console.log(node.value, depth));
```

### `modifyTree<T>(root: TTreeNode<T>, modifyFn: (node: TTreeNode<T>) => void)`

Modifies the structure of a tree by applying a function to each node.

- **Parameters**:
  - `root: TTreeNode<T>` - The root node of the tree.
  - `modifyFn: (node: TTreeNode<T>) => void` - The function to be applied to each node.
- **Returns**: void.

#### Example

```typescript
const tree = { value: 1, children: [{ value: 2, children: [] }] };
modifyTree(tree, node => { node.value *= 2; });
```

## Interface `TTreeNode<T>`

Represents a node in a tree.

- **Properties**:
  - `value: T` - The value of the node.
  - `children: TTreeNode<T>[]` - An array of child nodes.

## License

This project is licensed under the [MIT License](LICENSE).