// Mock electron interface
interface ElectronAPI {
  app?: {
    getPath: (name: string) => string;
  };
  // Add other electron APIs as needed
}

let electronAPI: ElectronAPI | null = null;

// Only try to load electron if we're in electron mode
if (process.env.ELECTRON === 'true') {
  try {
    // @ts-ignore - Dynamically require electron only in electron mode
    electronAPI = require('electron');
  } catch (e) {
    console.warn('Failed to load electron:', e);
  }
}

export const getElectron = () => electronAPI;

export const isElectron = () => process.env.ELECTRON === 'true';

// Safe path joining function that works in both environments
export const joinPath = (...parts: string[]) => {
  if (isElectron()) {
    try {
      // @ts-ignore - Dynamically require path only in electron mode
      const path = require('path');
      return path.join(...parts);
    } catch (e) {
      return parts.join('/');
    }
  }
  return parts.join('/');
}; 