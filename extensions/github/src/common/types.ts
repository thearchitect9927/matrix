export interface GitHubRepo {
  owner: string;
  repo: string;
  full_name: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  author: string;
  created_at: string;
  updated_at: string;
  labels: string[];
  url: string;
  _repository?: { owner: string; name: string };
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  author: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  base_branch: string;
  draft: boolean;
  mergeable: boolean;
  url: string;
  _repository?: { owner: string; name: string };
}

export interface GitHubAuthStatus {
  installed: boolean;
  authenticated: boolean;
  user: string | null;
  error?: string;
}
