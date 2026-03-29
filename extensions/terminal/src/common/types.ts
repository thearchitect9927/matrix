// Re-export existing terminal types for now.
// These will be moved here fully in Phase 5 when apps/desktop/src/shared is removed.

export interface TerminalCreateOptions {
  shell: string;
  cwd?: string;
  cols: number;
  rows: number;
}

export interface TerminalSessionInfo {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  status: 'active' | 'exited' | 'error';
  pid?: number;
  exitCode?: number;
  createdAt: Date;
}

export interface SavedTerminalSession {
  id: string;
  name: string;
  shell: string;
  cwd: string;
}

export interface SavedTerminalState {
  sessions: SavedTerminalSession[];
  savedAt: string;
}
