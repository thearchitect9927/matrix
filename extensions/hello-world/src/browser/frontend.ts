import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { HelloView } from './HelloView';

export function activate(api: MatrixBrowserAPI, context: ExtensionContext): void {
  // 뷰 등록
  api.views.register('hello-view', HelloView);

  // 커맨드 등록
  context.subscriptions.push(
    api.commands.register('hello.greet', () => {
      console.log('Hello from Matrix Extension System!');
    })
  );
}

export function deactivate(): void {
  console.log('Hello World extension deactivated');
}
