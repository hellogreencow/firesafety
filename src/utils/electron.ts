// This file provides safe fallbacks for Electron functionality in web mode
export const isElectron = () => {
  return process.env.ELECTRON === "true";
};

export const getElectron = () => {
  if (isElectron()) {
    try {
      const electron = require('electron');
      return electron;
    } catch (e) {
      console.warn('Failed to load electron:', e);
      return null;
    }
  }
  return null;
};

export const getPath = (name: string): string => {
  if (isElectron()) {
    const electron = getElectron();
    if (electron?.app) {
      return electron.app.getPath(name);
    }
  }
  return '';
};

// Add other Electron-specific utilities with web fallbacks here
export const isDev = () => {
  if (isElectron()) {
    try {
      return require('electron-is-dev');
    } catch (e) {
      return process.env.NODE_ENV === 'development';
    }
  }
  return process.env.NODE_ENV === 'development';
}; 