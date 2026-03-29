// @matrix/core — Extension API types and SDK

// Disposable pattern
export type { Disposable } from './disposable';
export { DisposableStore, toDisposable } from './disposable';

// Manifest types
export type {
  Manifest,
  ExtensionInfo,
  ExtensionContributions,
  SidebarContribution,
  ViewContribution,
  CommandContribution,
} from './manifest';

// API types
export type {
  ExtensionContext,
  MatrixBaseAPI,
  MatrixBrowserAPI,
  MatrixNodeAPI,
  ViewsAPI,
  SidebarAPI,
  FileSystemAPI,
  GitAPI,
  ShellAPI,
  WorktreeInfo,
  BranchInfo,
  GitStatusInfo,
  ShellExecOptions,
  ShellExecResult,
  BrowserExtensionModule,
  NodeExtensionModule,
} from './types';

// Testing utilities
export { createMockBrowserAPI, createMockNodeAPI, createMockContext } from './testing';
