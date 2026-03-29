export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  worktrees: WorktreeRef[];
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface WorktreeRef {
  repository: string;
  branch: string;
}

export interface KanbanCard {
  task_id: string;
  column: TaskStatus;
  order: number;
}

export interface KanbanBoard {
  columns: TaskStatus[];
  cards: KanbanCard[];
}
