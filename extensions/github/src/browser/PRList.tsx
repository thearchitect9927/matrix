import { GitPullRequest } from 'lucide-react';

export function PRList() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white/40">
      <GitPullRequest size={48} />
      <h2 className="text-lg font-medium text-white/60">Pull Requests</h2>
      <p className="text-sm">Select a Matrix with repositories to view PRs.</p>
    </div>
  );
}
