import { contextBridge, ipcRenderer } from 'electron';
import type { SavedTerminalState } from '@shared/types/terminal';

/**
 * Preload script — secure bridge between main and renderer process.
 * contextIsolation enabled, nodeIntegration disabled.
 */
contextBridge.exposeInMainWorld('api', {
  // Generic IPC invoke — used by all Extension handlers
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // Event subscription
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // System check APIs (used by onboarding)
  checkCommand: (
    command: string
  ): Promise<{ exists: boolean; path?: string; version?: string }> => {
    return ipcRenderer.invoke('system:check-command', command);
  },

  execCommand: (
    command: string
  ): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> => {
    return ipcRenderer.invoke('system:exec-command', command);
  },

  // Config APIs
  readConfig: (): Promise<Record<string, unknown>> => {
    return ipcRenderer.invoke('config:read');
  },

  writeConfig: (config: Record<string, unknown>): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('config:write', config);
  },

  getPaths: (): Promise<{ configPath: string; dbPath: string; workspacePath: string }> => {
    return ipcRenderer.invoke('system:get-paths');
  },

  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-directory');
  },

  // Terminal PTY APIs
  terminal: {
    create: (
      sessionId: string,
      options: { shell: string; cwd?: string; cols: number; rows: number }
    ): Promise<{ success: boolean; data?: { sessionId: string; pid: number }; error?: string }> => {
      return ipcRenderer.invoke('terminal:create', sessionId, options);
    },

    write: (sessionId: string, data: string): void => {
      ipcRenderer.send('terminal:write', sessionId, data);
    },

    resize: (sessionId: string, cols: number, rows: number): void => {
      ipcRenderer.send('terminal:resize', sessionId, cols, rows);
    },

    close: (sessionId: string): void => {
      ipcRenderer.send('terminal:close', sessionId);
    },

    onData: (callback: (sessionId: string, data: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, data: string) =>
        callback(sessionId, data);
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    },

    onExit: (callback: (sessionId: string, exitCode: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, exitCode: number) =>
        callback(sessionId, exitCode);
      ipcRenderer.on('terminal:exit', listener);
      return () => ipcRenderer.removeListener('terminal:exit', listener);
    },

    saveState: (
      workspacePath: string,
      state: SavedTerminalState,
      scrollbacks: Array<{ sessionId: string; content: string }>
    ): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('terminal:save-state', workspacePath, state, scrollbacks);
    },

    loadState: (
      workspacePath: string
    ): Promise<{
      success: boolean;
      data?: { state: SavedTerminalState; scrollbacks: Record<string, string> } | null;
      error?: string;
    }> => {
      return ipcRenderer.invoke('terminal:load-state', workspacePath);
    },
  },
});
