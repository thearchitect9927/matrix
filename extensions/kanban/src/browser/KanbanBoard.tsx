import { useState, useEffect, useCallback } from 'react';
import type { Task, KanbanBoard as KanbanBoardType, TaskStatus } from '../common/types';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: get current matrixId from context
  const matrixId = 'current';

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [taskList, kanban] = await Promise.all([
        window.api.invoke('kanban:task:list', matrixId),
        window.api.invoke('kanban:board:get', matrixId),
      ]);
      setTasks(taskList as Task[]);
      setBoard(kanban as KanbanBoardType);
    } catch (err) {
      console.error('Failed to load kanban data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [matrixId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async () => {
    const title = prompt('Task title:');
    if (!title) return;

    try {
      await window.api.invoke('kanban:task:create', matrixId, title);
      await fetchData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  const getTasksForColumn = (column: TaskStatus): Task[] => {
    if (!board) return [];
    const cardIds = board.cards
      .filter((c) => c.column === column)
      .sort((a, b) => a.order - b.order)
      .map((c) => c.task_id);
    return cardIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as Task[];
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Kanban Board</h2>
        <button
          onClick={handleCreateTask}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          + New Task
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex w-72 flex-shrink-0 flex-col">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-medium text-white/60">{col.label}</h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/40">
                {getTasksForColumn(col.id).length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {getTasksForColumn(col.id).map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80"
                >
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
