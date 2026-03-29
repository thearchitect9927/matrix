import { Hand } from 'lucide-react';

export function HelloView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
      <Hand size={48} className="text-green-400" />
      <h1 className="text-2xl font-bold">Hello, Matrix!</h1>
      <p className="text-white/60">Extension 시스템이 정상적으로 동작합니다.</p>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/40">
        <p>
          이 뷰는 <code className="text-green-400">@matrix/hello-world</code> Extension에서
          제공됩니다.
        </p>
        <p className="mt-1">manifest.json → sidebar contribution → activate() → views.register()</p>
      </div>
    </div>
  );
}
