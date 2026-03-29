import { NotebookPen } from 'lucide-react';

export function NotesList() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white/40">
      <NotebookPen size={48} />
      <h2 className="text-lg font-medium text-white/60">Notes</h2>
      <p className="text-sm">Project knowledge base. Select a Matrix to view notes.</p>
    </div>
  );
}
