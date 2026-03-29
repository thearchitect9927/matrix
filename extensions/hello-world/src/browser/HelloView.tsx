import { Hand } from 'lucide-react';

export function HelloView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
      <Hand size={48} className="text-green-400" />
      <h1 className="text-2xl font-bold">Hello, Matrix!</h1>
      <p className="text-white/60">The Extension system is working correctly.</p>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/40">
        <p>
          This view is provided by the <code className="text-green-400">@matrix/hello-world</code>{' '}
          Extension.
        </p>
        <p className="mt-1">manifest.json → sidebar contribution → activate() → views.register()</p>
      </div>
    </div>
  );
}
