import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import type { Matrix } from '../common/types';
import { DashboardSourceCard } from './DashboardSourceCard';
import { SourceForm } from './SourceForm';

interface DashboardViewProps {
  matrixId?: string;
}

export function DashboardView({ matrixId }: DashboardViewProps) {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [showSourceForm, setShowSourceForm] = useState(false);

  const fetchMatrix = useCallback(async () => {
    if (!matrixId) return;
    try {
      const result = await window.api.invoke('workspace:matrix:get', matrixId);
      setMatrix(result as Matrix | null);
    } catch (err) {
      console.error('Failed to load matrix:', err);
    }
  }, [matrixId]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  if (!matrixId) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        Select a Matrix to view its dashboard.
      </div>
    );
  }

  if (!matrix) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{matrix.name}</h2>
          <p className="mt-1 text-sm text-white/40">
            {matrix.repositories.length} repositor{matrix.repositories.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/60">Repositories</h3>
          <button
            onClick={() => setShowSourceForm(true)}
            className="flex items-center gap-1 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600"
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        {showSourceForm && (
          <div className="mb-4">
            <SourceForm
              matrixId={matrixId}
              onComplete={() => {
                setShowSourceForm(false);
                fetchMatrix();
              }}
              onCancel={() => setShowSourceForm(false)}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {matrix.repositories.map((repo) => (
            <DashboardSourceCard key={repo.url} repo={repo} />
          ))}
          {matrix.repositories.length === 0 && !showSourceForm && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-12 text-white/30">
              <p className="text-sm">No repositories yet</p>
              <button
                onClick={() => setShowSourceForm(true)}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                Add your first repository
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
