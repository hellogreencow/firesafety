// Mock Electron API for web mode
export const app = {
  getPath: () => '',
  getName: () => 'Fire Safety AI Assistant',
  getVersion: () => '1.0.0',
};

export const ipcRenderer = {
  send: () => {},
  on: () => {},
  removeListener: () => {},
  invoke: () => Promise.resolve(null)
};

// For default import compatibility
const electron = {
  app,
  ipcRenderer
};

export default electron; 