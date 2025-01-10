// treewise.test.ts

import {
  Treewise,
  TTreeNode,
  Identifiable,
  deepCopy,
  processArrayInBatches,
} from './treewise';

interface TestNode extends Identifiable {
  id: number;
  name?: string;
}

describe('Treewise', () => {
  let tree: Treewise<TestNode>;

  beforeEach(() => {
    tree = new Treewise<TestNode>();
  });

  describe('Root Management', () => {
    it('adds a single root node', () => {
      const rootVal: TestNode = { id: 1, name: 'Root' };
      const rootNode: TTreeNode<TestNode> = { value: rootVal };

      tree.addRoot(rootNode);
      expect(tree.roots.length).toBe(1);
      expect(tree.roots[0].value).toEqual(rootVal);
      expect(tree.countNodes()).toBe(1);
    });

    it('removes all roots', () => {
      const rootValA: TestNode = { id: 10, name: 'RootA' };
      const rootValB: TestNode = { id: 20, name: 'RootB' };
      tree.addRoot({ value: rootValA });
      tree.addRoot({ value: rootValB });

      expect(tree.roots.length).toBe(2);
      expect(tree.countNodes()).toBe(2);

      tree.removeAllRoots();
      expect(tree.roots.length).toBe(0);
      expect(tree.countNodes()).toBe(0);
    });

    it('initializes a single root when provided in constructor', () => {
      const constructedTree = new Treewise<TestNode>({ id: 999, name: 'ConstructedRoot' });
      expect(constructedTree.roots.length).toBe(1);
      expect(constructedTree.countNodes()).toBe(1);
      expect(constructedTree.roots[0].value.id).toBe(999);
    });
  });

  describe('Adding/Removing Children', () => {
    let rootNode: TTreeNode<TestNode>;

    beforeEach(() => {
      rootNode = { value: { id: 100, name: 'Root' } };
      tree.addRoot(rootNode);
    });

    it('adds a single child node', () => {
      const childVal: TestNode = { id: 101, name: 'Child' };
      const childNode = tree.addNodeAsChild(rootNode, childVal);

      expect(rootNode.children).toHaveLength(1);
      expect(childNode.parent).toBe(rootNode);
      expect(tree.countNodes()).toBe(2);
    });

    it('batch-adds multiple children', () => {
      const childValues: TestNode[] = [
        { id: 201, name: 'ChildA' },
        { id: 202, name: 'ChildB' },
      ];
      tree.addChildren(rootNode, childValues);

      expect(rootNode.children).toHaveLength(2);
      expect(tree.countNodes()).toBe(3); // root (1) + 2 children
    });

    it('removes a child node', () => {
      const childVal: TestNode = { id: 300, name: 'ChildToRemove' };
      const childNode = tree.addNodeAsChild(rootNode, childVal);
      expect(tree.countNodes()).toBe(2);

      const removed = tree.removeNode(childNode);
      expect(removed).toBe(true);
      expect(rootNode.children).toHaveLength(0);
      expect(tree.countNodes()).toBe(1);
    });

    it('batch-removes multiple children', () => {
      const nodesToAdd = [
        { id: 301, name: 'ChildA' },
        { id: 302, name: 'ChildB' },
      ];
      const childNodes = nodesToAdd.map((val) => tree.addNodeAsChild(rootNode, val));
      expect(tree.countNodes()).toBe(3);

      tree.removeChildren(rootNode, childNodes);
      expect(tree.countNodes()).toBe(1); // Only root remains
      expect(rootNode.children).toHaveLength(0);
    });

    it('throws error if removing node not found in parent', () => {
      const invalidNode: TTreeNode<TestNode> = { value: { id: 999 } };
      expect(() => tree.removeNode(invalidNode)).toThrow();
    });
  });

  describe('Traversal', () => {
    beforeEach(() => {
      const rootA: TTreeNode<TestNode> = { value: { id: 1, name: 'RootA' } };
      tree.addRoot(rootA);
      tree.addNodeAsChild(rootA, { id: 2, name: 'Child1' });
      tree.addNodeAsChild(rootA, { id: 3, name: 'Child2' });
    });

    it('traverses in pre-order', () => {
      const visitedIds: number[] = [];
      tree.traverse((node) => visitedIds.push(node.value.id), 'pre-order');
      expect(visitedIds).toContain(1);
      expect(visitedIds).toContain(2);
      expect(visitedIds).toContain(3);

      // First node visited should be root
      expect(visitedIds[0]).toBe(1);
    });

    it('traverses in post-order', () => {
      const visitedIds: number[] = [];
      tree.traverse((node) => visitedIds.push(node.value.id), 'post-order');
      // Root should appear last
      expect(visitedIds[visitedIds.length - 1]).toBe(1);
      expect(new Set(visitedIds)).toEqual(new Set([1, 2, 3]));
    });

    it('performs a BFS traversal', () => {
      // BFS: [RootA] -> [Child1, Child2]
      const visited: number[] = [];
      tree.traverseBreadthFirst((node) => visited.push(node.value.id));
      expect(visited).toEqual([1, 2, 3]);
    });
  });

  describe('Events', () => {
    it('onNodeAdded is called when a child is added', () => {
      const addHandler = jest.fn();
      tree.on('onNodeAdded', addHandler);

      const rootVal: TestNode = { id: 500, name: 'Root' };
      tree.addRoot({ value: rootVal });
      expect(addHandler).not.toHaveBeenCalled(); // Root addition does not call onNodeAdded, only addRoot

      const childVal: TestNode = { id: 501, name: 'Child' };
      tree.addNodeAsChild(tree.roots[0], childVal);
      expect(addHandler).toHaveBeenCalledTimes(1);
      expect(addHandler.mock.calls[0][0].value).toEqual(childVal);
    });

    it('onNodeRemoved is called when a node is removed', () => {
      const removeHandler = jest.fn();
      tree.on('onNodeRemoved', removeHandler);

      const rootVal: TestNode = { id: 600 };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);

      const childVal: TestNode = { id: 601 };
      const childNode = tree.addNodeAsChild(rootNode, childVal);

      tree.removeNode(childNode);
      expect(removeHandler).toHaveBeenCalledTimes(1);
      expect(removeHandler.mock.calls[0][0].value).toEqual(childVal);
    });

    it('batchUpdate triggers onNodeUpdated', () => {
      const updateHandler = jest.fn();
      tree.on('onNodeUpdated', updateHandler);

      const rootVal: TestNode = { id: 700, name: 'Root' };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);
      tree.addNodeAsChild(rootNode, { id: 701, name: 'ChildA' });
      tree.addNodeAsChild(rootNode, { id: 702, name: 'ChildB' });

      tree.batchUpdate(
        (node) => node.value.name?.startsWith('Child'),
        (node) => {
          (node.value as any).updated = true;
        }
      );

      expect(updateHandler).toHaveBeenCalledTimes(2);
    });

    it('can remove event handlers', () => {
      const addHandler = jest.fn();
      tree.on('onNodeAdded', addHandler);

      const rootVal: TestNode = { id: 800 };
      tree.addRoot({ value: rootVal }); // This does not trigger onNodeAdded
      const childVal: TestNode = { id: 801 };
      tree.addNodeAsChild(tree.roots[0], childVal);
      expect(addHandler).toHaveBeenCalledTimes(1);

      // Remove handler
      tree.off('onNodeAdded', addHandler);

      // Adding another child won't trigger the handler
      tree.addNodeAsChild(tree.roots[0], { id: 802 });
      expect(addHandler).toHaveBeenCalledTimes(1);
    });

    it('onNodeMoved is emitted in moveNode (stub)', () => {
      const moveHandler = jest.fn();
      tree.on('onNodeMoved', moveHandler);

      const rootVal: TestNode = { id: 900 };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);

      tree.moveNode(rootNode, rootNode); // Just stub
      expect(moveHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Searching', () => {
    let rootNode: TTreeNode<TestNode>;

    beforeEach(() => {
      rootNode = { value: { id: 1000, name: 'Root' } };
      tree.addRoot(rootNode);
      tree.addNodeAsChild(rootNode, { id: 1001, name: 'ChildA' });
      tree.addNodeAsChild(rootNode, { id: 1002, name: 'ChildB' });
    });

    it('find returns the correct node via predicate', () => {
      const found = tree.find((node) => node.value.id === 1002);
      expect(found?.value.name).toBe('ChildB');
    });

    it('findById uses nodeIndex for direct lookups', () => {
      const found = tree.findById(1001);
      expect(found?.value.name).toBe('ChildA');
    });

    it('find returns null if not found', () => {
      const result = tree.find((node) => node.value.id === 9999);
      expect(result).toBeNull();
    });

    it('findById returns null if not found', () => {
      const result = tree.findById(9999);
      expect(result).toBeNull();
    });
  });

  describe('Cloning', () => {
    it('cloneNode creates a standalone subtree', () => {
      const rootVal: TestNode = { id: 1100, name: 'Root' };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);

      const childVal = { id: 1101, name: 'Child' };
      const childNode = tree.addNodeAsChild(rootNode, childVal);

      const clonedChild = tree.cloneNode(childNode);
      expect(clonedChild).not.toBe(childNode);
      expect(clonedChild.value).toEqual(childVal);
      expect(clonedChild.parent).toBeUndefined();
    });

    it('cloneForest returns an independent Treewise instance', () => {
      const rootA = { value: { id: 1200, name: 'RootA' } };
      const rootB = { value: { id: 1300, name: 'RootB' } };
      tree.addRoot(rootA);
      tree.addRoot(rootB);

      // Add children
      tree.addNodeAsChild(rootA, { id: 1201, name: 'ChildA1' });
      tree.addNodeAsChild(rootB, { id: 1301, name: 'ChildB1' });

      const cloned = tree.cloneForest();
      expect(cloned.roots).toHaveLength(2);
      expect(cloned.countNodes()).toBe(tree.countNodes());
      // Check references
      expect(cloned.roots[0]).not.toBe(rootA);
      expect(cloned.roots[1]).not.toBe(rootB);
    });
  });

  describe('Serialization/Deserialization', () => {
    it('serializes and deserializes the forest correctly', async () => {
      const rootVal: TestNode = { id: 2000, name: 'Root' };
      const rootNode: TTreeNode<TestNode> = { value: rootVal };
      tree.addRoot(rootNode);
      tree.addNodeAsChild(rootNode, { id: 2001, name: 'Child1' });

      const jsonString = tree.serialize();
      const newTree = new Treewise<TestNode>();

      await newTree.deserialize(Promise.resolve(jsonString));
      expect(newTree.countNodes()).toBe(tree.countNodes());
      expect(newTree.findById(2000)?.value.name).toBe('Root');
      expect(newTree.findById(2001)?.parent?.value.id).toBe(2000);
    });

    it('throws on version mismatch', async () => {
      const badData = JSON.stringify({ version: 9999, roots: [] });
      await expect(tree.deserialize(Promise.resolve(badData))).rejects.toThrow(
        /version mismatch/
      );
    });
  });

  describe('Other Methods', () => {
    it('getDepth returns the correct maximum depth', () => {
      // root -> child -> grandchild
      const rootVal: TestNode = { id: 3000, name: 'Root' };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);

      const child = tree.addNodeAsChild(rootNode, { id: 3001, name: 'Child' });
      tree.addNodeAsChild(child, { id: 3002, name: 'Grandchild' });

      expect(tree.getDepth()).toBe(2);
    });

    it('findLeafNodes returns all leaves', () => {
      const rootVal: TestNode = { id: 4000, name: 'Root' };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);

      const c1 = tree.addNodeAsChild(rootNode, { id: 4001, name: 'Child1' });
      tree.addNodeAsChild(c1, { id: 4002, name: 'Child1.1' });
      const c2 = tree.addNodeAsChild(rootNode, { id: 4003, name: 'Child2' });
      // c2 is a leaf because it has no children
      const leaves = tree.findLeafNodes();

      // We have one grandchild and one direct leaf
      expect(leaves.map((node) => node.value.id)).toEqual([4002, 4003]);
    });

    it('toArray returns all nodes in a flat array', () => {
      const rootVal: TestNode = { id: 5000, name: 'Root' };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);

      const c1 = tree.addNodeAsChild(rootNode, { id: 5001, name: 'Child1' });
      const c2 = tree.addNodeAsChild(rootNode, { id: 5002, name: 'Child2' });
      expect(tree.toArray().length).toBe(3);

      // Also verify we can find c1/c2 in the flat array
      const ids = tree.toArray().map((node) => node.value.id);
      expect(ids).toContain(5001);
      expect(ids).toContain(5002);
    });

    it('visualize returns ASCII representation', () => {
      const rootVal: TestNode = { id: 6000, name: 'Root' };
      const rootNode = { value: rootVal };
      tree.addRoot(rootNode);
      tree.addNodeAsChild(rootNode, { id: 6001, name: 'Child' });

      const ascii = tree.visualize();
      // For a simple 2-node tree, we expect:
      // - 6000
      //   - 6001
      expect(ascii).toMatch(/- 6000/);
      expect(ascii).toMatch(/- 6001/);
    });
  });
});

describe('Utility Functions', () => {
  it('deepCopy handles various data types', () => {
    const original = {
      a: 1,
      b: { c: 2, d: [3, 4] },
      date: new Date('2023-01-01'),
      reg: /test/i,
      map: new Map([['x', 42]]),
      set: new Set([5, 6]),
    };
    const copy = deepCopy(original);

    expect(copy).not.toBe(original);
    expect(copy).toEqual(original);
    expect(copy.b).not.toBe(original.b);
    expect(copy.date).toEqual(new Date('2023-01-01'));
    expect(copy.reg).toEqual(/test/i);
    expect(copy.map.get('x')).toBe(42);
    expect(copy.set.has(5)).toBe(true);
  });

  it('processArrayInBatches yields correct batches', () => {
    const data = [1, 2, 3, 4, 5];
    const batchSize = 2;
    const result: number[][] = [];

    for (const batch of processArrayInBatches(data, batchSize)) {
      result.push(batch);
    }
    expect(result).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
  });

  it('processArrayInBatches throws for batchSize <= 0', () => {
    const data = [1, 2, 3];
    expect(() => Array.from(processArrayInBatches(data, 0))).toThrow();
    expect(() => Array.from(processArrayInBatches(data, -1))).toThrow();
  });
});