import { deepCopy, processArrayInBatches, traverseTree, modifyTree, TTreeNode } from './treewise';

describe('deepCopy', () => {
  it('should create a deep copy of an array', () => {
    const arr = [{ a: 1 }, { b: 2 }];
    const copiedArr = deepCopy(arr);
    expect(copiedArr).toEqual(arr);
    expect(copiedArr).not.toBe(arr);
    expect(copiedArr[0]).not.toBe(arr[0]);
  });

  it('should create a deep copy of an object', () => {
    const obj = { a: { b: 1 }, c: 2 };
    const copiedObj = deepCopy(obj);
    expect(copiedObj).toEqual(obj);
    expect(copiedObj).not.toBe(obj);
    expect(copiedObj.a).not.toBe(obj.a);
  });

  it('should handle null and undefined correctly', () => {
    expect(deepCopy(null)).toBeNull();
    expect(deepCopy(undefined)).toBeUndefined();
  });
});

describe('processArrayInBatches', () => {
  it('should divide array into correct batch sizes', () => {
    const arr = [1, 2, 3, 4, 5];
    const batchSize = 2;
    const result = processArrayInBatches(arr, batchSize);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should handle empty array', () => {
    expect(processArrayInBatches([], 3)).toEqual([]);
  });

  it('should return empty array for zero or negative batch size', () => {
    expect(processArrayInBatches([1, 2, 3], 0)).toEqual([]);
    expect(processArrayInBatches([1, 2, 3], -1)).toEqual([]);
  });
});

describe('Tree Functions', () => {
  let tree: TTreeNode<number>;

  beforeEach(() => {
    tree = {
      value: 1,
      children: [
        { value: 2, children: [] },
        { value: 3, children: [
          { value: 4, children: [] }
        ]}
      ]
    };
  });

  it('traverseTree should visit all nodes in depth-first order', () => {
    const values: number[] = [];
    traverseTree(tree, node => values.push(node.value));
    expect(values).toEqual([1, 2, 3, 4]);
  });

  it('modifyTree should modify all nodes', () => {
    modifyTree(tree, node => { node.value *= 2; });
    expect(tree.value).toBe(2);
    expect(tree.children[0].value).toBe(4);
    expect(tree.children[1].value).toBe(6);
    expect(tree.children[1].children[0].value).toBe(8);
  });
});
