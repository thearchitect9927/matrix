import { Plus } from 'lucide-react';

interface CreateMatrixCardProps {
  onClick: () => void;
}

export function CreateMatrixCard({ onClick }: CreateMatrixCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 p-10 transition-all text-white/30 hover:border-green-400/50 hover:bg-green-400/5 hover:text-green-400"
    >
      <div className="mb-3 rounded-full bg-white/5 p-3.5">
        <Plus className="size-6" />
      </div>
      <p className="text-[15px] font-medium">Create Matrix</p>
    </button>
  );
}
