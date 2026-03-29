import { useState, useEffect, useCallback } from 'react';
import { FolderGit2, ChevronRight, ChevronDown, FileText, LayoutGrid } from 'lucide-react';
import type { Matrix } from '../common/types';

interface MatrixTreeProps {
  onSelectMatrix?: (matrixId: string) => void;
  onSelectView?: (viewId: string, matrixId: string) => void;
}

export function MatrixTree({ onSelectMatrix, onSelectView }: MatrixTreeProps) {
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchMatrices = useCallback(async () => {
    try {
      const result = await window.api.invoke('workspace:matrix:list');
      setMatrices(result as Matrix[]);
    } catch (err) {
      console.error('Failed to load matrices:', err);
    }
  }, []);

  useEffect(() => {
    fetchMatrices();
  }, [fetchMatrices]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-0.5 p-2 text-sm">
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Matrices
      </div>
      {matrices.map((matrix) => {
        const expanded = expandedIds.has(matrix.id);
        return (
          <div key={matrix.id}>
            <button
              onClick={() => {
                toggleExpand(matrix.id);
                onSelectMatrix?.(matrix.id);
              }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-white/60 hover:bg-white/5 hover:text-white/80"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <LayoutGrid size={12} />
              <span className="truncate">{matrix.name}</span>
            </button>

            {expanded && (
              <div className="ml-4 flex flex-col gap-0.5">
                {matrix.repositories.map((repo) => (
                  <button
                    key={repo.url}
                    className="flex items-center gap-1.5 rounded px-2 py-0.5 text-white/40 hover:bg-white/5 hover:text-white/60"
                  >
                    <FolderGit2 size={11} />
                    <span className="truncate text-xs">{repo.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => onSelectView?.('workspace-dashboard', matrix.id)}
                  className="flex items-center gap-1.5 rounded px-2 py-0.5 text-white/40 hover:bg-white/5 hover:text-white/60"
                >
                  <FileText size={11} />
                  <span className="text-xs">MATRIX.md</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
