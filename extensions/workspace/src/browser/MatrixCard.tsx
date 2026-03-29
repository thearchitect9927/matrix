import { FolderGit2, Trash2 } from 'lucide-react';
import type { Matrix } from '../common/types';

interface MatrixCardProps {
  matrix: Matrix;
  onDelete: () => void;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'unknown';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

export function MatrixCard({ matrix, onDelete }: MatrixCardProps) {
  return (
    <div className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-white/20 hover:bg-white/[0.07]">
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-white">{matrix.name}</h3>
          <p className="mt-1 text-xs text-white/40">
            {matrix.repositories.length} repo{matrix.repositories.length !== 1 ? 's' : ''} &middot;{' '}
            {formatTimeAgo(matrix.updated_at)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 size={14} className="text-white/30 hover:text-red-400" />
        </button>
      </div>

      {matrix.repositories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {matrix.repositories.slice(0, 3).map((repo) => (
            <div
              key={repo.url}
              className="flex max-w-full items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1"
            >
              <FolderGit2 className="size-3 flex-shrink-0 text-white/40" />
              <span className="truncate text-xs text-white/60">{repo.name}</span>
            </div>
          ))}
          {matrix.repositories.length > 3 && (
            <span className="self-center text-[10px] text-white/40">
              +{matrix.repositories.length - 3} more
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-dashed border-white/10 py-4 text-xs text-white/30">
          No repositories yet
        </div>
      )}
    </div>
  );
}
