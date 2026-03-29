import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { TerminalView } from './TerminalView';

export function activate(api: MatrixBrowserAPI, _context: ExtensionContext): void {
  api.views.register('terminal-manager', TerminalView);
}
