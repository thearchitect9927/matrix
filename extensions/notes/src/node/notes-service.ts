import fs from 'fs/promises';
import path from 'path';
import { MatrixService } from '@matrix/workspace/src/node/matrix-service';
import type { Note } from '../common/types';

const matrixService = new MatrixService();

function validateNotePath(notesDir: string, filename: string): string {
  const resolved = path.resolve(notesDir, filename);
  if (!resolved.startsWith(notesDir + path.sep) && resolved !== notesDir) {
    throw new Error('Invalid filename: path traversal detected');
  }
  return resolved;
}

export class NotesService {
  async list(matrixId: string): Promise<Note[]> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) return [];

    const notesDir = path.join(matrixPath, 'notes');
    try {
      const files = await fs.readdir(notesDir);
      const notes: Note[] = [];

      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(notesDir, file);
        const stat = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const title = content.split('\n')[0]?.replace(/^#\s*/, '') || file;

        notes.push({
          filename: file,
          title,
          content,
          created_at: stat.birthtime.toISOString(),
          modified_at: stat.mtime.toISOString(),
        });
      }

      return notes.sort(
        (a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()
      );
    } catch {
      return [];
    }
  }

  async get(matrixId: string, filename: string): Promise<Note | null> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) return null;

    const notesDir = path.join(matrixPath, 'notes');
    const filePath = validateNotePath(notesDir, filename);
    try {
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const title = content.split('\n')[0]?.replace(/^#\s*/, '') || filename;
      return {
        filename,
        title,
        content,
        created_at: stat.birthtime.toISOString(),
        modified_at: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async save(matrixId: string, filename: string, content: string): Promise<void> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) throw new Error(`Matrix not found: ${matrixId}`);

    const notesDir = path.join(matrixPath, 'notes');
    await fs.mkdir(notesDir, { recursive: true });
    const filePath = validateNotePath(notesDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async create(matrixId: string, title: string): Promise<Note> {
    const filename = `${title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s]+/g, '-')}.md`;
    const content = `# ${title}\n`;
    await this.save(matrixId, filename, content);

    return {
      filename,
      title,
      content,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };
  }

  async remove(matrixId: string, filename: string): Promise<boolean> {
    const matrixPath = await matrixService.getPath(matrixId);
    if (!matrixPath) return false;

    try {
      const notesDir = path.join(matrixPath, 'notes');
      const filePath = validateNotePath(notesDir, filename);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
