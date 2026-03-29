import { useState, useEffect } from 'react';
import type { GitHubAuthStatus } from '../common/types';

export function GitHubSetupPrompt() {
  const [status, setStatus] = useState<GitHubAuthStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const checkAuth = async () => {
    setChecking(true);
    try {
      const result = (await window.api.invoke('github:check-auth')) as GitHubAuthStatus;
      setStatus(result);
    } catch {
      setStatus({ installed: false, authenticated: false, user: null, error: 'Check failed' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (checking && !status) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        <div className="flex items-center gap-2 text-sm">
          <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Checking GitHub CLI...
        </div>
      </div>
    );
  }

  if (status?.installed && status?.authenticated) return null;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold text-white">
          {!status?.installed ? 'GitHub CLI Required' : 'GitHub Authentication Required'}
        </h3>
        <p className="mb-4 text-sm text-white/50">
          {!status?.installed
            ? 'Install the GitHub CLI (gh) to view Issues and Pull Requests.'
            : 'Run "gh auth login" in your terminal to authenticate.'}
        </p>
        <code className="block rounded-md bg-black/30 px-4 py-2 text-sm text-green-400">
          {!status?.installed ? 'brew install gh' : 'gh auth login'}
        </code>
        {status?.error && <p className="mt-3 text-xs text-red-400">{status.error}</p>}
        <button
          onClick={checkAuth}
          disabled={checking}
          className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {checking ? 'Checking...' : 'Check Again'}
        </button>
      </div>
    </div>
  );
}
