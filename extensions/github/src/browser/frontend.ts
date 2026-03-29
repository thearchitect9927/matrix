import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { PRList } from './PRList';
import { IssueList } from './IssueList';

export function activate(api: MatrixBrowserAPI, _context: ExtensionContext): void {
  api.views.register('github-prs', PRList);
  api.views.register('github-issues', IssueList);
}
