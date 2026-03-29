import type { ComponentType } from 'react';
import type { Disposable } from './disposable';
import type { SidebarContribution } from './manifest';

// ============================================================
// Extension Context
// ============================================================

export interface ExtensionContext {
  /** Extension 고유 ID */
  extensionId: string;
  /** Extension 루트 경로 */
  extensionPath: string;
  /** Disposable 등록 — deactivate 시 자동 정리 */
  subscriptions: Disposable[];
}

// ============================================================
// Base API (browser + node 공통)
// ============================================================

export interface MatrixBaseAPI {
  /** 커맨드 등록/실행 */
  commands: {
    register(commandId: string, handler: (...args: unknown[]) => unknown): Disposable;
    execute<T = unknown>(commandId: string, ...args: unknown[]): Promise<T>;
  };

  /** Extension 간 이벤트 통신 */
  events: {
    on(event: string, handler: (...args: unknown[]) => void): Disposable;
    emit(event: string, ...args: unknown[]): void;
  };

  /** Extension 로컬 상태 저장 (앱 재시작 후에도 유지) */
  storage: {
    get<T>(key: string): T | undefined;
    set(key: string, value: unknown): void;
  };
}

// ============================================================
// Browser API (renderer process 전용)
// ============================================================

export interface ViewsAPI {
  /** 뷰 컴포넌트 등록 */
  register(viewId: string, component: ComponentType<Record<string, unknown>>): void;
  /** 뷰 열기 */
  open(viewId: string, props?: Record<string, unknown>): void;
  /** 뷰 닫기 */
  close(viewId: string): void;
}

export interface SidebarAPI {
  /** 사이드바 항목 등록 (manifest 외에 동적 추가 시) */
  register(item: SidebarContribution): void;
  /** 사이드바 항목 선택 이벤트 */
  onSelect(itemId: string, handler: () => void): Disposable;
  /** 사이드바 항목에 뱃지 표시 */
  setBadge(itemId: string, count: number): void;
}

export interface MatrixBrowserAPI extends MatrixBaseAPI {
  views: ViewsAPI;
  sidebar: SidebarAPI;
}

// ============================================================
// Node API (main process 전용)
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
