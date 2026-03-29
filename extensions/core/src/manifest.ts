/**
 * Extension Manifest — manifest.json schema.
 * Every Extension declares itself using this format.
 */

export interface SidebarContribution {
  /** Sidebar item unique ID */
  id: string;
  /** Sidebar section (task, agent, source, etc.) */
  section: string;
  /** Display label */
  label: string;
  /** lucide-react icon name */
  icon: string;
  /** Sort order (lower values appear higher) */
  order: number;
  /** Default view ID to open on click */
  defaultView?: string;
}

export interface ViewContribution {
  /** View unique ID */
  id: string;
  /** Area where the view is placed */
  area: 'main' | 'left' | 'right' | 'bottom';
  /** Display label */
  label: string;
}

export interface CommandContribution {
  /** Command unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Keyboard shortcut (optional) */
  keybinding?: string;
}

export interface ExtensionContributions {
  sidebar?: SidebarContribution[];
  views?: ViewContribution[];
  commands?: CommandContribution[];
}

export interface Manifest {
  /** Extension unique ID (e.g. "matrix:kanban") */
  id: string;
  /** Display name */
  name: string;
  /** Version (semver) */
  version: string;
  /** lucide-react icon name */
  icon?: string;
  /** Description */
  description?: string;
  /** UI/command contributions */
  contributions: ExtensionContributions;
  /** Activation conditions ("*" = immediately, "onView:xxx", "onCommand:xxx") */
  activationEvents?: string[];
}

export interface ExtensionInfo {
  manifest: Manifest;
  /** Whether this is a builtin Extension */
  builtin: boolean;
  /** Extension root path */
  path: string;
  /** Package name (builtin: "@matrix/kanban", user: directory name) */
  packageName: string;
}
