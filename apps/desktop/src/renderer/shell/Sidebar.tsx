import { useSidebarItems, useExtensionHost, setActiveView } from '../extension-host/react-hooks';
import type { RegisteredSidebarItem } from '../extension-host/registry';
import * as LucideIcons from 'lucide-react';
import { useState } from 'react';

/**
 * Sidebar — Extension manifest의 sidebar contributions를 자동으로 렌더링
 */
export function Sidebar() {
  const items = useSidebarItems();
  const host = useExtensionHost();
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // section별 그룹핑
  const sections = groupBy(items, 'section');

  async function handleItemClick(item: RegisteredSidebarItem) {
    setActiveItem(item.id);

    // 해당 Extension activate (아직 안 됐으면)
    await host.ensureActivated(item.extensionId);

    // sidebar select 이벤트 발생
    host.registry.fireSidebarSelect(item.id);

    // 기본 view 열기
    if (item.defaultView) {
      setActiveView(item.defaultView);
    }
  }

  return (
    <nav className="flex h-full w-12 flex-col items-center gap-1 border-r border-white/10 bg-neutral-950 py-2">
      {Object.entries(sections).map(([section, sectionItems]) => (
        <div key={section} className="flex flex-col items-center gap-1">
          {sectionItems.map((item) => {
            const Icon = getIcon(item.icon);
            const isActive = activeItem === item.id;
            const badge = host.registry.getBadge(item.id);

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                }`}
                title={item.label}
              >
                <Icon size={20} />
                {badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-medium text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="mx-2 my-1 h-px w-6 bg-white/10" />
        </div>
      ))}
    </nav>
  );
}

function getIcon(iconName: string): LucideIcons.LucideIcon {
  // kebab-case → PascalCase 변환 (layout-grid → LayoutGrid)
  const pascalCase = iconName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[pascalCase];
  return icon ?? LucideIcons.HelpCircle;
}

function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  }
  return groups;
}
