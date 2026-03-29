import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { Matrix, RepositoryRef } from '../common/types';

const MATRIX_ROOT = path.join(os.homedir(), '.matrix');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateFolderName(name: string, id: string): string {
  const slug = slugify(name) || 'matrix';
  const shortId = id.split('-')[0];
  return `${slug}-${shortId}`;
}

export class MatrixService {
  async getMatrixRoot(): Promise<string> {
    return MATRIX_ROOT;
  }

  async getPath(matrixId: string): Promise<string | null> {
    const matricesDir = path.join(MATRIX_ROOT, 'matrices');
    try {
      const dirs = await fs.readdir(matricesDir);
      for (const dir of dirs) {
        const metaPath = path.join(matricesDir, dir, '.matrix.json');
        try {
          const content = await fs.readFile(metaPath, 'utf-8');
          const meta = JSON.parse(content) as Matrix;
          if (meta.id === matrixId) {
            return path.join(matricesDir, dir);
          }
        } catch {
          continue;
        }
      }
    } catch {
      // matrices dir doesn't exist yet
    }
    return null;
  }

  async create(name: string): Promise<Matrix> {
    const id = randomUUID();
    const folderName = generateFolderName(name, id);
    const matrixDir = path.join(MATRIX_ROOT, 'matrices', folderName);

    await fs.mkdir(matrixDir, { recursive: true });
    await fs.mkdir(path.join(matrixDir, 'repositories'), { recursive: true });
    await fs.mkdir(path.join(matrixDir, 'tasks'), { recursive: true });
    await fs.mkdir(path.join(matrixDir, 'notes'), { recursive: true });

    const now = new Date().toISOString();
    const matrix: Matrix = {
      id,
      name,
      repositories: [],
      created_at: now,
      updated_at: now,
    };

    await fs.writeFile(path.join(matrixDir, '.matrix.json'), JSON.stringify(matrix, null, 2));
    await fs.writeFile(
      path.join(matrixDir, 'MATRIX.md'),
      `# ${name}\n\nDescribe your service here.\n`
    );
    await fs.writeFile(
      path.join(matrixDir, 'kanban.json'),
      JSON.stringify({ columns: ['todo', 'in_progress', 'review', 'done'], cards: [] }, null, 2)
    );

    return matrix;
  }

  async list(): Promise<Matrix[]> {
    const matricesDir = path.join(MATRIX_ROOT, 'matrices');
    try {
      await fs.access(matricesDir);
    } catch {
      return [];
    }

    const dirs = await fs.readdir(matricesDir, { withFileTypes: true });
    const matrices: Matrix[] = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      try {
        const content = await fs.readFile(
          path.join(matricesDir, dir.name, '.matrix.json'),
          'utf-8'
        );
        matrices.push(JSON.parse(content) as Matrix);
      } catch {
        continue;
      }
    }

    return matrices.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  async get(id: string): Promise<Matrix | null> {
    const matrixPath = await this.getPath(id);
    if (!matrixPath) return null;

    const content = await fs.readFile(path.join(matrixPath, '.matrix.json'), 'utf-8');
    return JSON.parse(content) as Matrix;
  }

  async update(id: string, data: Partial<Pick<Matrix, 'name'>>): Promise<Matrix | null> {
    const matrixPath = await this.getPath(id);
    if (!matrixPath) return null;

    const metaPath = path.join(matrixPath, '.matrix.json');
    const content = await fs.readFile(metaPath, 'utf-8');
    const matrix = JSON.parse(content) as Matrix;

    if (data.name !== undefined) matrix.name = data.name;
    matrix.updated_at = new Date().toISOString();

    await fs.writeFile(metaPath, JSON.stringify(matrix, null, 2));
    return matrix;
  }

  async delete(id: string): Promise<boolean> {
    const matrixPath = await this.getPath(id);
    if (!matrixPath) return false;

    await fs.rm(matrixPath, { recursive: true, force: true });
    return true;
  }

  async addRepository(id: string, repo: RepositoryRef): Promise<Matrix | null> {
    const matrixPath = await this.getPath(id);
    if (!matrixPath) return null;

    const metaPath = path.join(matrixPath, '.matrix.json');
    const content = await fs.readFile(metaPath, 'utf-8');
    const matrix = JSON.parse(content) as Matrix;

    if (!matrix.repositories.some((r) => r.url === repo.url)) {
      matrix.repositories.push(repo);
      matrix.updated_at = new Date().toISOString();
      await fs.writeFile(metaPath, JSON.stringify(matrix, null, 2));
    }

    return matrix;
  }
}
