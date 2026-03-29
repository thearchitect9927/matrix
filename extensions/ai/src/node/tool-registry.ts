import type { AgentTool } from '../common/types';
import { MatrixService } from '@matrix/workspace/src/node/matrix-service';
import { WorktreeService } from '@matrix/git/src/node/worktree-service';
import { TaskService } from '@matrix/kanban/src/node/task-service';

const matrixService = new MatrixService();
const worktreeService = new WorktreeService();
const taskService = new TaskService();

export function getBuiltinTools(): AgentTool[] {
  return [
    {
      id: 'matrix.list',
      name: 'List Matrices',
      description: 'List all Matrix workspaces',
      handler: async () => matrixService.list(),
    },
    {
      id: 'task.create',
      name: 'Create Task',
      description: 'Create a new task in a Matrix',
      handler: async (args) => taskService.create(args.matrixId as string, args.title as string),
    },
    {
      id: 'worktree.create',
      name: 'Create Worktree',
      description: 'Create a git worktree for a task',
      handler: async (args) =>
        worktreeService.add(
          args.repoPath as string,
          args.destination as string,
          args.branch as string
        ),
    },
    {
      id: 'worktree.list',
      name: 'List Worktrees',
      description: 'List worktrees for a repository',
      handler: async (args) => worktreeService.list(args.repoPath as string),
    },
  ];
}
