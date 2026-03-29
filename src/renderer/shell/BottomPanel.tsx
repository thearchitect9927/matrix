import { useState } from 'react';
import { useExtensionRegistry } from '../extension-host/react-hooks';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * BottomPanel — area: 'bottom'으로 등록된 Extension view를 렌더링
 * 접기/펼치기 가능
 */
export function BottomPanel() {
  const registry = useExtensionRegistry();
  const [collapsed, setCollapsed] = useState(true);
  const panelHeight = 300;

  // bottom 영역에 등록된 view 찾기
  const bottomViews = registry.getViewContributions().filter((v) => v.area === 'bottom');

  if (bottomViews.length === 0) return null;

  // 첫 번째 bottom view를 기본으로 표시
  const activeBottomView = bottomViews[0];
  const ViewComponent = registry.getViewComponent(activeBottomView.id);

  return (
    <div
      className="border-t border-white/10 bg-neutral-950"
      style={{ height: collapsed ? 32 : panelHeight }}
    >
      {/* 헤더 */}
      <div className="flex h-8 items-center justify-between border-b border-white/10 px-3">
        <div className="flex items-center gap-2">
          {bottomViews.map((view) => (
            <button key={view.id} className="text-xs text-white/60 hover:text-white/80">
              {view.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/40 hover:text-white/70"
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 컨텐츠 */}
      {!collapsed && ViewComponent && (
        <div className="h-[calc(100%-32px)] overflow-auto">
          <ViewComponent />
        </div>
      )}
    </div>
  );
}
