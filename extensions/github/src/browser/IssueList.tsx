import { CircleDot } from 'lucide-react';

export function IssueList() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white/40">
      <CircleDot size={48} />
      <h2 className="text-lg font-medium text-white/60">Issues</h2>
      <p className="text-sm">Select a Matrix with repositories to view Issues.</p>
    </div>
  );
}
