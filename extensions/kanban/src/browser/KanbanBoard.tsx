import { useState, useEffect, useCallback } from 'react';
import type { Task, KanbanBoard as KanbanBoardType, TaskStatus } from '../common/types';
import { KanbanColumn } from './KanbanColumn';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

interface KanbanBoardProps {
  matrixId?: string | null;
}

export function KanbanBoard({ matrixId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!matrixId) return;
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

  const handleCardDrop = async (taskId: string, targetColumn: TaskStatus) => {
    try {
      await window.api.invoke('kanban:task:move', matrixId, taskId, targetColumn);
      await fetchData();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  if (!matrixId) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        Select a Matrix from Home to view the Kanban board.
      </div>
    );
  }

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
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={getTasksForColumn(col.id)}
            onCardDrop={handleCardDrop}
          />
        ))}
      </div>
    </div>
  );
}
