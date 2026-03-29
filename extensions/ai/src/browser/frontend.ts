import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { AIChat } from './AIChat';

export function activate(api: MatrixBrowserAPI, _context: ExtensionContext): void {
  api.views.register('ai-chat', AIChat);
}
