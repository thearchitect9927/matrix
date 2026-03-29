import { useActiveView, useViewComponent } from '../extension-host/react-hooks';
import { Box } from 'lucide-react';

/**
 * MainArea — Extension이 등록한 view를 렌더링하는 메인 컨텐츠 영역
 */
export function MainArea() {
  const { activeViewId, activeViewProps } = useActiveView();
  const ViewComponent = useViewComponent(activeViewId);

  if (!ViewComponent) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <ViewComponent {...activeViewProps} />
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-white/40">
      <Box size={48} className="mb-4" />
      <h2 className="text-lg font-medium text-white/60">Matrix</h2>
      <p className="mt-2 text-sm">사이드바에서 기능을 선택하세요</p>
    </div>
  );
}
