# Matrix Extension 아키텍처 마이그레이션 계획

## 현재 → 목표

**현재**: 모놀리식 Electron + React + Python 백엔드 (SQLite)
**목표**: Extension 기반 프레임워크 + 전 레이어 TypeScript + 파일시스템 데이터

---

## Phase 0: 인프라 + @matrix/core

**목적**: Extension 시스템의 뼈대. 이것 없이는 나머지 Phase 진행 불가.

### 0-1. pnpm-workspace.yaml 수정

```yaml
packages:
  - 'extensions/*'
```

### 0-2. @matrix/core 패키지 생성

```
extensions/core/
├── package.json              # name: "@matrix/core"
├── tsconfig.json
└── src/
    ├── index.ts              # 배럴 export
    ├── types.ts              # MatrixBrowserAPI, MatrixNodeAPI, ExtensionContext
    ├── manifest.ts           # Manifest 타입 + 검증
    ├── disposable.ts         # Disposable 패턴
    └── testing.ts            # Extension 테스트 유틸
```

핵심 타입 정의:

- `MatrixBrowserAPI` (views, sidebar, commands, services, events, storage)
- `MatrixNodeAPI` (commands, services, events, storage, fs, git, shell)
- `ExtensionContext`, `Disposable`, `Manifest`

### 0-3. Extension Host 구현 (루트)

**main process:**

```
src/main/
├── extension-host.ts         # NodeExtensionHost
└── ipc-bridge.ts             # browser ↔ node 서비스 호출 브릿지
```

**renderer process:**

```
src/renderer/
├── extension-host.ts         # BrowserExtensionHost
└── shell/
    ├── Sidebar.tsx            # contributions 기반 자동 구성
    ├── MainArea.tsx           # Extension views 렌더링
    └── BottomPanel.tsx
```

구현 범위:

- [ ] manifest.json 파싱 + contributions 등록
- [ ] browser activate() 호출
- [ ] node activate() 호출
- [ ] browser → node 서비스 호출 (Electron IPC 브릿지)
- [ ] Sidebar가 등록된 sidebar contributions를 자동 렌더링
- [ ] MainArea가 등록된 view를 렌더링

### 0-4. 검증

- [ ] 빈 Extension 하나를 만들어서 sidebar 항목 + main view가 뜨는지 확인
- [ ] browser에서 node 서비스 호출이 되는지 확인

---

## Phase 1: @matrix/workspace Extension

**목적**: Matrix/Source 관리를 첫 번째 Extension으로 전환. Python → Node.js 전환 시작.

### 1-1. 패키지 생성

```
extensions/workspace/
├── manifest.json
├── package.json
└── src/
    ├── common/
    │   └── types.ts           # Matrix, Source 타입
    ├── browser/
    │   ├── frontend.ts        # views, sidebar 등록
    │   ├── MatrixHome.tsx     ← home/HomeView.tsx
    │   ├── MatrixCard.tsx     ← home/MatrixCard.tsx
    │   ├── CreateMatrixCard.tsx ← home/CreateMatrixCard.tsx
    │   ├── MatrixTree.tsx     # 사이드바 트리 (새로 작성)
    │   ├── DashboardView.tsx  ← matrix/DashboardView.tsx
    │   ├── DashboardSourceCard.tsx ← matrix/DashboardSourceCard.tsx
    │   ├── SourceForm.tsx     ← matrix/SourceForm.tsx
    │   └── SourceFormWizard.tsx ← matrix/SourceFormWizard.tsx
    └── node/
        ├── backend.ts         # MatrixService, SourceService 등록
        ├── matrix-service.ts  # ~/.matrix/matrices/ CRUD (Node.js fs)
        └── source-service.ts  # bare clone (Node.js child_process)
```

### 1-2. Python → Node.js 전환 (Matrix/Source)

| Python (제거)                               | Node.js (신규)                                         |
| ------------------------------------------- | ------------------------------------------------------ |
| `backend/src/matrix/model.py`               | `extensions/workspace/src/common/types.ts`             |
| `backend/src/matrix/repository.py` (SQLite) | `extensions/workspace/src/node/matrix-service.ts` (fs) |
| `backend/src/source/cloner.py`              | `extensions/workspace/src/node/source-service.ts`      |
| `backend/src/source/linker.py`              | 불필요 (bare clone + worktree 방식)                    |
| `backend/src/config/paths.py`               | `extensions/workspace/src/node/matrix-service.ts` 내부 |

### 1-3. IPC 전환

`window.api.sendMessage({ type: 'matrix-create' })` (Python IPC)
→ `api.services.get('matrix').create()` (Electron IPC → Node.js)

### 1-4. 검증

- [ ] Matrix 생성 → `~/.matrix/matrices/{id}/` 폴더 생성
- [ ] Source 추가 → bare clone 실행
- [ ] `.matrix.json` 정상 기록
- [ ] 홈 화면에 Matrix 카드 표시

---

## Phase 2: @matrix/terminal Extension

**목적**: 터미널을 Extension으로 전환. 이미 잘 격리되어 있어서 비교적 쉬움.

### 2-1. 파일 이동

| 원본                                                | 대상                                                   |
| --------------------------------------------------- | ------------------------------------------------------ |
| `renderer/components/terminal/TerminalManager.tsx`  | `extensions/terminal/src/browser/TerminalManager.tsx`  |
| `renderer/components/terminal/TerminalInstance.tsx` | `extensions/terminal/src/browser/TerminalInstance.tsx` |
| `renderer/components/terminal/TerminalToolbar.tsx`  | `extensions/terminal/src/browser/TerminalToolbar.tsx`  |
| `renderer/components/terminal/*` (나머지)           | `extensions/terminal/src/browser/`                     |
| `renderer/services/TerminalService.ts`              | `extensions/terminal/src/browser/terminal-client.ts`   |
| `main/terminal-manager.ts`                          | `extensions/terminal/src/node/pty-service.ts`          |
| `shared/types/terminal.ts`                          | `extensions/terminal/src/common/types.ts`              |

### 2-2. manifest.json

```json
{
  "id": "matrix:terminal",
  "contributions": {
    "sidebar": [{ "id": "terminal", "section": "agent", "icon": "terminal", "order": 2 }],
    "views": [{ "id": "terminal-manager", "area": "bottom" }]
  }
}
```

### 2-3. 검증

- [ ] 터미널 생성, 입력, 출력
- [ ] 멀티 세션
- [ ] bottom 패널에 자동 배치

---

## Phase 3: @matrix/kanban Extension

### 3-1. 파일 이동

| 원본                                            | 대상                                             |
| ----------------------------------------------- | ------------------------------------------------ |
| `renderer/components/workflow/KanbanBoard.tsx`  | `extensions/kanban/src/browser/KanbanBoard.tsx`  |
| `renderer/components/workflow/KanbanColumn.tsx` | `extensions/kanban/src/browser/KanbanColumn.tsx` |
| `renderer/components/workflow/KanbanCard.tsx`   | `extensions/kanban/src/browser/KanbanCard.tsx`   |
| `renderer/types/kanban.ts`                      | `extensions/kanban/src/common/types.ts`          |

### 3-2. node/task-service.ts 신규 작성

```typescript
// tasks/ 폴더 CRUD, kanban.json 관리
// Python handler.py의 task 관련 로직을 Node.js로 재작성
```

### 3-3. 검증

- [ ] Task 생성 → tasks/ 폴더 생성
- [ ] 칸반 드래그앤드롭
- [ ] kanban.json 정상 업데이트

---

## Phase 4: @matrix/github Extension

### 4-1. 파일 이동

| 원본                                                  | 대상                                                  |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `renderer/components/workspace/PRsView.tsx`           | `extensions/github/src/browser/PRList.tsx`            |
| `renderer/components/workspace/IssuesView.tsx`        | `extensions/github/src/browser/IssueList.tsx`         |
| `renderer/components/workspace/BranchesView.tsx`      | `extensions/github/src/browser/BranchesView.tsx`      |
| `renderer/components/workspace/GitHubSetupPrompt.tsx` | `extensions/github/src/browser/GitHubSetupPrompt.tsx` |
| `renderer/hooks/useGitHubData.ts`                     | `extensions/github/src/browser/use-github-data.ts`    |

### 4-2. Python → Node.js 전환 (GitHub)

| Python (제거)                    | Node.js (신규)                                 |
| -------------------------------- | ---------------------------------------------- |
| `backend/src/github/client.py`   | `extensions/github/src/node/github-service.ts` |
| `backend/src/github/detector.py` | `extensions/github/src/node/github-service.ts` |

`gh` CLI 래핑을 `child_process.exec`로 전환.

### 4-3. 검증

- [ ] PR/Issue 목록 로드
- [ ] GitHub 미인증 시 안내 표시

---

## Phase 5: 앱 쉘 정리 + Python 백엔드 제거

### 5-1. 루트에 남는 것

```
src/
├── main/
│   ├── index.ts              # Electron 진입점
│   ├── extension-host.ts     # NodeExtensionHost
│   └── ipc-bridge.ts         # browser ↔ node 브릿지
├── preload/
│   └── index.ts              # contextBridge (간소화)
└── renderer/
    ├── App.tsx               # 레이아웃 쉘
    ├── main.tsx
    ├── extension-host.ts     # BrowserExtensionHost
    └── shell/
        ├── Sidebar.tsx
        ├── TabBar.tsx
        ├── MainArea.tsx
        ├── BottomPanel.tsx
        └── Settings.tsx
```

### 5-2. 제거 대상

- `apps/backend/ (제거 대상)` 전체 (Python)
- `src/main/ipc.ts` (python-shell)
- `src/shared/` (→ @matrix/core 또는 각 패키지로 이동 완료)
- `src/renderer/components/` (→ 각 Extension으로 이동 완료)
- `src/renderer/services/` (→ 각 Extension으로 이동 완료)
- `src/renderer/types/` (→ 각 Extension으로 이동 완료)
- `src/renderer/hooks/` (→ 각 Extension으로 이동 완료)

### 5-3. 의존성 정리

- `python-shell` 제거
- `sqlmodel` 제거 (Python)
- `uv` 의존성 제거
- pyproject.toml, .pre-commit-config.yaml 등 Python 관련 설정 제거

### 5-4. 검증 (전체 통합)

- [ ] `pnpm install`
- [ ] `pnpm type-check`
- [ ] `pnpm test`
- [ ] `pnpm dev` → 모든 Extension 정상 동작
- [ ] Python 프로세스 스폰 없음 확인

---

## Phase 6: 새 Extension 추가

### 6-1. @matrix/git

```
extensions/git/
└── src/
    ├── common/types.ts          # Branch, Worktree, GitStatus 타입
    ├── browser/
    │   ├── frontend.ts
    │   └── BranchesView.tsx
    └── node/
        ├── backend.ts
        ├── git-service.ts        # branch, status, diff, log
        └── worktree-service.ts   # git worktree add/remove/list
```

### 6-2. @matrix/notes

```
extensions/notes/
└── src/
    ├── common/types.ts
    ├── browser/
    │   ├── frontend.ts
    │   ├── NotesList.tsx
    │   └── NoteEditor.tsx
    └── node/
        ├── backend.ts
        └── notes-service.ts      # notes/ 폴더 CRUD
```

### 6-3. @matrix/ai

```
extensions/ai/
└── src/
    ├── common/types.ts
    ├── browser/
    │   ├── frontend.ts
    │   └── AIChat.tsx
    └── node/
        ├── backend.ts
        ├── agent-service.ts      # LLM 호출, 컨텍스트 수집
        └── tool-registry.ts      # 다른 Extension 서비스를 AI tool로 등록
```

---

## Phase 7: Task ↔ Git ↔ AI 통합

### 7-1. AI의 Worktree 자동 생성

AI Agent가 Task 수행 시:

1. `WorkspaceService` (직접 import) → MATRIX.md 읽기
2. Task의 `TASK.md` 읽기
3. 수정 필요한 저장소 판단
4. `GitService.worktree.create()` (직접 import) 호출
5. 코드 작성

### 7-2. Task ↔ PR 자동 연결

같은 브랜치명의 PR을 자동으로 Task에 연결.
`@matrix/github`가 `@matrix/git`을 직접 import하여 브랜치 정보 조회.
`api.events`를 통해 Extension 간 이벤트 기반 통신.

---

## Phase 8: 사용자 Extension 런타임 로드

### 8-1. 동적 로드 구현

- `{userData}/extensions/` 디렉토리 스캔
- `manifest.json` 파싱
- `dist/browser.js`, `dist/node.js` 동적 import
- contributions 등록 + activate 호출

### 8-2. Extension 스타터 템플릿

```
templates/extension-starter/
├── manifest.json
├── package.json
├── tsconfig.json
├── build.js                   # 빌드 스크립트 (browser + node 번들)
└── src/
    ├── common/types.ts
    ├── browser/frontend.ts
    └── node/backend.ts
```

### 8-3. 검증

- [ ] 사용자 Extension을 `{userData}/extensions/`에 넣으면 자동 인식
- [ ] sidebar, view 등록 정상
- [ ] node 서비스 호출 정상

---

## 실행 순서 요약

```
Phase 0: 인프라 + @matrix/core (SDK) + Extension Host  ← 핵심 뼈대
Phase 1: @matrix/workspace Extension                     ← Matrix/Source + Python→Node
Phase 2: @matrix/terminal Extension                 ← 터미널 이동
Phase 3: @matrix/kanban Extension                   ← 칸반 이동 + Task Node 구현
Phase 4: @matrix/github Extension                   ← GitHub 이동 + Python→Node
Phase 5: 앱 쉘 정리 + Python 제거                    ← 정리
──── 여기까지가 기존 기능 전환 ────
Phase 6: 새 Extension (git, notes, ai)
Phase 7: Task ↔ Git ↔ AI 통합
Phase 8: 사용자 Extension 런타임 로드
```

각 Phase 완료 후 검증:

1. `pnpm install`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm dev` (수동 확인)
