export interface Branch {
  name: string;
  current: boolean;
  remote?: string;
  lastCommit?: string;
}

export interface Worktree {
  path: string;
  branch: string;
  head: string;
  bare: boolean;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface WorktreeCreateOptions {
  repository: string;
  destination: string;
  branch: string;
  createBranch?: boolean;
}
