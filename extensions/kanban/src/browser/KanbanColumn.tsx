import { useState } from 'react';
import type { Task, TaskStatus } from '../common/types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  onCardDrop?: (taskId: string, targetColumn: TaskStatus) => void;
}

export function KanbanColumn({ id, label, tasks, onCardDrop }: KanbanColumnProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onCardDrop) {
      onCardDrop(taskId, id);
    }
  };

  return (
    <div
      className={`flex w-72 flex-shrink-0 flex-col rounded-lg border transition-colors ${
        isDropTarget ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 bg-white/[0.02]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <h3 className="text-sm font-medium text-white/60">{label}</h3>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/40">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-white/10 p-4">
            <p className="text-center text-xs text-white/20">Drop cards here</p>
          </div>
        ) : (
          tasks.map((task) => <KanbanCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
