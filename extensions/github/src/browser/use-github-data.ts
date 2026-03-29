import { useState, useEffect, useCallback } from 'react';
import type { GitHubAuthStatus, GitHubIssue, GitHubPR } from '../common/types';

export function useGitHubAuth() {
  const [status, setStatus] = useState<GitHubAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await window.api.invoke('github:check-auth')) as GitHubAuthStatus;
      setStatus(result);
    } catch {
      setStatus({ installed: false, authenticated: false, user: null, error: 'Check failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { status, loading, refresh: check };
}

export function useGitHubIssues(owner: string, repo: string, state: string = 'open') {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    try {
      const result = (await window.api.invoke(
        'github:list-issues',
        owner,
        repo,
        state
      )) as GitHubIssue[];
      setIssues(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  }, [owner, repo, state]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { issues, loading, error, refresh: fetch };
}

export function useGitHubPRs(owner: string, repo: string, state: string = 'open') {
  const [prs, setPRs] = useState<GitHubPR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    try {
      const result = (await window.api.invoke('github:list-prs', owner, repo, state)) as GitHubPR[];
      setPRs(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
    } finally {
      setLoading(false);
    }
  }, [owner, repo, state]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { prs, loading, error, refresh: fetch };
}
