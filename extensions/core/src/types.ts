import type { ComponentType } from 'react';
import type { Disposable } from './disposable';
import type { SidebarContribution } from './manifest';

// ============================================================
// Extension Context
// ============================================================

export interface ExtensionContext {
  /** Extension unique ID */
  extensionId: string;
  /** Extension root path */
  extensionPath: string;
  /** Register Disposables — automatically cleaned up on deactivate */
  subscriptions: Disposable[];
}

// ============================================================
// Base API (shared between browser + node)
// ============================================================

export interface MatrixBaseAPI {
  /** Command registration/execution */
  commands: {
    register(commandId: string, handler: (...args: unknown[]) => unknown): Disposable;
    execute<T = unknown>(commandId: string, ...args: unknown[]): Promise<T>;
  };

  /** Inter-Extension event communication */
  events: {
    on(event: string, handler: (...args: unknown[]) => void): Disposable;
    emit(event: string, ...args: unknown[]): void;
  };

  /** Extension local state storage (persists across app restarts) */
  storage: {
    get<T>(key: string): T | undefined;
    set(key: string, value: unknown): void;
  };
}

// ============================================================
// Browser API (renderer process specific)
// ============================================================

export interface ViewsAPI {
  /** Register a view component */
  register(viewId: string, component: ComponentType<Record<string, unknown>>): void;
  /** Open a view */
  open(viewId: string, props?: Record<string, unknown>): void;
  /** Close a view */
  close(viewId: string): void;
}

export interface SidebarAPI {
  /** Register a sidebar item (for dynamic additions beyond the manifest) */
  register(item: SidebarContribution): void;
  /** Sidebar item select event */
  onSelect(itemId: string, handler: () => void): Disposable;
  /** Display a badge on a sidebar item */
  setBadge(itemId: string, count: number): void;
}

export interface MatrixBrowserAPI extends MatrixBaseAPI {
  views: ViewsAPI;
  sidebar: SidebarAPI;
}

// ============================================================
// Node API (main process specific)
// ============================================================

export interface FileSystemAPI {
  readFile(filePath: string, encoding?: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(dirPath: string): Promise<string[]>;
  exists(filePath: string): Promise<boolean>;
  remove(filePath: string): Promise<void>;
  readJSON<T = unknown>(filePath: string): Promise<T>;
  writeJSON(filePath: string, data: unknown): Promise<void>;
}

export interface GitAPI {
  clone(url: string, dest: string, options?: { bare?: boolean }): Promise<void>;
  worktreeAdd(repo: string, dest: string, branch: string): Promise<void>;
  worktreeRemove(worktreePath: string): Promise<void>;
  worktreeList(repo: string): Promise<WorktreeInfo[]>;
  branchList(repo: string): Promise<BranchInfo[]>;
  status(repo: string): Promise<GitStatusInfo>;
}

export interface ShellAPI {
  exec(command: string, options?: ShellExecOptions): Promise<ShellExecResult>;
}

export interface MatrixNodeAPI extends MatrixBaseAPI {
  fs: FileSystemAPI;
  git: GitAPI;
  shell: ShellAPI;
}

// ============================================================
// Supporting types
// ============================================================

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  bare: boolean;
}

export interface BranchInfo {
  name: string;
  current: boolean;
  remote?: string;
  lastCommit?: string;
}

export interface GitStatusInfo {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface ShellExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ShellExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ============================================================
// Extension activate/deactivate signatures
// ============================================================

export interface BrowserExtensionModule {
  activate(api: MatrixBrowserAPI, context: ExtensionContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export interface NodeExtensionModule {
  activate(api: MatrixNodeAPI, context: ExtensionContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
