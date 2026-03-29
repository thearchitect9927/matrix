import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { MatrixService } from './matrix-service';

const execFileAsync = promisify(execFile);

export class SourceService {
  constructor(private matrixService: MatrixService) {}

  async cloneBare(matrixId: string, name: string, url: string): Promise<string> {
    const matrixPath = await this.matrixService.getPath(matrixId);
    if (!matrixPath) throw new Error(`Matrix not found: ${matrixId}`);

    const repoDir = path.join(matrixPath, 'repositories', `${name}.git`);
    await execFileAsync('git', ['clone', '--bare', url, repoDir]);

    await this.matrixService.addRepository(matrixId, { name, url });

    return repoDir;
  }

  async extractRepoName(url: string): Promise<string> {
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    return match?.[1] ?? 'unknown';
  }
}
