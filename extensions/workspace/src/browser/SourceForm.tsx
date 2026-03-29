import { useState } from 'react';
import { FolderGit2, Loader2 } from 'lucide-react';

interface SourceFormProps {
  matrixId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function SourceForm({ matrixId, onComplete, onCancel }: SourceFormProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setError(null);
    if (newUrl.trim()) {
      // Extract repo name locally — no IPC needed
      const match = newUrl.match(/\/([^/]+?)(?:\.git)?$/);
      if (match?.[1]) setName(match[1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !name.trim()) return;

    setIsCloning(true);
    setError(null);

    try {
      await window.api.invoke('workspace:source:clone', matrixId, name.trim(), url.trim());
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clone failed');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-white/10 bg-neutral-900 p-6"
    >
      <div className="flex items-center gap-2 text-white">
        <FolderGit2 size={18} />
        <h3 className="font-semibold">Add Repository</h3>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-white/50">Git URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://github.com/user/repo.git"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400"
          disabled={isCloning}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-white/50">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="repo-name"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400"
          disabled={isCloning}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCloning}
          className="rounded-md px-3 py-1.5 text-sm text-white/50 hover:text-white/80"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isCloning || !url.trim() || !name.trim()}
          className="flex items-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40"
        >
          {isCloning && <Loader2 size={14} className="animate-spin" />}
          {isCloning ? 'Cloning...' : 'Add Repository'}
        </button>
      </div>
    </form>
  );
}
