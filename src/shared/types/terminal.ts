/**
 * Terminal Type Definitions
 *
 * Shared types for the embedded terminal feature.
 * Used across main process (PTY manager), preload (IPC bridge),
 * and renderer (React components).
 */

/**
 * Configuration for creating a new terminal session
 */
export interface TerminalConfig {
  /** Shell executable path (e.g., /bin/zsh, /bin/bash) */
  shell: string;
  /** Optional arguments to pass to the shell */
  args?: string[];
  /** Initial working directory */
  cwd?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
}

/**
 * Options passed to the PTY manager when creating a session
 */
export interface TerminalCreateOptions {
  /** Shell executable path */
  shell: string;
  /** Initial working directory */
  cwd?: string;
  /** Terminal column count */
  cols: number;
  /** Terminal row count */
  rows: number;
}

/**
 * Result returned after creating a terminal session
 */
export interface TerminalCreateResult {
  /** Unique session identifier */
  sessionId: string;
  /** PID of the spawned shell process */
  pid: number;
}

/**
 * Terminal session status
 */
export type TerminalSessionStatus = 'active' | 'exited' | 'error';

/**
 * Metadata for a terminal session
 */
export interface TerminalSessionInfo {
  /** Unique session identifier */
  id: string;
  /** Display name for the terminal tab */
  name: string;
  /** Shell executable used */
  shell: string;
  /** Current working directory */
  cwd: string;
  /** Current status */
  status: TerminalSessionStatus;
  /** Shell process PID */
  pid?: number;
  /** Exit code (set when status is 'exited') */
  exitCode?: number;
  /** Timestamp when session was created */
  createdAt: Date;
}

/**
 * Serialized terminal session for persistence (no runtime-only fields)
 */
export interface SavedTerminalSession {
  /** Unique session identifier */
  id: string;
  /** Display name for the terminal */
  name: string;
  /** Shell executable used */
  shell: string;
  /** Working directory */
  cwd: string;
}

/**
 * Persisted terminal state for a Matrix workspace
 */
export interface SavedTerminalState {
  /** List of saved sessions */
  sessions: SavedTerminalSession[];
  /** ISO 8601 timestamp of when state was last saved */
  savedAt: string;
}

/**
 * Detected shell information (from system detection)
 */
export interface DetectedShell {
  /** Shell identifier */
  id: string;
  /** Display name */
  name: string;
  /** Absolute path to the shell executable */
  path: string;
  /** Whether this is the system default shell */
  isDefault: boolean;
}
