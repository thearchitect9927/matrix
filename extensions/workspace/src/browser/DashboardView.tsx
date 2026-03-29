import { LayoutGrid } from 'lucide-react';

export function DashboardView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white/40">
      <LayoutGrid size={48} />
      <h2 className="text-lg font-medium text-white/60">Dashboard</h2>
      <p className="text-sm">Select a Matrix to view its sources and details.</p>
    </div>
  );
}
