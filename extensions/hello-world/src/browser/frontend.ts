import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { HelloView } from './HelloView';

export function activate(api: MatrixBrowserAPI, context: ExtensionContext): void {
  // Register view
  api.views.register('hello-view', HelloView);

  // Register command
  context.subscriptions.push(
    api.commands.register('hello.greet', () => {
      console.log('Hello from Matrix Extension System!');
    })
  );
}

export function deactivate(): void {
  console.log('Hello World extension deactivated');
}
