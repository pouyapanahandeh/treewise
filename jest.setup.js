// jest.setup.js
// Workaround for Node.js 25 localStorage issue with jest
if (typeof global.localStorage === 'undefined') {
  // Mock localStorage if it doesn't exist
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
}
