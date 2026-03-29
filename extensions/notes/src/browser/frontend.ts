import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { NotesList } from './NotesList';

export function activate(api: MatrixBrowserAPI, _context: ExtensionContext): void {
  api.views.register('notes-list', NotesList);
}
