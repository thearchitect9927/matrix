/**
 * Extension Manifest — manifest.json 스키마
 * 모든 Extension은 이 형식으로 자신을 선언한다.
 */

export interface SidebarContribution {
  /** 사이드바 항목 고유 ID */
  id: string;
  /** 사이드바 섹션 (task, agent, source 등) */
  section: string;
  /** 표시 라벨 */
  label: string;
  /** lucide-react 아이콘 이름 */
  icon: string;
  /** 정렬 순서 (낮을수록 위) */
  order: number;
  /** 클릭 시 열릴 기본 view ID */
  defaultView?: string;
}

export interface ViewContribution {
  /** 뷰 고유 ID */
  id: string;
  /** 뷰가 배치될 영역 */
  area: 'main' | 'left' | 'right' | 'bottom';
  /** 표시 라벨 */
  label: string;
}

export interface CommandContribution {
  /** 커맨드 고유 ID */
  id: string;
  /** 표시 라벨 */
  label: string;
  /** 단축키 (optional) */
  keybinding?: string;
}

export interface ExtensionContributions {
  sidebar?: SidebarContribution[];
  views?: ViewContribution[];
  commands?: CommandContribution[];
}

export interface Manifest {
  /** Extension 고유 ID (예: "matrix:kanban") */
  id: string;
  /** 표시 이름 */
  name: string;
  /** 버전 (semver) */
  version: string;
  /** lucide-react 아이콘 이름 */
  icon?: string;
  /** 설명 */
  description?: string;
  /** UI/커맨드 기여 */
  contributions: ExtensionContributions;
  /** 활성화 조건 ("*" = 즉시, "onView:xxx", "onCommand:xxx") */
  activationEvents?: string[];
}

export interface ExtensionInfo {
  manifest: Manifest;
  /** 내장 Extension인지 */
  builtin: boolean;
  /** Extension 루트 경로 */
  path: string;
  /** 패키지 이름 (내장: "@matrix/kanban", 사용자: 디렉토리명) */
  packageName: string;
}
