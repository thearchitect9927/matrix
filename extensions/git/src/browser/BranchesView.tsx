import { GitBranch } from 'lucide-react';

export function BranchesView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white/40">
      <GitBranch size={48} />
      <h2 className="text-lg font-medium text-white/60">Branches</h2>
      <p className="text-sm">Select a repository to view branches and worktrees.</p>
    </div>
  );
}
