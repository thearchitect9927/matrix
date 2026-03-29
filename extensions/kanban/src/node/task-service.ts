import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Task, KanbanBoard, KanbanCard } from '../common/types';
import { matrixService } from '@matrix/workspace/src/node/backend';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class TaskService {
  async create(matrixId: string, title: string): Promise<Task> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) throw new Error(`Matrix not found: ${matrixId}`);

    const taskId = `${slugify(title)}-${randomUUID().split('-')[0]}`;
    const taskDir = path.join(matrixPath, 'tasks', taskId);

    await fs.mkdir(taskDir, { recursive: true });
    await fs.mkdir(path.join(taskDir, 'worktrees'), { recursive: true });

    const now = new Date().toISOString();
    const task: Task = {
      id: taskId,
      title,
      status: 'todo',
      worktrees: [],
      created_at: now,
      updated_at: now,
    };

    await fs.writeFile(path.join(taskDir, 'task.json'), JSON.stringify(task, null, 2));
    await fs.writeFile(
      path.join(taskDir, 'TASK.md'),
      `# ${title}\n\nDescribe requirements here.\n`
    );

    // Add to kanban.json
    await this.addToKanban(matrixPath, taskId, 'todo');

    return task;
  }

  async list(matrixId: string): Promise<Task[]> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) return [];

    const tasksDir = path.join(matrixPath, 'tasks');
    try {
      const dirs = await fs.readdir(tasksDir, { withFileTypes: true });
      const tasks: Task[] = [];

      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        try {
          const content = await fs.readFile(path.join(tasksDir, dir.name, 'task.json'), 'utf-8');
          tasks.push(JSON.parse(content) as Task);
        } catch {
          continue;
        }
      }

      return tasks;
    } catch {
      return [];
    }
  }

  async getKanban(matrixId: string): Promise<KanbanBoard> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) return { columns: ['todo', 'in_progress', 'review', 'done'], cards: [] };

    try {
      const content = await fs.readFile(path.join(matrixPath, 'kanban.json'), 'utf-8');
      return JSON.parse(content) as KanbanBoard;
    } catch {
      return { columns: ['todo', 'in_progress', 'review', 'done'], cards: [] };
    }
  }

  async moveTask(matrixId: string, taskId: string, column: string): Promise<void> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) throw new Error(`Matrix not found: ${matrixId}`);

    // Update task.json
    const taskDir = await this.findTaskDir(matrixPath, taskId);
    if (taskDir) {
      const taskPath = path.join(taskDir, 'task.json');
      const content = await fs.readFile(taskPath, 'utf-8');
      const task = JSON.parse(content) as Task;
      task.status = column as Task['status'];
      task.updated_at = new Date().toISOString();
      await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
    }

    // Update kanban.json
    const kanbanPath = path.join(matrixPath, 'kanban.json');
    const kanban = await this.getKanban(matrixId);
    const card = kanban.cards.find((c) => c.task_id === taskId);
    if (card) {
      card.column = column as KanbanCard['column'];
    }
    await fs.writeFile(kanbanPath, JSON.stringify(kanban, null, 2));
  }

  private async addToKanban(matrixPath: string, taskId: string, column: string): Promise<void> {
    const kanbanPath = path.join(matrixPath, 'kanban.json');
    let kanban: KanbanBoard;
    try {
      const content = await fs.readFile(kanbanPath, 'utf-8');
      kanban = JSON.parse(content) as KanbanBoard;
    } catch {
      kanban = { columns: ['todo', 'in_progress', 'review', 'done'], cards: [] };
    }

    kanban.cards.push({
      task_id: taskId,
      column: column as KanbanCard['column'],
      order: kanban.cards.filter((c) => c.column === column).length,
    });

    await fs.writeFile(kanbanPath, JSON.stringify(kanban, null, 2));
  }

  private async findTaskDir(matrixPath: string, taskId: string): Promise<string | null> {
    const tasksDir = path.join(matrixPath, 'tasks');
    try {
      const dirs = await fs.readdir(tasksDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        try {
          const content = await fs.readFile(path.join(tasksDir, dir.name, 'task.json'), 'utf-8');
          const task = JSON.parse(content) as Task;
          if (task.id === taskId) return path.join(tasksDir, dir.name);
        } catch {
          continue;
        }
      }
    } catch {
      // tasks dir doesn't exist
    }
    return null;
  }
}
