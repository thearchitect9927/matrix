import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { KanbanBoard } from './KanbanBoard';

export function activate(api: MatrixBrowserAPI, _context: ExtensionContext): void {
  api.views.register('kanban-board', KanbanBoard);
}
