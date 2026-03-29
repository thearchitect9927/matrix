import type { SavedTerminalState } from '@shared/types/terminal';

export interface ElectronAPI {
  // Generic Extension IPC
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;

  // Events
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;

  // System check
  checkCommand: (command: string) => Promise<{ exists: boolean; path?: string; version?: string }>;
  execCommand: (
    command: string
  ) => Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }>;

  // Config
  readConfig: () => Promise<Record<string, unknown>>;
  writeConfig: (config: Record<string, unknown>) => Promise<{ success: boolean }>;
  getPaths: () => Promise<{ configPath: string; dbPath: string; workspacePath: string }>;
  selectDirectory: () => Promise<string | null>;

  // Terminal PTY
  terminal: {
    create: (
      sessionId: string,
      options: { shell: string; cwd?: string; cols: number; rows: number }
    ) => Promise<{ success: boolean; data?: { sessionId: string; pid: number }; error?: string }>;
    write: (sessionId: string, data: string) => void;
    resize: (sessionId: string, cols: number, rows: number) => void;
    close: (sessionId: string) => void;
    onData: (callback: (sessionId: string, data: string) => void) => () => void;
    onExit: (callback: (sessionId: string, exitCode: number) => void) => () => void;
    saveState: (
      workspacePath: string,
      state: SavedTerminalState,
      scrollbacks: Array<{ sessionId: string; content: string }>
    ) => Promise<{ success: boolean; error?: string }>;
    loadState: (workspacePath: string) => Promise<{
      success: boolean;
      data?: { state: SavedTerminalState; scrollbacks: Record<string, string> } | null;
      error?: string;
    }>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
