import { Terminal } from 'lucide-react';

/**
 * Placeholder terminal view.
 * In Phase 5, the existing TerminalManager component will be ported here.
 * For now, this registers as the bottom panel view.
 */
export function TerminalView() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-white/40">
      <Terminal size={16} />
      <span className="text-sm">
        Terminal (Extension-based - connecting to existing PTY service)
      </span>
    </div>
  );
}
