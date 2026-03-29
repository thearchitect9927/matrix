import { useState, useEffect, useCallback } from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import type { Note } from '../common/types';

interface NoteEditorProps {
  matrixId: string;
  filename: string;
  onBack: () => void;
}

export function NoteEditor({ matrixId, filename, onBack }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const note = (await window.api.invoke('notes:get', matrixId, filename)) as Note | null;
        if (note) setContent(note.content);
      } catch (err) {
        console.error('Failed to load note:', err);
      }
    }
    load();
  }, [matrixId, filename]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await window.api.invoke('notes:save', matrixId, filename, content);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  }, [matrixId, filename, content]);

  const handleChange = (value: string) => {
    setContent(value);
    setDirty(true);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-white/40 hover:text-white/70">
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm text-white/60">{filename}</span>
          {dirty && <span className="text-[10px] text-yellow-400">unsaved</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40"
        >
          <Save size={12} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 resize-none bg-transparent p-4 font-mono text-sm text-white/80 outline-none placeholder-white/20"
        placeholder="Write your notes in markdown..."
        spellCheck={false}
      />
    </div>
  );
}
