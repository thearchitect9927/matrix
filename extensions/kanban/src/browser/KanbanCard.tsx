import type { Task } from '../common/types';

interface KanbanCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="group cursor-grab rounded-lg border border-white/10 bg-white/5 p-3 transition-all hover:border-white/20 hover:bg-white/[0.07] active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onClick?.(task)}
    >
      <h4 className="text-sm font-medium text-white/80">{task.title}</h4>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-white/40">{task.description}</p>
      )}
      {task.tags && task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span key={tag} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
              {tag}
            </span>
          ))}
        </div>
      )}
      {task.worktrees.length > 0 && (
        <div className="mt-2 text-[10px] text-white/30">
          {task.worktrees.length} worktree{task.worktrees.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
