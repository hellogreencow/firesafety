// Platform-specific utilities with web fallbacks
import { isElectron, getElectron, joinPath } from './electronLoader';

export const getPlatform = () => {
  if (isElectron()) {
    return process.platform;
  }
  return 'web';
};

export const getPath = (...args: string[]) => {
  return joinPath(...args);
};

export const getAppPath = (name: string) => {
  const electron = getElectron();
  if (electron?.app) {
    return electron.app.getPath(name);
  }
  return '';
};

export const isDev = () => {
  return process.env.NODE_ENV === 'development';
}; 