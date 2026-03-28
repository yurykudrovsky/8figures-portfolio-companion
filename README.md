# 8FIGURES — AI Portfolio Companion

A mobile-first AI portfolio companion built with Angular 21, Ionic 8, and Capacitor 6. Runs natively on iOS Simulator and Android Emulator with a live Node/Express backend.

---

## Features

- **Portfolio Dashboard** — holdings list, total value, daily P&L with green/red formatting, pull-to-refresh
- **AI Chat Interface** — character-by-character streaming responses, portfolio-aware context, typing indicator
- **Loading / Error / Empty states** — every async operation is fully handled
- **Cross-platform** — iOS Simulator (iPhone 17 Pro) and Android Emulator (API 36)

---

## AI Development Pipeline

This project was built using a Level 5 multi-agent AI pipeline
powered by Claude Code. The pipeline is as much a deliverable
as the application itself.

### Pipeline Architecture
5 specialist agents with human gates at every handoff:

| Agent | Role | Output |
|---|---|---|
| SCOUT | Read-only auditor — finds issues, never fixes | audit-reports/ |
| ARCHITECT | Design authority — designs fixes, never implements | design-docs/ |
| BUILDER | Implementation only — follows design exactly | source code |
| REVIEWER | Quality gate — verifies against CLAUDE.md rules | review-reports/ |
| QA | Test authority — writes tests, never fixes impl | qa-reports/ |

### How to Run the Pipeline
Every feature follows this workflow:

1. Create task file in `tasks/` directory
2. Execute: `"Execute task from tasks/NNN-task-name.md"`
3. Review each agent output at human gate
4. Approve or reject before next stage
5. Merge PR after QA passes

### Pipeline Evidence
All pipeline runs produce artifacts committed to the repo:
- `audit-reports/` — SCOUT findings with CONFIRMED/FIXED/NEW status
- `design-docs/` — ARCHITECT designs before any code is written
- `review-reports/` — REVIEWER verdicts with exact grep evidence
- `qa-reports/` — QA results with test counts
- `logs/agent-sessions/` — timestamped session logs

### Pipeline Configuration
- `CLAUDE.md` — project standards encoded before first line of code
- `.claude/agents/` — 5 specialist agent context files
- `.claude/commands/` — 6 reusable skills
- `tasks/` — structured task specs (reproducible, version controlled)
- `scripts/run-agent.sh` — agent launcher with branch safety check

### Future Evolution
- Semi-automated PRs via gh CLI (1 day)
- Jira/GitHub webhook integration (1 sprint)
- ORCHESTRATOR agent for autonomous pipeline execution (1 sprint)
- TDD++ with QA-FIRST red-green-refactor (1 sprint)
- Parallel worktree execution for concurrent pipelines (1 sprint)

See [ARCHITECTURE.md](./ARCHITECTURE.md) "Pipeline Evolution" and
[design-docs/future-agents.md](./design-docs/future-agents.md) for full roadmap.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24+ | `node --version` |
| npm | 10+ | bundled with Node |
| Angular CLI | 21+ | `npm i -g @angular/cli` |
| Xcode | 16+ | Mac only, iOS builds |
| Android Studio | 2024+ | Android builds |
| Java (JDK) | 21 | Bundled with Android Studio |

### One-time Android environment setup

Add to your shell profile (`~/.zshrc` or `~/.bash_profile`):

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"
```

Then reload: `source ~/.zshrc`

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd 8figures
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

---

## Running Locally (Web)

### Start the backend

```bash
cd backend
npm run dev
# API running at http://localhost:3000
# Health check: curl http://localhost:3000/api/health
```

### Start the frontend dev server

```bash
cd frontend
npm start
# Opens at http://localhost:4200
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/portfolio` | Full portfolio with holdings |
| `GET` | `/api/portfolio/holdings` | Holdings array only |
| `POST` | `/api/chat` | SSE streaming chat response |

`POST /api/chat` request body:
```json
{
  "message": "How is my portfolio doing?",
  "context": { "portfolio": { ... }, "messages": [] }
}
```

---

## iOS Simulator Build

> Requires macOS + Xcode 16+

```bash
# 1. Start the backend (keep running)
cd backend && npm run dev &

# 2. Build and sync
cd ../frontend
npm run build
npx cap sync

# 3. Run on iPhone 17 Pro (or adjust --target to any available simulator)
npx cap run ios --target "iPhone 17 Pro"

# List available simulators:
xcrun simctl list devices available | grep iPhone
```

---

## Android Emulator Build

> Requires Android Studio with an AVD created (API 33+)

```bash
# 0. Ensure JAVA_HOME and ANDROID_SDK_ROOT are set (see Prerequisites)

# 1. Start the backend (keep running)
cd backend && npm run dev &

# 2. Build and sync
cd ../frontend
npm run build
npx cap sync

# 3. Start your AVD (if not already running)
$ANDROID_SDK_ROOT/emulator/emulator -avd Medium_Phone_API_36.1 -no-snapshot-save &

# Wait for boot, then deploy:
npx cap run android --target Medium_Phone_API_36.1

# List available AVDs:
$ANDROID_SDK_ROOT/emulator/emulator -list-avds
```

> **Note:** The app automatically routes API calls through `10.0.2.2:3000` when running on Android native — this is the Android Emulator's alias for the host machine's `localhost`.

---

## Project Structure

```
8figures/
├── CLAUDE.md                        # Project intelligence for Claude Code
├── ARCHITECTURE.md                  # Architectural decision record
├── README.md                        # This file
│
├── backend/                         # Node.js + Express API
│   ├── src/
│   │   ├── index.ts                 # Express app entry point + health route
│   │   ├── models/
│   │   │   └── portfolio.model.ts   # Shared TypeScript interfaces
│   │   ├── routes/
│   │   │   ├── portfolio.ts         # GET /api/portfolio, /api/portfolio/holdings
│   │   │   └── chat.ts              # POST /api/chat (SSE streaming)
│   │   └── data/
│   │       └── mock-portfolio.ts    # 8 holdings, ~$125k total value
│   ├── tsconfig.json                # strict: true
│   └── package.json
│
├── frontend/                        # Angular 21 + Ionic 8 + Capacitor 6
│   ├── capacitor.config.ts          # appId, webDir, androidScheme
│   ├── android/                     # Capacitor Android project
│   ├── ios/                         # Capacitor iOS project
│   └── src/
│       ├── environments/
│       │   ├── environment.ts       # apiUrl: http://localhost:3000/api
│       │   └── environment.prod.ts  # apiUrl: /api
│       └── app/
│           ├── app.config.ts        # provideRouter, provideHttpClient, provideIonicAngular
│           ├── app.routes.ts        # Lazy routes: '' → portfolio, 'chat' → chat
│           ├── core/
│           │   ├── models/
│           │   │   └── portfolio.model.ts    # Portfolio, Holding, ChatMessage, ChatContext
│           │   └── services/
│           │       └── portfolio.service.ts  # HttpClient, platform-aware apiUrl getter
│           ├── features/
│           │   ├── portfolio/
│           │   │   └── components/portfolio-dashboard/
│           │   │       ├── *.component.ts    # OnPush, inject(), signals, takeUntilDestroyed
│           │   │       ├── *.component.html  # Skeleton, error+retry, holdings cards
│           │   │       └── *.component.scss  # CSS variables, gain/loss colors
│           │   └── chat/
│           │       ├── models/chat.model.ts
│           │       ├── services/chat.service.ts  # streamResponse() Observable pattern
│           │       └── components/chat-page/
│           │           ├── *.component.ts    # Streaming, auto-scroll, disabled send
│           │           ├── *.component.html  # Bubbles, typing indicator, ion-footer input
│           │           └── *.component.scss  # User/assistant bubble styling, animations
│           └── shared/              # (reserved for future shared UI components)
│
└── .claude/
    └── commands/
        └── new-component.md         # /new-component slash command
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed rationale on:
- Standalone components vs NgModules
- Mock streaming design
- Feature-based folder structure
- Android networking (`10.0.2.2` routing)
- Reactive patterns (Signals + RxJS)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone, strict TypeScript) |
| Mobile UI | Ionic 8 (`ion-` components throughout) |
| Native bridge | Capacitor 6 |
| Reactive | RxJS + Angular Signals |
| Backend | Node.js + Express 4 |
| Language | TypeScript 5 (strict mode, no `any`) |
