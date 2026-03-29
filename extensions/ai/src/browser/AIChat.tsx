import { Bot } from 'lucide-react';

export function AIChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white/40">
      <Bot size={48} />
      <h2 className="text-lg font-medium text-white/60">AI Agent</h2>
      <p className="text-sm">Chat with AI to manage tasks, create worktrees, and write code.</p>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
        <p className="text-white/50">Available tools:</p>
        <ul className="mt-2 space-y-1 text-white/30">
          <li>- List/Create Matrices</li>
          <li>- Create Tasks</li>
          <li>- Create/List Worktrees</li>
          <li>- Read MATRIX.md / TASK.md</li>
        </ul>
      </div>
    </div>
  );
}
