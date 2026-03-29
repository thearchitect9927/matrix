import { contextBridge, ipcRenderer } from 'electron';
import type { IPCMessage, IPCResponse } from '@shared/types/ipc';

/**
 * Preload script for Electron renderer process
 *
 * This script runs in a privileged context with access to both Node.js APIs
 * and the renderer process window. It uses contextBridge to safely expose
 * IPC communication methods to the renderer.
 *
 * Security: contextIsolation is enabled, so we use contextBridge to create
 * a secure bridge between main process and renderer process.
 */

// Expose IPC API to renderer process via context bridge
contextBridge.exposeInMainWorld('api', {
  // Extension IPC bridge — generic invoke for Extension handlers
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * Send an IPC message to the Python backend via the main process
   * @param message - The IPC message to send
   * @returns Promise that resolves with the response from Python backend
   */
  sendMessage: async (message: IPCMessage): Promise<IPCResponse> => {
    return ipcRenderer.invoke('ipc:send-to-python', message);
  },

  /**
   * Subscribe to IPC events from the main process
   * @param channel - The event channel to listen to
   * @param callback - Function to call when event is received
   */
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },

  /**
   * Unsubscribe from IPC events
   * @param channel - The event channel to stop listening to
   * @param callback - The callback function to remove
   */
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // ── System Check APIs (Onboarding) ──────────────────────────────────

  /**
   * Check if a CLI command exists on the system
   * @param command - Command name to check (e.g., 'claude', 'git')
   * @returns Detection result with path and version info
   */
  checkCommand: (
    command: string
  ): Promise<{ exists: boolean; path?: string; version?: string }> => {
    return ipcRenderer.invoke('system:check-command', command);
  },

  /**
   * Execute a whitelisted command and return output + exit code
   * @param command - Command to execute (e.g., "uv --version")
   * @returns Execution result with stdout, stderr, and exit code
   */
  execCommand: (
    command: string
  ): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> => {
    return ipcRenderer.invoke('system:exec-command', command);
  },

  /**
   * Streaming command execution with real-time output
   */
  execStream: {
    start: (sessionId: string, command: string): Promise<{ started: boolean }> => {
      return ipcRenderer.invoke('system:exec-stream', sessionId, command);
    },
    kill: (sessionId: string): void => {
      ipcRenderer.send('system:exec-stream-kill', sessionId);
    },
    onData: (callback: (sessionId: string, data: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, data: string) =>
        callback(sessionId, data);
      ipcRenderer.on('exec-stream:data', listener);
      return () => ipcRenderer.removeListener('exec-stream:data', listener);
    },
    onExit: (callback: (sessionId: string, exitCode: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, exitCode: number) =>
        callback(sessionId, exitCode);
      ipcRenderer.on('exec-stream:exit', listener);
      return () => ipcRenderer.removeListener('exec-stream:exit', listener);
    },
  },

  /**
   * Check if an agent has stored auth credentials
   * @param agentId - Agent identifier (e.g., 'claude')
   * @returns Whether the agent is authenticated
   */
  checkAgentAuth: (agentId: string): Promise<{ authenticated: boolean }> => {
    return ipcRenderer.invoke('system:check-agent-auth', agentId);
  },

  /**
   * Validate that a file path points to an executable
   * @param filePath - Absolute path to check
   * @returns Validation result with optional version info
   */
  validateExecutable: (
    filePath: string
  ): Promise<{ valid: boolean; version?: string; error?: string }> => {
    return ipcRenderer.invoke('system:validate-executable', filePath);
  },

  /**
   * Detect installed terminal emulators on the system
   * @returns Array of detected terminals with name, id, path, and isDefault flag
   */
  detectTerminals: (): Promise<
    Array<{ id: string; name: string; path: string; isDefault: boolean }>
  > => {
    return ipcRenderer.invoke('system:detect-terminals');
  },

  /**
   * Detect available shells for PTY terminal sessions (zsh, bash, fish, etc.)
   * @returns Array of detected shells with name, id, path, and isDefault flag
   */
  detectShells: (): Promise<
    Array<{ id: string; name: string; path: string; isDefault: boolean }>
  > => {
    return ipcRenderer.invoke('system:detect-shells');
  },

  /**
   * Detect installed IDEs / code editors on the system
   * @returns Array of detected IDEs with id, name, and path
   */
  detectIDEs: (): Promise<Array<{ id: string; name: string; path: string }>> => {
    return ipcRenderer.invoke('system:detect-ides');
  },

  /**
   * Read application config from ~/.matrix/.matrix.json
   */
  readConfig: (): Promise<Record<string, unknown>> => {
    return ipcRenderer.invoke('config:read');
  },

  /**
   * Write application config to ~/.matrix/.matrix.json
   */
  writeConfig: (config: Record<string, unknown>): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('config:write', config);
  },

  /**
   * Reset application config to defaults (overwrites entire file)
   */
  resetConfig: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('config:reset');
  },

  /**
   * Get application paths (config, DB, workspace)
   */
  getPaths: (): Promise<{ configPath: string; dbPath: string; workspacePath: string }> => {
    return ipcRenderer.invoke('system:get-paths');
  },

  /**
   * Open a URL in the default browser
   */
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('shell:open-external', url);
  },

  /**
   * Show directory picker dialog
   * @returns Selected directory path or null if cancelled
   */
  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-directory');
  },

  // ── Terminal PTY APIs ─────────────────────────────────────────

  terminal: {
    /**
     * Create a new terminal PTY session
     * @param sessionId - Unique identifier for the session
     * @param options - Shell, cwd, cols, rows configuration
     * @returns Result with sessionId and pid
     */
    create: (
      sessionId: string,
      options: { shell: string; cwd?: string; cols: number; rows: number }
    ): Promise<{ success: boolean; data?: { sessionId: string; pid: number }; error?: string }> => {
      return ipcRenderer.invoke('terminal:create', sessionId, options);
    },

    /**
     * Write data to a terminal session's stdin
     * Uses send (fire-and-forget) for performance
     */
    write: (sessionId: string, data: string): void => {
      ipcRenderer.send('terminal:write', sessionId, data);
    },

    /**
     * Resize a terminal session
     * Uses send (fire-and-forget) for performance
     */
    resize: (sessionId: string, cols: number, rows: number): void => {
      ipcRenderer.send('terminal:resize', sessionId, cols, rows);
    },

    /**
     * Close a terminal session and kill the PTY process
     */
    close: (sessionId: string): void => {
      ipcRenderer.send('terminal:close', sessionId);
    },

    /**
     * Subscribe to terminal data output events
     * @param callback - Called with (sessionId, data) when PTY produces output
     * @returns Cleanup function to remove the listener
     */
    onData: (callback: (sessionId: string, data: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, data: string) =>
        callback(sessionId, data);
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    },

    /**
     * Subscribe to terminal exit events
     * @param callback - Called with (sessionId, exitCode) when PTY exits
     * @returns Cleanup function to remove the listener
     */
    onExit: (callback: (sessionId: string, exitCode: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, exitCode: number) =>
        callback(sessionId, exitCode);
      ipcRenderer.on('terminal:exit', listener);
      return () => ipcRenderer.removeListener('terminal:exit', listener);
    },

    /**
     * Save terminal state to a Matrix workspace
     */
    saveState: (
      workspacePath: string,
      state: import('@shared/types/terminal').SavedTerminalState,
      scrollbacks: Array<{ sessionId: string; content: string }>
    ): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('terminal:save-state', workspacePath, state, scrollbacks);
    },

    /**
     * Load terminal state from a Matrix workspace
     */
    loadState: (
      workspacePath: string
    ): Promise<{
      success: boolean;
      data?: {
        state: import('@shared/types/terminal').SavedTerminalState;
        scrollbacks: Record<string, string>;
      } | null;
      error?: string;
    }> => {
      return ipcRenderer.invoke('terminal:load-state', workspacePath);
    },
  },
});
