// treewise

export interface TTreeNode<T> {
    value: T;
    children: TTreeNode<T>[];
  }
  
  /**
   * Deeply copies an object/array.
   * @param obj The object/array to be copied.
   * @returns A deep copy of the object/array.
   */
  export function deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
  
    let copy: T;
    
    if (Array.isArray(obj)) {
      copy = [] as unknown as T;
      (obj as unknown as any[]).forEach((item, index) => {
        (copy as unknown as any[])[index] = deepCopy(item);
      });
    } else {
      copy = {} as T;
      Object.keys(obj).forEach(key => {
        (copy as any)[key] = deepCopy((obj as any)[key]);
      });
    }
  
    return copy;
  }
  
  /**
   * Processes a large array by dividing it into batches of a specified size.
   * @param array The array to be processed.
   * @param batchSize The size of each batch.
   * @returns An array of batches.
   */
  export function processArrayInBatches<T>(array: T[], batchSize: number): T[][] {
    if (array.length === 0 || batchSize <= 0) {
      return [];
    }
  
    return Array.from({length: Math.ceil(array.length / batchSize)}, (_, i) => array.slice(i * batchSize, i * batchSize + batchSize));
  }
  
  /**
   * Performs a depth first traversal of a tree.
   * @param root The root node of the tree.
   * @param callback The callback function to be invoked for each node.
   * @param depth The current depth in the tree (default is 0).
   */
  export function traverseTree<T>(root: TTreeNode<T> | null, callback: (node: TTreeNode<T>, depth: number) => void, depth: number = 0): void {
    if (!root) {
      return;
    }
  
    callback(root, depth);
  
    root.children.forEach(child => {
      traverseTree(child, callback, depth + 1);
    });
  }
  
  /**
   * @param root The root node of the tree.
   * @param modifyFn The function to be applied to each node.
   */
  export function modifyTree<T>(root: TTreeNode<T> | null, modifyFn: (node: TTreeNode<T>) => void): void {
    if (!root) {
      return;
    }
  
    modifyFn(root);
  
    root.children.forEach(child => {
      modifyTree(child, modifyFn);
    });
  }  