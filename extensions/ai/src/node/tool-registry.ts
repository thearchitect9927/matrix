import type { AgentTool } from '../common/types';
import { matrixService } from '@matrix/workspace/src/node/backend';
import { worktreeService } from '@matrix/git/src/node/backend';
import { taskService } from '@matrix/kanban/src/node/backend';

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
