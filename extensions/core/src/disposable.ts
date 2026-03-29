/**
 * A resource that can be disposed to free up resources.
 * Follows the VS Code Disposable pattern.
 */
export interface Disposable {
  dispose(): void;
}

export class DisposableStore implements Disposable {
  private disposables: Disposable[] = [];
  private disposed = false;

  add<T extends Disposable>(disposable: T): T {
    if (this.disposed) {
      disposable.dispose();
      return disposable;
    }
    this.disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

export function toDisposable(fn: () => void): Disposable {
  return { dispose: fn };
}
