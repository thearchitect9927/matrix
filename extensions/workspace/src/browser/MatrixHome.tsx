import { useState, useEffect, useCallback } from 'react';
import type { Matrix } from '../common/types';
import { MatrixCard } from './MatrixCard';
import { CreateMatrixCard } from './CreateMatrixCard';

export function MatrixHome() {
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatrices = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await window.api.invoke('workspace:matrix:list');
      setMatrices(result as Matrix[]);
    } catch (err) {
      console.error('Failed to load matrices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrices();
  }, [fetchMatrices]);

  const handleCreate = async () => {
    const name = prompt('Matrix name:');
    if (!name) return;

    try {
      await window.api.invoke('workspace:matrix:create', name);
      await fetchMatrices();
    } catch (err) {
      console.error('Failed to create matrix:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this matrix?')) return;
    try {
      await window.api.invoke('workspace:matrix:delete', id);
      await fetchMatrices();
    } catch (err) {
      console.error('Failed to delete matrix:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Your Matrices</h1>
          <p className="mt-1.5 text-sm text-white/50">
            {matrices.length} matri{matrices.length === 1 ? 'x' : 'ces'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {matrices.map((matrix) => (
            <MatrixCard key={matrix.id} matrix={matrix} onDelete={() => handleDelete(matrix.id)} />
          ))}
          <CreateMatrixCard onClick={handleCreate} />
        </div>
      </div>
    </div>
  );
}
