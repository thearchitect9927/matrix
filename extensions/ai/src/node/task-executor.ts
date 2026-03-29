import path from 'path';
import fs from 'fs/promises';
import { matrixService } from '@matrix/workspace/src/node/backend';
import { worktreeService } from '@matrix/git/src/node/backend';
import { AgentService } from './agent-service';

const agentService = new AgentService();

interface TaskExecutionPlan {
  matrixId: string;
  taskId: string;
  taskDir: string;
  repositories: string[];
  context: {
    matrixMd: string;
    taskMd?: string;
  };
  worktreesCreated: Array<{
    repository: string;
    branch: string;
    path: string;
  }>;
}

/**
 * TaskExecutor — AI가 Task를 수행할 때 worktree를 자동으로 생성하고 컨텍스트를 수집
 *
 * 흐름:
 * 1. Task의 TASK.md, MATRIX.md 읽기
 * 2. Matrix의 repositories 확인
 * 3. 각 repository에 대해 worktree 생성 (Task 폴더 하위)
 * 4. 생성된 worktree 경로 반환
 */
export class TaskExecutor {
  async planExecution(matrixId: string, taskId: string): Promise<TaskExecutionPlan> {
    const matrix = await matrixService.get(matrixId);
    if (!matrix) throw new Error(`Matrix not found: ${matrixId}`);

    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) throw new Error(`Matrix path not found: ${matrixId}`);

    const taskDir = await this.findTaskDir(matrixPath, taskId);
    if (!taskDir) throw new Error(`Task not found: ${taskId}`);

    const context = await agentService.buildContext(matrixId, taskId);

    return {
      matrixId,
      taskId,
      taskDir,
      repositories: matrix.repositories.map((r) => r.name),
      context: {
        matrixMd: context.matrixMd,
        taskMd: context.taskMd,
      },
      worktreesCreated: [],
    };
  }

  async createWorktreesForTask(
    plan: TaskExecutionPlan,
    repoNames: string[],
    branchName: string
  ): Promise<TaskExecutionPlan> {
    const matrixPath = await matrixService.getPath(plan.matrixId);
    if (!matrixPath) throw new Error(`Matrix path not found: ${plan.matrixId}`);

    const worktreesDir = path.join(plan.taskDir, 'worktrees');
    await fs.mkdir(worktreesDir, { recursive: true });

    for (const repoName of repoNames) {
      const bareRepoPath = path.join(matrixPath, 'repositories', `${repoName}.git`);

      try {
        await fs.access(bareRepoPath);
      } catch {
        console.warn(`Repository not found: ${bareRepoPath}, skipping`);
        continue;
      }

      const worktreeDest = path.join(worktreesDir, repoName);
      try {
        await worktreeService.add(bareRepoPath, worktreeDest, branchName);
        plan.worktreesCreated.push({
          repository: repoName,
          branch: branchName,
          path: worktreeDest,
        });
      } catch (err) {
        console.error(`Failed to create worktree for ${repoName}:`, err);
      }
    }

    // Update task.json with worktree refs
    const taskJsonPath = path.join(plan.taskDir, 'task.json');
    try {
      const content = await fs.readFile(taskJsonPath, 'utf-8');
      const task = JSON.parse(content);
      task.worktrees = plan.worktreesCreated.map((w) => ({
        repository: w.repository,
        branch: w.branch,
      }));
      task.status = 'in_progress';
      task.updated_at = new Date().toISOString();
      await fs.writeFile(taskJsonPath, JSON.stringify(task, null, 2));
    } catch (err) {
      console.error('Failed to update task.json:', err);
    }

    return plan;
  }

  private async findTaskDir(matrixPath: string, taskId: string): Promise<string | null> {
    const tasksDir = path.join(matrixPath, 'tasks');
    try {
      const dirs = await fs.readdir(tasksDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        try {
          const content = await fs.readFile(path.join(tasksDir, dir.name, 'task.json'), 'utf-8');
          const task = JSON.parse(content);
          if (task.id === taskId) return path.join(tasksDir, dir.name);
        } catch {
          continue;
        }
      }
    } catch {
      // tasks dir may not exist
    }
    return null;
  }
}
