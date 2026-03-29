import { FolderGit2, ExternalLink } from 'lucide-react';
import type { RepositoryRef } from '../common/types';

interface DashboardSourceCardProps {
  repo: RepositoryRef;
}

export function DashboardSourceCard({ repo }: DashboardSourceCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.07]">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-white/10 p-2">
          <FolderGit2 size={16} className="text-white/60" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{repo.name}</p>
          <p className="text-xs text-white/40">{repo.url}</p>
        </div>
      </div>
      {repo.url && (
        <a
          href={repo.url.replace(/\.git$/, '')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 hover:text-white/60"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
