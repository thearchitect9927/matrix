import type { IPCMessage, IPCResponse } from '@shared/types/ipc';
import type { SavedTerminalState } from '@shared/types/terminal';

/**
 * Type definitions for the Electron preload API exposed to renderer
 *
 * These types ensure type safety when using window.api in the renderer process.
 */

export interface ElectronAPI {
  /**
   * Send an IPC message to the Python backend via the main process
   * @param message - The IPC message to send
   * @returns Promise that resolves with the response from Python backend
   */
  sendMessage: (message: IPCMessage) => Promise<IPCResponse>;

  /**
   * Subscribe to IPC events from the main process
   * @param channel - The event channel to listen to
   * @param callback - Function to call when event is received
   */
  on: (channel: string, callback: (...args: unknown[]) => void) => void;

  /**
   * Unsubscribe from IPC events
   * @param channel - The event channel to stop listening to
   * @param callback - The callback function to remove
   */
  off: (channel: string, callback: (...args: unknown[]) => void) => void;

  // ── System Check APIs (Onboarding) ──────────────────────────────────

  /**
   * Check if a CLI command exists on the system
   * @param command - Command name to check (e.g., 'claude', 'git')
   * @returns Detection result with path and version info
   */
  checkCommand: (command: string) => Promise<{ exists: boolean; path?: string; version?: string }>;

  /**
   * Execute a whitelisted command and return output + exit code
   */
  execCommand: (
    command: string
  ) => Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }>;

  /** Streaming command execution with real-time output */
  execStream: {
    start: (sessionId: string, command: string) => Promise<{ started: boolean }>;
    kill: (sessionId: string) => void;
    onData: (callback: (sessionId: string, data: string) => void) => () => void;
    onExit: (callback: (sessionId: string, exitCode: number) => void) => () => void;
  };

  /**
   * Check if an agent has stored auth credentials
   */
  checkAgentAuth: (agentId: string) => Promise<{ authenticated: boolean }>;

  /**
   * Validate that a file path points to an executable
   */
  validateExecutable: (
    filePath: string
  ) => Promise<{ valid: boolean; version?: string; error?: string }>;

  /**
   * Detect installed terminal emulators on the system
   * @returns Array of detected terminals with name, id, path, and isDefault flag
   */
  detectTerminals: () => Promise<
    Array<{ id: string; name: string; path: string; isDefault: boolean }>
  >;

  /**
   * Detect available shells for PTY terminal sessions (zsh, bash, fish, etc.)
   * @returns Array of detected shells with name, id, path, and isDefault flag
   */
  detectShells: () => Promise<
    Array<{ id: string; name: string; path: string; isDefault: boolean }>
  >;

  /**
   * Detect installed IDEs / code editors on the system
   * @returns Array of detected IDEs with id, name, and path
   */
  detectIDEs: () => Promise<Array<{ id: string; name: string; path: string }>>;

  /**
   * Read application config from ~/.matrix/.matrix.json
   */
  readConfig: () => Promise<Record<string, unknown>>;

  /**
   * Write application config to ~/.matrix/.matrix.json (merges with existing)
   */
  writeConfig: (config: Record<string, unknown>) => Promise<{ success: boolean }>;

  /**
   * Reset application config to defaults (overwrites entire file)
   */
  resetConfig: () => Promise<{ success: boolean }>;

  /**
   * Get application paths (config, DB, workspace)
   */
  getPaths: () => Promise<{ configPath: string; dbPath: string; workspacePath: string }>;

  /**
   * Open a URL in the default browser
   */
  openExternal: (url: string) => Promise<void>;

  /**
   * Show directory picker dialog
   * @returns Selected directory path or null if cancelled
   */
  selectDirectory: () => Promise<string | null>;

  // ── Terminal PTY APIs ─────────────────────────────────────────

  terminal: {
    /** Create a new terminal PTY session */
    create: (
      sessionId: string,
      options: { shell: string; cwd?: string; cols: number; rows: number }
    ) => Promise<{ success: boolean; data?: { sessionId: string; pid: number }; error?: string }>;

    /** Write data to a terminal session's stdin */
    write: (sessionId: string, data: string) => void;

    /** Resize a terminal session */
    resize: (sessionId: string, cols: number, rows: number) => void;

    /** Close a terminal session */
    close: (sessionId: string) => void;

    /** Subscribe to terminal data output events */
    onData: (callback: (sessionId: string, data: string) => void) => () => void;

    /** Subscribe to terminal exit events */
    onExit: (callback: (sessionId: string, exitCode: number) => void) => () => void;

    /** Save terminal state to a Matrix workspace */
    saveState: (
      workspacePath: string,
      state: SavedTerminalState,
      scrollbacks: Array<{ sessionId: string; content: string }>
    ) => Promise<{ success: boolean; error?: string }>;

    /** Load terminal state from a Matrix workspace */
    loadState: (workspacePath: string) => Promise<{
      success: boolean;
      data?: {
        state: SavedTerminalState;
        scrollbacks: Record<string, string>;
      } | null;
      error?: string;
    }>;
  };

  // Extension IPC bridge
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
