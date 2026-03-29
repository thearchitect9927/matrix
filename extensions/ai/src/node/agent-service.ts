import fs from 'fs/promises';
import path from 'path';
import { matrixService } from '@matrix/workspace/src/node/backend';
import type { AgentContext } from '../common/types';

export class AgentService {
  async buildContext(matrixId: string, taskId?: string): Promise<AgentContext> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) throw new Error(`Matrix not found: ${matrixId}`);

    let matrixMd = '';
    try {
      matrixMd = await fs.readFile(path.join(matrixPath, 'MATRIX.md'), 'utf-8');
    } catch {
      // MATRIX.md may not exist
    }

    let taskMd: string | undefined;
    if (taskId) {
      const tasksDir = path.join(matrixPath, 'tasks');
      try {
        const dirs = await fs.readdir(tasksDir, { withFileTypes: true });
        for (const dir of dirs) {
          if (!dir.isDirectory()) continue;
          const taskJsonPath = path.join(tasksDir, dir.name, 'task.json');
          try {
            const content = await fs.readFile(taskJsonPath, 'utf-8');
            const task = JSON.parse(content);
            if (task.id === taskId) {
              const taskMdPath = path.join(tasksDir, dir.name, 'TASK.md');
              try {
                taskMd = await fs.readFile(taskMdPath, 'utf-8');
              } catch {
                // TASK.md may not exist
              }
              break;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // tasks dir may not exist
      }
    }

    return {
      matrixId,
      matrixMd,
      taskId,
      taskMd,
    };
  }
}
