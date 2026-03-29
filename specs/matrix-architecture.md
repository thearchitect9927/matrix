# Matrix Architecture Spec

## 한 줄 정의

AI-first 솔로 개발자를 위한 올인원 개발 워크스페이스 — 태스크, 지식, Git, 터미널을 하나의 컨텍스트에서.

## 핵심 원칙

- **컨텍스트 스위칭 제거**: SourceTree, Obsidian, Jira, iTerm 등을 하나로 통합
- **Source의 경계를 넘어선다**: 하나의 서비스는 여러 저장소로 구성되며, Task/Note/Terminal은 그 경계를 가로지른다
- **파일 기반 설계**: 모든 데이터는 파일시스템에 투명하게 저장. 사용자가 직접 수정할 수 있다
- **AI가 모든 것을 참조하고 실행한다**: AI Agent는 Matrix 전체 컨텍스트를 읽고, Task를 수행하며, Worktree를 자동 생성한다
- **Extension 기반 아키텍처**: 모든 기능은 Extension. 내장 익스텐션과 사용자 익스텐션이 동일한 API를 사용

## 타겟 사용자

AI를 적극 활용하는 1인 개발자/기업가. 여러 프로젝트를 동시에 운영하며, 도구 전환 피로를 겪고 있는 사람.

---

## Extension 아키텍처

### 개요

Matrix는 **Extension Host + Extension API**로 구성된 프레임워크. VS Code와 같은 모델:

- **내장 Extension**: 앱과 함께 배포 (kanban, terminal, github, notes, ai 등)
- **사용자 Extension**: `{userData}/extensions/`에 설치하여 사용

모든 Extension(내장이든 외부든)은 **동일한 Extension API**를 통해 앱과 소통.

```
Matrix App
├── App Shell (Sidebar, TabBar, MainArea, BottomPanel)
├── Extension Host (익스텐션 로더 + API 제공)
│   ├── Extension Registry (등록된 모든 익스텐션 관리)
│   └── Extension API (api.views, api.commands, api.events, ...)
├── Built-in Extensions (앱과 함께 배포)
│   ├── @matrix/workspace
│   ├── @matrix/kanban
│   ├── @matrix/terminal
│   ├── @matrix/github
│   ├── @matrix/notes
│   └── @matrix/ai
└── User Extensions (런타임 로드)
    └── {userData}/extensions/
        └── my-custom-extension/
```

### Extension Manifest

모든 Extension은 `manifest.json`으로 자신을 선언:

```json
{
  "id": "matrix:kanban",
  "name": "Kanban",
  "version": "0.0.1",
  "icon": "layout-grid",
  "description": "칸반 보드 기반 Task 관리",

  "contributions": {
    "sidebar": [
      {
        "id": "kanban",
        "section": "task",
        "label": "Kanban",
        "icon": "layout-grid",
        "order": 1
      }
    ],
    "views": [
      {
        "id": "kanban-board",
        "area": "main",
        "label": "Kanban Board"
      },
      {
        "id": "task-detail",
        "area": "main",
        "label": "Task Detail"
      }
    ],
    "commands": [
      {
        "id": "kanban.create-task",
        "label": "Create Task"
      },
      {
        "id": "kanban.move-task",
        "label": "Move Task"
      }
    ]
  },

  "activationEvents": ["onView:kanban-board", "onCommand:kanban.create-task"]
}
```

### Extension 패키지 구조 (common / browser / node)

```
extensions/kanban/
├── manifest.json
├── package.json
└── src/
    ├── common/                    # 프론트/백 공유
    │   └── types.ts               # Task, KanbanBoard 타입
    ├── browser/                   # renderer process (React UI)
    │   ├── frontend.ts            # browser activate()
    │   ├── KanbanBoard.tsx
    │   ├── KanbanColumn.tsx
    │   ├── KanbanCard.tsx
    │   └── TaskDetail.tsx
    └── node/                      # main process (fs, git 조작)
        ├── backend.ts             # node activate()
        └── task-service.ts        # 파일시스템 CRUD
```

### Extension Entry Points (browser + node)

```typescript
// extensions/kanban/src/browser/frontend.ts — renderer process
import type { ExtensionContext, MatrixBrowserAPI } from '@matrix/core';
import { WorkspaceService } from '@matrix/workspace';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetail } from './TaskDetail';
import { TaskService } from '../node/task-service';

export function activate(api: MatrixBrowserAPI, context: ExtensionContext) {
  // 뷰 등록
  api.views.register('kanban-board', KanbanBoard);
  api.views.register('task-detail', TaskDetail);

  // 내장 Extension은 직접 import — 타입 안전
  api.commands.register('kanban.create-task', async () => {
    const matrix = await WorkspaceService.getCurrent();
    const task = await TaskService.create(matrix.id, 'New Task');
    api.views.open('task-detail', { taskId: task.id });
  });

  context.subscriptions.push(
    api.sidebar.onSelect('kanban', () => {
      api.views.open('kanban-board');
    })
  );
}
```

```typescript
// extensions/kanban/src/node/backend.ts — main process
import type { ExtensionContext, MatrixNodeAPI } from '@matrix/core';
import { TaskService } from './task-service';

export function activate(api: MatrixNodeAPI, context: ExtensionContext) {
  // TaskService를 export — 다른 Extension이 직접 import하여 사용
}
```

```typescript
// extensions/kanban/src/node/task-service.ts — main process
import fs from 'fs/promises';
import path from 'path';
import type { MatrixNodeAPI } from '@matrix/core';
import type { Task } from '../common/types';

export class TaskService {
  constructor(private api: MatrixNodeAPI) {}

  async create(matrixId: string, title: string): Promise<Task> {
    const matrixPath = await WorkspaceService.getPath(matrixId);
    const taskId = `${slugify(title)}-${generateId()}`;
    const taskDir = path.join(matrixPath, 'tasks', taskId);

    await fs.mkdir(taskDir, { recursive: true });

    const task: Task = {
      id: taskId,
      title,
      status: 'todo',
      worktrees: [],
      created_at: new Date().toISOString(),
    };

    await fs.writeFile(path.join(taskDir, 'task.json'), JSON.stringify(task, null, 2));
    await fs.writeFile(path.join(taskDir, 'TASK.md'), `# ${title}\n`);

    return task;
  }
}
```

### Extension API 구조

Browser API와 Node API가 분리. 공통 부분은 공유.

```typescript
// === 공통 (browser + node) ===
interface MatrixBaseAPI {
  commands: {
    register(commandId: string, handler: (...args: any[]) => any): Disposable;
    execute(commandId: string, ...args: any[]): Promise<any>;
  };

  events: {
    on(event: string, handler: (...args: any[]) => void): Disposable;
    emit(event: string, ...args: any[]): void;
  };

  storage: {
    get<T>(key: string): T | undefined;
    set(key: string, value: any): void;
  };
}

// === Browser 전용 (renderer process) ===
interface MatrixBrowserAPI extends MatrixBaseAPI {
  views: {
    register(viewId: string, component: React.ComponentType<any>): void;
    open(viewId: string, props?: Record<string, any>): void;
    close(viewId: string): void;
  };

  sidebar: {
    register(item: SidebarItem): void;
    onSelect(itemId: string, handler: () => void): Disposable;
    setBadge(itemId: string, count: number): void;
  };
}

// === Node 전용 (main process) ===
interface MatrixNodeAPI extends MatrixBaseAPI {
  fs: {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
  };

  git: {
    clone(url: string, dest: string, options?: { bare?: boolean }): Promise<void>;
    worktreeAdd(repo: string, dest: string, branch: string): Promise<void>;
    worktreeRemove(path: string): Promise<void>;
    worktreeList(repo: string): Promise<WorktreeInfo[]>;
  };

  shell: {
    exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  };
}

// Disposable 패턴 (VS Code와 동일)
interface Disposable {
  dispose(): void;
}

interface ExtensionContext {
  extensionId: string;
  extensionPath: string;
  subscriptions: Disposable[];
}
```

### Extension 라이프사이클

#### 1. Extension 탐색

앱 시작 시, 두 곳에서 Extension을 찾는다:

- **내장**: `extensions/*/manifest.json` (빌드타임에 번들됨)
- **사용자**: `{userData}/extensions/*/manifest.json` (런타임 탐색)

```typescript
// src/main/extension-discovery.ts
async function discoverExtensions(): ExtensionInfo[] {
  const builtin = await scanBuiltinExtensions(); // extensions/*/manifest.json
  const user = await scanUserExtensions(); // {userData}/extensions/*/manifest.json
  return [...builtin, ...user];
}
```

#### 2. Extension Registry

manifest.json의 contributions를 중앙 레지스트리에 수집. activate() 호출 전에도 sidebar 항목, 커맨드 목록 등을 알 수 있다.

```typescript
// src/renderer/extension-registry.ts
class ExtensionRegistry {
  private manifests = new Map<string, Manifest>();
  private views = new Map<string, React.ComponentType>(); // activate() 후 채워짐
  private activated = new Set<string>();

  // 앱 시작 시: manifest만 등록 (아직 activate 안 함)
  registerManifest(manifest: Manifest) {
    this.manifests.set(manifest.id, manifest);
  }

  // sidebar contributions 조회 (manifest 기반, activate 불필요)
  getSidebarItems(): SidebarItem[] {
    return Array.from(this.manifests.values()).flatMap((m) => m.contributions.sidebar ?? []);
  }

  // view component 조회 (activate 후에만 가능)
  getViewComponent(viewId: string): React.ComponentType | undefined {
    return this.views.get(viewId);
  }

  // activate() 에서 호출됨
  registerView(viewId: string, component: React.ComponentType) {
    this.views.set(viewId, component);
  }
}
```

#### 3. Shell이 Registry 기반으로 UI 구성

```typescript
// src/renderer/shell/Sidebar.tsx
function Sidebar() {
  const registry = useExtensionRegistry();
  const items = registry.getSidebarItems();  // manifest 기반, 즉시 가능

  return (
    <nav>
      {items.sort(byOrder).map(item => (
        <SidebarItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          onClick={() => {
            // 클릭 시 해당 Extension activate (아직 안 됐으면)
            registry.ensureActivated(item.extensionId);
            // 연결된 view 열기
            setActiveView(item.defaultView);
          }}
        />
      ))}
    </nav>
  );
}

// src/renderer/shell/MainArea.tsx
function MainArea() {
  const registry = useExtensionRegistry();
  const { activeViewId, activeViewProps } = useActiveView();

  const ViewComponent = registry.getViewComponent(activeViewId);
  if (!ViewComponent) return <WelcomeScreen />;

  return <ViewComponent {...activeViewProps} />;
}
```

#### 4. Lazy Activation

Extension은 **필요할 때** activate된다 (VS Code와 동일):

- 사용자가 sidebar 클릭 → 해당 Extension activate
- 커맨드 실행 → 해당 Extension activate
- `activationEvents`에 `"*"` → 앱 시작 시 즉시 activate

```
앱 시작
  ↓
manifest.json 수집 → Registry에 contributions 등록
  ↓
Shell 렌더링 (sidebar 항목은 manifest만으로 표시 가능)
  ↓
사용자가 "Kanban" 클릭
  ↓
@matrix/kanban activate() 호출
  ├── browser/frontend.ts → api.views.register('kanban-board', KanbanBoard)
  └── node/backend.ts → TaskService 초기화
  ↓
MainArea가 registry.getViewComponent('kanban-board') → KanbanBoard 렌더링
```

#### 5. Extension Host (browser + node)

```
┌─ renderer process ─────────────────────┐    ┌─ main process ──────────────────┐
│                                        │    │                                 │
│  BrowserExtensionHost                  │    │  NodeExtensionHost              │
│  ├── manifest 수집 → Registry          │    │  ├── manifest 수집              │
│  ├── browser/frontend.ts activate()    │◄──►│  ├── node/backend.ts activate() │
│  └── views, sidebar 등록              │ IPC │  └── fs, git, shell 서비스       │
│                                        │    │                                 │
└────────────────────────────────────────┘    └─────────────────────────────────┘

browser에서 TaskService.create() 호출
  → Electron IPC → main process에서 실행
  → 파일시스템 조작 후 결과 반환
```

```typescript
// src/main/extension-host.ts — main process
class NodeExtensionHost {
  async initialize(extensions: ExtensionInfo[]) {
    for (const ext of extensions) {
      // node/backend.ts 로드 (내장: import, 사용자: dynamic import)
      const backend = ext.builtin
        ? await import(`@matrix/${ext.name}/src/node/backend`)
        : await this.dynamicImport(`${ext.path}/dist/node.js`);

      this.backends.set(ext.id, backend);
      // activate는 나중에 (lazy)
    }
  }

  async activate(extensionId: string) {
    const backend = this.backends.get(extensionId);
    if (backend?.activate) {
      const api = this.createNodeAPI(extensionId);
      await backend.activate(api, this.createContext(extensionId));
    }
  }
}

// src/renderer/extension-host.ts — renderer process
class BrowserExtensionHost {
  async initialize(extensions: ExtensionInfo[]) {
    // manifest 수집 → Registry에 등록
    for (const ext of extensions) {
      this.registry.registerManifest(ext.manifest);
    }

    // 모듈 로드 (activate는 아직)
    for (const ext of extensions) {
      const frontend = ext.builtin
        ? await import(`@matrix/${ext.name}/src/browser/frontend`)
        : await this.dynamicImport(`${ext.path}/dist/browser.js`);

      this.frontends.set(ext.id, frontend);
    }
  }

  async activate(extensionId: string) {
    if (this.registry.isActivated(extensionId)) return;

    const frontend = this.frontends.get(extensionId);
    if (frontend?.activate) {
      const api = this.createBrowserAPI(extensionId);
      await frontend.activate(api, this.createContext(extensionId));
    }

    // node 쪽도 같이 activate
    await ipcRenderer.invoke('extension:activate', extensionId);

    this.registry.markActivated(extensionId);
  }
}
```

### 사용자 Extension 구조

```
{userData}/extensions/
└── my-custom-dashboard/
    ├── manifest.json           # 선언
    ├── package.json
    ├── dist/
    │   ├── browser.js          # browser 번들 (React 컴포넌트 포함)
    │   └── node.js             # node 번들 (백엔드 로직, 없을 수도 있음)
    └── src/
        ├── common/types.ts
        ├── browser/frontend.ts
        └── node/backend.ts
```

사용자 Extension도 동일한 `common/browser/node` 구조.
package.json에 의존성 선언하고 직접 import:

```typescript
// browser/frontend.ts — 사용자 Extension
import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { WorkspaceService } from '@matrix/workspace';

export function activate(api: MatrixBrowserAPI, context: ExtensionContext) {
  api.views.register('my-dashboard', MyDashboard);
  api.sidebar.register({
    id: 'my-dashboard',
    section: 'custom',
    label: 'My Dashboard',
    icon: 'bar-chart',
    order: 99,
  });

  api.commands.register('my-dashboard.refresh', async () => {
    const matrix = await WorkspaceService.getCurrent();
    // ...
  });
}
```

### @matrix/core 패키지

Extension 개발자를 위한 SDK:

```
extensions/core/
├── package.json              # name: "@matrix/core"
├── src/
│   ├── index.ts              # 타입 + 유틸 export
│   ├── types.ts              # MatrixExtensionAPI, ExtensionContext, Manifest 등
│   ├── helpers.ts            # Extension 개발 헬퍼
│   └── testing.ts            # Extension 테스트 유틸
└── tsconfig.json
```

---

## 기술 스택

### 플랫폼

- **Electron** (데스크톱 앱)
- **React + TailwindCSS v4** (renderer process — UI)
- **Node.js** (main process — 파일시스템, git, 비즈니스 로직)
- **TypeScript** (전 레이어 통일 — 타입 공유)
- **Turborepo + pnpm workspaces** (모노레포)

Python 백엔드 제거. 프론트/백이 같은 언어로 타입 공유, IPC 단순화.

### 프로젝트 구조

```
matrix/
├── package.json                        # 루트 (Turborepo)
├── pnpm-workspace.yaml
├── turbo.json
│
├── src/                                # 앱 쉘 (Electron)
│   ├── main/                           # main process
│   │   ├── index.ts                    # 앱 진입점
│   │   ├── extension-host.ts           # NodeExtensionHost
│   │   └── ipc-bridge.ts              # browser ↔ node 서비스 브릿지
│   ├── preload/
│   │   └── index.ts                    # contextBridge
│   └── renderer/
│       ├── App.tsx                     # 레이아웃 쉘
│       ├── main.tsx
│       ├── extension-host.ts           # BrowserExtensionHost
│       └── shell/                      # 앱 쉘 컴포넌트
│           ├── Sidebar.tsx             # Extension contributions로 자동 구성
│           ├── TabBar.tsx
│           ├── MainArea.tsx            # Extension views 렌더링
│           ├── BottomPanel.tsx
│           └── Settings.tsx
│
├── extensions/
│   ├── core/                            # @matrix/core — Extension API 타입 + SDK
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts                # MatrixBrowserAPI, MatrixNodeAPI, Manifest 등
│   │       ├── helpers.ts
│   │       └── testing.ts
│   │
│   ├── workspace/                      # @matrix/workspace — Matrix/Source 관리
│   │   ├── manifest.json
│   │   └── src/
│   │       ├── common/types.ts
│   │       ├── browser/
│   │       │   ├── frontend.ts         # browser activate()
│   │       │   ├── MatrixHome.tsx
│   │       │   └── MatrixTree.tsx
│   │       └── node/
│   │           ├── backend.ts          # node activate()
│   │           ├── matrix-service.ts   # ~/.matrix/ CRUD
│   │           └── source-service.ts   # bare clone, 저장소 관리
│   │
│   ├── kanban/                         # @matrix/kanban — 칸반 + Task
│   │   ├── manifest.json
│   │   └── src/
│   │       ├── common/types.ts
│   │       ├── browser/
│   │       │   ├── frontend.ts
│   │       │   ├── KanbanBoard.tsx
│   │       │   ├── KanbanColumn.tsx
│   │       │   └── KanbanCard.tsx
│   │       └── node/
│   │           ├── backend.ts
│   │           └── task-service.ts     # tasks/ 폴더 CRUD
│   │
│   ├── terminal/                       # @matrix/terminal — 터미널
│   │   ├── manifest.json
│   │   └── src/
│   │       ├── common/types.ts
│   │       ├── browser/
│   │       │   ├── frontend.ts
│   │       │   ├── TerminalManager.tsx
│   │       │   └── TerminalInstance.tsx
│   │       └── node/
│   │           ├── backend.ts
│   │           └── pty-service.ts      # node-pty 관리
│   │
│   ├── git/                            # @matrix/git — Git 핵심 (브랜치, worktree, status)
│   │   ├── manifest.json
│   │   └── src/
│   │       ├── common/types.ts
│   │       ├── browser/
│   │       │   ├── frontend.ts
│   │       │   └── BranchesView.tsx
│   │       └── node/
│   │           ├── backend.ts
│   │           ├── git-service.ts      # branch, status, diff
│   │           └── worktree-service.ts # git worktree 관리
│   │
│   ├── github/                         # @matrix/github — GitHub 연동 (@matrix/git 참조)
│   │   ├── manifest.json
│   │   └── src/
│   │       ├── common/types.ts
│   │       ├── browser/
│   │       │   ├── frontend.ts
│   │       │   ├── PRList.tsx
│   │       │   └── IssueList.tsx
│   │       └── node/
│   │           ├── backend.ts
│   │           └── github-service.ts   # gh CLI 래핑
│   │
│   ├── notes/                          # @matrix/notes — 지식관리
│   │   ├── manifest.json
│   │   └── src/
│   │       ├── common/types.ts
│   │       ├── browser/
│   │       │   ├── frontend.ts
│   │       │   ├── NotesList.tsx
│   │       │   └── NoteEditor.tsx
│   │       └── node/
│   │           ├── backend.ts
│   │           └── notes-service.ts    # notes/ 폴더 CRUD
│   │
│   └── ai/                             # @matrix/ai — AI Agent
│       ├── manifest.json
│       └── src/
│           ├── common/types.ts
│           ├── browser/
│           │   ├── frontend.ts
│           │   └── AIChat.tsx
│           └── node/
│               ├── backend.ts
│               ├── agent-service.ts    # LLM 호출
│               └── tool-registry.ts    # AI가 다른 서비스를 tool로 사용
│
└── templates/
    └── extension-starter/              # Extension 스타터 템플릿
        ├── manifest.json
        ├── package.json
        └── src/
            ├── common/types.ts
            ├── browser/frontend.ts
            └── node/backend.ts
```

### Extension 간 의존 관계

```
@matrix/core (타입 + API 정의)
    ↑
    ├── @matrix/workspace (Matrix, Source 서비스 제공)
    ├── @matrix/git (브랜치, worktree, status, diff)
    │       ↑
    │       └── @matrix/github (PR/Issue — git 서비스 참조)
    ├── @matrix/kanban (→ @matrix/workspace import)
    ├── @matrix/terminal (독립적)
    ├── @matrix/notes (→ @matrix/workspace import)
    └── @matrix/ai (→ 모든 Extension import)

모든 Extension은 package.json에 의존성 선언 후 직접 import
```

---

## 앱 쉘과 Extension의 관계

### Sidebar 자동 구성

```typescript
// src/renderer/shell/Sidebar.tsx
function Sidebar() {
  // Extension Registry에서 sidebar contributions 수집
  const items = useExtensionContributions('sidebar');

  // section별 그룹핑
  const sections = groupBy(items, 'section');

  return (
    <nav>
      {Object.entries(sections).map(([section, items]) => (
        <SidebarSection key={section} title={section}>
          {items.sort(byOrder).map(item => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => extensionHost.activate(item.extensionId)}
            />
          ))}
        </SidebarSection>
      ))}
    </nav>
  );
}
```

### MainArea 뷰 렌더링

```typescript
// src/renderer/shell/MainArea.tsx
function MainArea() {
  const { activeViewId, activeViewProps } = useActiveView();

  // Extension이 등록한 React 컴포넌트를 가져와서 렌더링
  const ViewComponent = useExtensionView(activeViewId);

  if (!ViewComponent) return <WelcomeScreen />;

  return <ViewComponent {...activeViewProps} />;
}
```

---

## 기능 구조

```
Matrix (서비스)
├── Source ×N          ← 저장소 (bare clone)
│   ├── Branch         ← Git 브랜치 관리 (@matrix/git)
│   ├── Worktree ×N    ← Source로부터 생성 (@matrix/git)
│   └── PR / Issue     ← GitHub 연동 (@matrix/github → @matrix/git 참조)
├── Kanban             ← Task 관리 (@matrix/kanban)
│   └── Task ×N        ← Worktree를 참조할 수 있음
├── Note ×1            ← 프로젝트 지식관리 (@matrix/notes)
├── Terminal           ← Matrix 레벨 (@matrix/terminal)
└── AI Agent           ← 모든 하위 요소를 참조 (@matrix/ai)
```

### 관계 정리

| 관계                | 유형      | 설명                                                   |
| ------------------- | --------- | ------------------------------------------------------ |
| Source → Worktree   | 생성      | bare clone에서 `git worktree add`로 생성 (@matrix/git) |
| Task → Worktree     | 참조      | Task가 관련 Worktree들을 연결 (귀속이 아님)            |
| GitHub → Git        | 참조      | PR/Issue가 브랜치/worktree 정보를 git 서비스에서 조회  |
| AI Agent → Worktree | 자동 생성 | Task 수행 시 git 서비스를 통해 worktree 자동 생성      |
| AI Agent → 전체     | 참조      | Matrix 하위 모든 요소를 읽고 활용                      |
| Kanban → Task       | 포함      | 칸반 보드가 Task들을 컬럼으로 관리                     |

---

## 파일시스템 구조

### 사용자 데이터 (`~/.matrix/`) — 투명, 직접 수정 가능

```
~/.matrix/
├── settings.json                                    # 사용자 전역 설정
│
└── matrices/
    └── {service-name}-{id}/
        ├── .matrix.json                             # 서비스 메타정보
        ├── MATRIX.md                                # 서비스 설명 (AI 참조용)
        │
        ├── repositories/
        │   ├── a-server.git/                        # bare clone
        │   └── a-app.git/                           # bare clone
        │
        ├── tasks/
        │   └── {task-name}-{id}/
        │       ├── task.json                        # 태스크 메타정보
        │       ├── TASK.md                          # 태스크 설명/스펙
        │       └── worktrees/
        │           ├── a-server/                    # git worktree
        │           └── a-app/                       # git worktree
        │
        ├── notes/                                   # 지식관리 공간
        │   ├── architecture.md
        │   └── api-conventions.md
        │
        └── kanban.json                              # 칸반 보드 상태
```

### 앱 내부 데이터 (Electron userData) — 사용자가 직접 건드리지 않음

```
~/Library/Application Support/Matrix/    # macOS 기준
├── extensions/                          # 사용자 설치 Extension
│   └── my-custom-extension/
│       ├── manifest.json
│       └── dist/
├── extension-registry.json              # 설치된 Extension 목록 + 활성화 상태
├── extension-cache/                     # Extension 빌드 캐시
├── window-state.json                    # 윈도우 크기/위치
└── logs/                                # 앱 로그
```

### 주요 파일 스키마

#### `.matrix.json` — 서비스 메타정보

```json
{
  "id": "a-service-abc123",
  "name": "A Service",
  "repositories": [
    {
      "name": "a-server",
      "url": "git@github.com:user/a-server.git"
    },
    {
      "name": "a-app",
      "url": "git@github.com:user/a-app.git"
    }
  ],
  "created_at": "2026-03-28T09:00:00Z",
  "updated_at": "2026-03-28T09:00:00Z"
}
```

#### `task.json` — 태스크 메타정보

```json
{
  "id": "login-feature-xyz789",
  "title": "로그인 기능 구현",
  "status": "in_progress",
  "worktrees": [
    {
      "repository": "a-server",
      "branch": "feature/login"
    },
    {
      "repository": "a-app",
      "branch": "feature/login"
    }
  ],
  "created_at": "2026-03-28T10:00:00Z",
  "updated_at": "2026-03-28T10:00:00Z"
}
```

#### `kanban.json` — 칸반 보드 상태

```json
{
  "columns": ["todo", "in_progress", "review", "done"],
  "cards": [
    {
      "task_id": "login-feature-xyz789",
      "column": "in_progress",
      "order": 0
    }
  ]
}
```

---

## 워크플로우 예시

### "로그인 기능 구현" 시나리오

**1. 서비스 생성**

- "A Service" Matrix 생성
- `~/.matrix/matrices/a-service-abc123/` 폴더 생성
- `.matrix.json`, `MATRIX.md` 자동 생성

**2. 저장소 추가**

- `a-server`, `a-app` URL 입력
- `repositories/a-server.git/`, `repositories/a-app.git/`에 bare clone
- `.matrix.json`에 repository 정보 기록

**3. 칸반에서 Task 생성**

- "로그인 기능 구현" Task 추가
- `tasks/login-feature-xyz789/` 폴더 생성
- `task.json`, `TASK.md` 자동 생성
- TASK.md에 요구사항 작성
- 칸반 "todo" 컬럼에 카드 추가

**4. AI에게 Task 수행 요청**

- "이 Task 수행해줘"
- AI Agent가 MATRIX.md + TASK.md 읽기
- AI가 수정 필요한 저장소 판단 (a-server, a-app)
- AI가 자동으로 worktree 생성
- AI가 코드 작성
- Task 상태 → "in_progress"

**5. 사용자 리뷰**

- 터미널에서 테스트 실행
- 코드 변경사항 확인

**6. 작업 완료**

- 각 worktree에서 commit & push
- PR 생성 (a-server, a-app 각각)
- Task 상태 → "review"
- PR 머지 후 worktree 정리, Task → "done"

---

## 주요 설계 결정

### Decision: Extension 기반 아키텍처

**Options:**

1. 모놀리식 — 모든 기능이 하나의 앱에 하드코딩
2. 패키지 모듈화 — 내부 코드만 분리, 외부 확장 불가
3. Extension 아키텍처 — VS Code 모델. 내장/외부 Extension이 동일한 API 사용

**Chosen:** Extension 아키텍처
**Rationale:** 사용자가 자신만의 Extension을 만들어 서비스에 추가할 수 있어야 한다. 내장 기능도 Extension으로 만들면 API 설계가 강제되고, 결합도가 낮아진다.

### Decision: 현재 스택 유지 + Python → Node.js 전환

**Options:**

1. Theia 기반 재구축
2. 현재 스택 (Electron + React + TailwindCSS) 유지 + Python 백엔드
3. 현재 스택 유지 + Node.js로 백엔드 전환

**Chosen:** 현재 스택 유지 + Node.js 전환
**Rationale:** 에디터를 포함하지 않으므로 Theia의 이점이 적다. Node.js 전환으로 전 레이어 TypeScript 통일 — Extension의 common/browser/node가 같은 언어로 타입 공유. python-shell IPC 제거, Electron IPC로 단순화.

### Decision: 파일시스템 기반 데이터 저장

**Chosen:** 파일시스템 (JSON + Markdown)
**Rationale:** AI Agent가 파일을 직접 읽을 수 있고, 사용자가 구조를 이해하고 수정할 수 있다.

### Decision: Repository는 bare clone

**Chosen:** Bare clone
**Rationale:** Repository 자체는 작업용이 아니다. 모든 작업은 Task의 worktree에서 일어난다.

### Decision: Worktree는 Task에 귀속이 아닌 참조

**Chosen:** 물리적으로는 Task 하위에 배치하되, 논리적으로는 참조 관계
**Rationale:** 하나의 Worktree를 여러 Task에서 참조할 가능성을 열어둔다.

### Decision: Worktree는 AI가 자동 생성

**Chosen:** AI 자동 생성
**Rationale:** 사용자는 감독자, AI는 실행자. TASK.md 기반으로 AI가 판단.

---

## 보류 / TODO

- **Pipeline**: 우선순위 낮춤. 추후 별도 설계
- **노트 간 링크**: wikilink 스타일 연결 기능
- **Ideation**: 브레인스토밍 기능
- **Context 뷰**: 에이전트 컨텍스트 관리
- **에디터**: 현재 포함하지 않음. 추후 필요 시 재검토
- **Extension 마켓플레이스**: 사용자 Extension 배포/설치 시스템
