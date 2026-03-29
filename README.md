# 8FIGURES — AI Portfolio Companion

A mobile-first AI portfolio companion built with Angular 21, Ionic 8, and Capacitor 6. Runs natively on iOS Simulator and Android Emulator with a live Node/Express backend and real Anthropic Claude AI.

---

## Features

<!-- AUTO-DOCS:FEATURES:START -->
- **Portfolio Dashboard** — holdings list, total value, daily P&L with green/red formatting, pull-to-refresh
- **Bloomberg Dark Theme** — premium `#0a0a0f` terminal UI with teal accent (`#00d4aa`), gain/loss pill badges, left accent bars, staggered card fade-in, and count-up hero value animation
- **Portfolio Allocation Donut Chart** — Bloomberg-style SVG ring chart (responsive `min(85vw, 320px)`), 10px thin stroke with segment gaps, asset-type breakdown legend, live centre value with daily change subtitle
- **AI Chat Interface** — real Anthropic Claude API (`claude-haiku-4-5-20251001`) with character-by-character SSE streaming, full portfolio context injected into system prompt, graceful mock fallback when API key is absent
- **Loading / Error / Empty states** — every async operation is fully handled
- **Cross-platform** — iOS Simulator (iPhone 17 Pro) and Android Emulator (API 36)
<!-- AUTO-DOCS:FEATURES:END -->

---

## AI Development Pipeline

This project was built using a Level 5 multi-agent AI pipeline
powered by Claude Code. The pipeline is as much a deliverable
as the application itself.

### Pipeline Architecture
8 specialist agents with human gates at every handoff:

| Agent | Role | Output |
|---|---|---|
| INTAKE | Parses requirements docs from `inbox/` → generates task files | tasks/ |
| SCOUT | Read-only auditor — finds issues, never fixes | audit-reports/ |
| ARCHITECT | Design authority — designs fixes, never implements | design-docs/ |
| SPECS | Translates design into user-facing acceptance criteria | design-docs/ |
| QA-FIRST | Writes failing test stubs before BUILDER touches code (ATDD) | spec files |
| BUILDER | Implementation only — follows design exactly | source code |
| REVIEWER | Quality gate — verifies against CLAUDE.md rules | review-reports/ |
| QA-VERIFY | Test authority — confirms all ACs pass, writes final report | qa-reports/ |

### How to Run the Pipeline
Every feature follows this workflow:

1. Create task file in `tasks/` directory
2. Execute: `"Execute task from tasks/NNN-task-name.md"`
3. Review each agent output at human gate
4. Approve or reject before next stage
5. Merge PR after QA-VERIFY passes

### Pipeline Evidence
All pipeline runs produce artifacts committed to the repo:
- `audit-reports/` — SCOUT findings with CONFIRMED/FIXED/NEW status
- `design-docs/` — ARCHITECT designs before any code is written
- `review-reports/` — REVIEWER verdicts with exact grep evidence
- `qa-reports/` — QA-VERIFY results with test counts
- `tasks/` — structured task specs (reproducible, version controlled)
- **7 merged PRs** — every feature delivered through the pipeline with full audit trail

### Pipeline Configuration
- `CLAUDE.md` — project standards encoded before first line of code
- `.claude/agents/` — 8 specialist agent context files (includes INTAKE)
- `.claude/commands/` — 6 reusable skills (see below)
- `tasks/` — structured task specs (reproducible, version controlled)
- `inbox/` — drop requirement docs here; INTAKE agent converts them to task files
- `scripts/run-agent.sh` — agent launcher with branch safety check

### Skills (slash commands)

| Command | Purpose |
|---|---|
| `/new-component` | Scaffold a new Angular standalone component |
| `/code-review` | Run a structured code review checklist |
| `/git-workflow` | Conventional commit + branch naming guide |
| `/test-workflow` | Run tests and interpret results |
| `/feature-checklist` | Pre-merge feature completeness checklist |
| `/testing-strategy` | ATDD strategy guide for new features |

### Parallel Execution — Demonstrated
Two independent pipeline branches ran simultaneously via git worktrees:
- `pipeline/005-portfolio-chart` + `pipeline/006-app-logo` ran in parallel
- Each worktree had its own isolated build, tests, and agent context
- Merged sequentially after both QA gates passed (PRs #5 and #6)

### Future Evolution
- Semi-automated PRs via gh CLI (1 day)
- Jira/GitHub webhook integration (1 sprint)
- ORCHESTRATOR agent for autonomous pipeline execution (1 sprint)

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

### 3. Configure environment (optional — enables real Claude AI)

```bash
# Create backend/.env
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > backend/.env
```

Without this, the app falls back to pre-built mock responses. With it, all chat
responses come from `claude-haiku-4-5-20251001` with your full portfolio as context.

### 4. Install frontend dependencies

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
| `POST` | `/api/chat` | SSE streaming chat — real Claude API or mock fallback |

`POST /api/chat` request body:
```json
{
  "message": "How is my portfolio doing?",
  "context": { "portfolio": { ... }, "messages": [] }
}
```

Response: `text/event-stream` — `data: {"char":"X"}\n\n` per character, `data: {"done":true}\n\n` on complete.

---

## Tests

```bash
# Frontend — 30 tests (Vitest)
cd frontend && npx ng test --watch=false

# Backend — 12 tests (Jest + Supertest)
cd backend && npm test
```

**42 tests total, 0 failing.**

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

# 3. Run on iPhone 17 Pro (UUID — use xcrun simctl list to find yours)
npx cap run ios --target "E9E266F9-6987-425C-B745-BECD299DE9FC"

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
npx cap run android --target emulator-5554

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
│   │   ├── index.ts                 # Express app entry point + dotenv + health route
│   │   ├── models/
│   │   │   └── portfolio.model.ts   # Shared TypeScript interfaces
│   │   ├── routes/
│   │   │   ├── portfolio.ts         # GET /api/portfolio, /api/portfolio/holdings
│   │   │   └── chat.ts              # POST /api/chat — real Claude API + mock fallback
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
│       ├── index.html               # viewport-fit=cover (iOS safe area)
│       ├── styles.scss              # Safe area CSS env() → Ionic variables
│       ├── theme/
│       │   └── variables.css        # Bloomberg design tokens + Ionic dark overrides
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
│           │   │       ├── *.component.ts    # OnPush, inject(), signals, count-up animation
│           │   │       ├── *.component.html  # Hero value, staggered cards, gain/loss pills
│           │   │       └── *.component.scss  # Bloomberg dark tokens, stagger @keyframes
│           │   └── chat/
│           │       ├── models/chat.model.ts
│           │       ├── services/chat.service.ts  # SSE streaming via HttpClient + Observable
│           │       └── components/chat-page/
│           │           ├── *.component.ts    # Streaming, auto-scroll, disabled send
│           │           ├── *.component.html  # Dark bubbles, typing indicator, ion-footer input
│           │           └── *.component.scss  # Slide-in animation, accent send button
│           └── shared/              # (reserved for future shared UI components)
│
└── .claude/
    ├── agents/                      # 7 specialist agent context files
    └── commands/                    # 6 reusable slash command skills
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed rationale on:
- Standalone components vs NgModules
- Real Claude API integration + mock fallback design
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
| AI | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| Language | TypeScript 5 (strict mode, no `any`) |
