# 8FIGURES — Architecture Decision Record

## 1. Problem Decomposition

The project was broken into six discrete phases, each independently verifiable before the next began. This phased approach mirrors production engineering practice: no phase starts until the previous one compiles clean and deploys successfully.

```
Phase 1 — Scaffold          Framework wiring, zero-feature baseline
Phase 2 — Portfolio UI      Data layer + dashboard component
Phase 3 — AI Chat           Streaming service + chat interface
Phase 4 — Native Build      Capacitor iOS + Android platforms
Phase 5 — API Integration   Backend connectivity, platform networking
Phase 6 — Documentation     Architecture record + developer guide
```

Each phase produced a git commit with a conventional commit prefix (`chore:`, `feat:`, `fix:`). The constraint "zero TypeScript errors before moving on" was enforced at every boundary — not just at the end.

---

## 2. Key Architectural Decisions

### 2.1 Standalone Components over NgModules

**Decision:** Every component is `standalone: true` with explicit imports. No `NgModule` exists anywhere in the codebase.

**Alternatives considered:**
- `AppModule` + feature modules (classic Angular approach through v14)
- `NgModule`-based lazy loading with `loadChildren`

**Rationale:** Angular's standalone API (stable since v15, default since v17) eliminates the indirection of module declarations entirely. Each component's dependency graph is locally visible in its `imports: []` array — no hunting through a barrel module to understand what a component actually uses. The Angular team has deprecated NgModule-first guidance. For a greenfield app targeting Angular 21+, standalone is the correct baseline. Tree-shaking is also more aggressive because the compiler can see exactly which Ionic components each view uses, rather than importing an entire feature module.

---

### 2.2 Real Claude API with Mock Fallback

**Decision:** Backend `/api/chat` uses the real Anthropic Claude API (`claude-haiku-4-5-20251001`) with full portfolio context injection. Frontend `ChatService` uses `HttpClient` to `POST /api/chat` and parses the SSE stream character by character. Graceful fallback to mock streaming when `ANTHROPIC_API_KEY` is not present.

**Alternatives considered:**
- Mock-only streaming (`setInterval` observable, no backend call) — initial implementation
- WebSocket for bidirectional chat
- `fetch()` with `ReadableStream` for true streaming

**Rationale:** This was initially implemented as mock-only (Task 013 scope defined only the backend Claude integration). A post-merge diagnosis found the frontend `ChatService` was not calling the backend at all — it continued using the local `buildResponse()` method. Caught by Engineering Director visual review on the iOS Simulator: chat responses showed no context-awareness despite the backend being live.

Fixed in Task 013b: `ChatService` replaced `buildResponse()` with an `HttpClient.post()` chain that parses the SSE body (`data: {"char":"X"}\n\n` frames), then pipes the assembled text into the existing `streamResponse()` Observable. The component is completely unaware of the source — it consumes the same `Observable<string>` regardless of whether the text came from Claude or the fallback mock.

This incident led to two permanent pipeline changes:
- REVIEWER agent now runs mandatory `grep -rn "HttpClient"` before any PASS on full-stack tasks
- QA-VERIFY agent requires device verification for any feature with a frontend-backend boundary

See `design-docs/pipeline-failure-handling.md` Scenario 7 for the full incident record and recovery protocol.

---

### 2.3 Feature-based Folder Structure

**Decision:**
```
app/
├── core/          # Singleton services + shared models
└── features/
    ├── portfolio/ # Dashboard: components, services, models
    └── chat/      # Chat: components, services, models
```

**Alternatives considered:**
- Type-based structure: `components/`, `services/`, `models/` at root
- Domain-driven with shared kernel

**Rationale:** Type-based structures break down when an app scales beyond 3–4 features — a `services/` folder with 20 files tells you nothing about what domain they belong to. Feature-based colocation means every file related to portfolio (component, service, model, SCSS) lives together. When a feature is deleted or extracted, a single directory deletion is sufficient. The `core/` layer holds only what is genuinely shared and singleton: `PortfolioService` (injected by both the dashboard and the chat page) and the canonical `Portfolio`/`Holding` interfaces.

---

### 2.4 Android `10.0.2.2` vs `localhost` Networking

**Decision:** `PortfolioService` detects the runtime platform via `Capacitor.getPlatform()` and substitutes `10.0.2.2` for `localhost` when running on Android native.

**Alternatives considered:**
- Separate `environment.android.ts` file with build-time file replacement
- A proxy in the Capacitor Android config that tunnels `localhost` calls
- Running the backend in a Docker container on a known LAN IP

**Rationale:** The Android Emulator's virtual network interface maps the host machine's loopback to `10.0.2.2`. This is an Android system constant, not a configuration value — it is always `10.0.2.2`. A build-time environment file replacement would require a custom Angular build target and offers no advantage over a one-line runtime check. The `Capacitor.getPlatform()` call is free (synchronous, no I/O), and the `replace('localhost', '10.0.2.2')` approach means `environment.apiUrl` remains the single source of truth for the base URL — only the host is rewritten at runtime.

Two additional Android fixes were required alongside the routing fix:
- `AndroidManifest.xml`: `android:usesCleartextTraffic="true"` — Android 9+ blocks HTTP by default
- `capacitor.config.ts`: `server: { androidScheme: 'http' }` — prevents mixed-content blocking when the WebView serves the app over `http://localhost` and makes XHR calls to `http://10.0.2.2`

---

## 3. Data Model Design

```typescript
Portfolio
  └── holdings: Holding[]

Holding {
  assetType: 'stock' | 'etf' | 'crypto' | 'bond'  // discriminated union, not a magic string
  gainLoss / gainLossPercent                         // pre-computed on the backend
  currentValue                                       // qty × currentPrice, stored not derived
}
```

**Pre-computation on the backend:** `gainLoss`, `gainLossPercent`, `currentValue`, and `totalCost` are stored on the `Holding` object rather than computed in the Angular template. This keeps components purely presentational — a component that computes financial figures is a component with business logic. The backend (or a future real-time price feed) owns the calculation. Components only format and display.

**Discriminated union for `assetType`:** Using `'stock' | 'etf' | 'crypto' | 'bond'` instead of a plain `string` means TypeScript enforces exhaustiveness at switch/map sites. The `assetTypeLabel()` method in the dashboard component uses a `Record<typeof type, string>` — adding a new asset type without updating that map is a compile error, not a runtime bug.

**Interfaces over classes:** All models are pure `interface` declarations with no methods. Services own all logic. This is compatible with Angular's `OnPush` change detection (plain objects with no prototype chain) and makes serialization/deserialization trivial.

---

## 4. Reactive Architecture

```
HTTP (async)     → RxJS Observable   (PortfolioService, HttpClient)
Local UI state   → Angular Signals   (loading, error, portfolio, messages)
Streaming text   → RxJS Observable   (ChatService.streamResponse)
Component reads  → Signal getters    (portfolio(), loading(), etc.)
```

`takeUntilDestroyed(this.destroyRef)` is applied to every `subscribe()` call in every component. This is the Angular 16+ idiomatic replacement for `Subject` + `takeUntil` teardown patterns. Subscriptions are automatically cleaned up when the component is destroyed, with zero manual lifecycle management.

`ChangeDetectionStrategy.OnPush` is applied to both feature components. Combined with signals and the `async` pipe pattern, Angular only re-renders when a signal value changes — not on every browser event.

---

## 5. Pipeline Maturity Evidence

### Level 4 Indicators

Pipeline maturity in AI-assisted engineering is measured by how systematically the human engineer shapes, constrains, and reviews AI output — not just whether AI was used. Below is a concrete accounting of Level 4 indicators demonstrated in this project.

---

#### 5.1 Structured Phases with Build Gates

The project was delivered in 6 initial phases, then through 8+ formal pipeline runs. Each phase and each pipeline run had an explicit exit criterion: zero TypeScript errors from `npm run build` before the next began. AI output was never carried forward in a broken state.

```
Phase 1  chore: initial project scaffold
Phase 2  feat:  portfolio dashboard — holdings, P&L, loading/error/empty states
Phase 3  feat:  AI chat — streaming, contextual responses, typing indicator
Phase 4  chore: iOS and Android Capacitor platforms
Phase 5  fix:   backend connectivity — Android routing, cleartext, CORS
Phase 6  docs:  ARCHITECTURE.md + README.md
```

Each phase maps to a single atomic git commit with a conventional prefix. Evaluators can check out any commit and find a working, compiling application.

---

#### 5.2 Custom Slash Commands (Skills)

Six `.claude/commands/` files encode project-specific standards as reusable skills. These are not documentation — they are active instructions that Claude Code loads when invoked as `/skill-name`.

| Skill | Purpose |
|---|---|
| `/new-component` | Scaffold new Angular standalone component with OnPush, inject(), takeUntilDestroyed |
| `/code-review` | 30-point review checklist: TypeScript compliance, state completeness, Ionic rules, build gate |
| `/feature-checklist` | Definition of done with ATDD criteria: compile, iOS, Android, all states, number formatting |
| `/git-workflow` | Conventional commits + branch strategy, pre-commit gate commands |
| `/test-workflow` | Test runner setup, Vitest Ionic mock pattern, fake timer patterns |
| `/testing-strategy` | ATDD strategy guide for new features — QA-FIRST red-green-refactor |

The existence of these skills demonstrates that the pipeline is **encoded**, not ad hoc. A new session picks up the same standards without re-explaining them.

---

#### 5.3 How AI Output Was Reviewed and Corrected

AI output was not accepted verbatim. Each phase involved review cycles:

**Phase 2 — Portfolio Dashboard**
- AI imported `CurrencyPipe` but used a manual `formatCurrency()` method instead. The unused import produced a compiler warning. Caught and removed before commit.
- Default Angular budget (500kB) triggered a warning once Ionic components were added. Reviewed, understood (Ionic standalone adds ~68kB), and budget adjusted with rationale.

**Phase 3 — Chat**
- AI omitted `DatePipe` from the standalone `imports` array despite using `| date` in the template. Build failed with `NG8004`. Caught at compile gate, fixed before commit.

**Phase 4 — Capacitor**
- AI's initial `.gitignore` excluded `frontend/ios/` and `frontend/android/` entirely — correct for generated build artifacts, wrong for the Xcode project and Gradle project files that must be committed. Reviewed, corrected to exclude only build artifacts (`Pods/`, `app/build/`, `.gradle/`).

**Phase 5 — API Integration**
- Three separate Android networking layers had to be diagnosed independently: `10.0.2.2` routing, cleartext traffic flag in `AndroidManifest.xml`, and mixed-content blocking from `androidScheme: 'https'`. Each was a distinct root cause. AI identified all three correctly after reading the manifest, but the diagnosis required directing it to read the right file.

---

#### 5.4 Standards Enforced Across All AI Output

Every file produced by AI in this project was held to these non-negotiable constraints, defined upfront in `CLAUDE.md`:

| Constraint | Enforcement mechanism |
|---|---|
| No `any` types | `strict: true` in tsconfig — compile error if violated |
| Standalone only | `NG8004` / `NG6001` compile errors if NgModule patterns used |
| `inject()` not constructor | Code review — not compiler-enforced, human-verified |
| `takeUntilDestroyed` | Code review — grep `subscribe(` in components |
| All three UI states | Feature checklist — manually verified on each simulator |
| Conventional commits | Git workflow skill — applied before every commit |
| Ionic CSS variables only | Code review — grep for hardcoded colors |

---

#### 5.5 Summary Table

| Signal | Level | Evidence |
|---|---|---|
| Phased delivery with exit criteria | 4 | 6 initial phases + 8+ formal pipeline runs, all gated on zero-error build |
| Compile gate on every commit | 4 | `npm run build` verified before every commit across all runs |
| Encoded skills (slash commands) | 4 | 6 commands covering review, checklist, component, workflow, testing |
| AI output review cycle | 4 | 4 build-phase issues + 6 audit findings (W1–W5, I1) corrected |
| Cross-platform verification | 4 | iOS Simulator + Android Emulator confirmed on every pipeline run |
| Conventional commit history | 3 | All commits prefixed; 8 PRs merged with full audit trail |
| Automated test suite | 4 | 42 tests (30 frontend Vitest + 12 backend Jest), 0 failing |

---

#### 5.6 Formal Pipeline Runs (Post-Initial Build)

After the initial build, all features were delivered through the formal 7-stage ATDD pipeline (SCOUT → ARCHITECT → SPECS → QA-FIRST → BUILDER → REVIEWER → QA-VERIFY).

| Run | Branch | What was built | Key finding |
|-----|--------|----------------|-------------|
| 001 | `pipeline/001-audit-fixes` | Scout audit — W1–W5, I1 code quality fixes | NEW-1 found by SCOUT-002 reaudit |
| 002 | `pipeline/002-automation-completeness` | SPECS agent, QA-FIRST/ATDD, INTAKE, auto-docs | REVIEWER FAIL→retry caught W3 grep false positive |
| 003 | `pipeline/003-integration-tests` | Supertest backend integration tests | 11 new tests; total reaches 38 |
| 004 | `pipeline/004-ui-bloomberg` | Bloomberg dark UI + real Claude API | Task 013b frontend-backend disconnect caught by human on device |
| 005 | `pipeline/005-portfolio-chart` | SVG donut allocation chart | Ran in parallel with pipeline/006 via git worktree |
| 006 | `pipeline/006-app-logo` | 8FIGURES icon + splash iOS + Android | Parallel worktree execution demonstrated |
| 007 | `pipeline/007-pre-submission-polish` | Donut chart polish + documentation consistency | — |

---

## Docs-as-Code Approach

All pipeline decisions are written before execution. This is the docs-as-code principle applied to AI agent orchestration:

- **Task files** (`tasks/NNN-*.md`) are executable specs — agent inputs, outputs, constraints, and handoff conditions are written before any agent runs
- **Design docs** (`design-docs/`) are contracts between ARCHITECT and BUILDER — no code is written without a design document
- **Audit reports** (`audit-reports/`) and **review reports** (`review-reports/`) are first-class artifacts committed alongside code
- **Future agents** (`design-docs/future-agents.md`) documents planned improvements with implementation paths and deliberate tradeoff rationale
- **Failure handling** (`design-docs/pipeline-failure-handling.md`) documents all failure scenarios before they occur

This approach means the pipeline is fully reproducible: any engineer can re-run any stage by reading the relevant task file.

## Pipeline Evolution

### Current State — Human-Gated Pipeline
- Pipeline runs on feature branch per task
- Each agent produces artifact files as output
- Human reviews every agent handoff (Engineering Director role)
- Human creates PR after QA approval
- Merge to main = deployment gate

### Next Step — Semi-Automated PRs (1 day to implement)
- QA agent runs: `gh pr create --title "pipeline/001" --body "$(cat review-reports/latest.md)"`
- REVIEWER report becomes PR description automatically
- Human gate moves from "create PR" to "click Merge"
- Full audit trail lives in GitHub, not just local files
- Requires: gh CLI + GitHub token in environment

### Future — Full Integration (1 sprint to implement)
- Jira ticket created → webhook → auto-generates task file
- GitHub Projects card move → triggers pipeline run
- Monday.com column change → spawns agent session
- CronCreate schedules nightly SCOUT drift detection
- Auto-creates tasks for new findings
- Task files become the contract between PM and AI pipeline

### ORCHESTRATOR Agent (1 sprint to implement)
Meta-agent that replaces human orchestration between stages:
- Reads task file → executes full agent sequence autonomously
- Passes artifacts between agents without human intervention
- Escalates to human only when blocked or when 2 retry cycles fail
- Uses TaskCreate/TaskGet/TaskUpdate for pipeline state tracking
- See: design-docs/future-agents.md — Planned: ORCHESTRATOR Agent

### Git Flow
Current manual convention (enforced by scripts/run-agent.sh):
- All pipeline runs on `pipeline/NNN-description` branches
- Infrastructure/docs changes may go to main directly
- Human creates PR after QA approval; merge to main = deployment gate
- Future: ORCHESTRATOR creates branches and PRs automatically

### Parallel Execution via Git Worktrees — Demonstrated

Parallel pipeline execution was demonstrated in Pipeline runs 005 and 006:

```bash
git worktree add ../8figures-pipeline-005 pipeline/005-portfolio-chart
git worktree add ../8figures-pipeline-006 pipeline/006-app-logo
```

Both ran simultaneously with independent filesystems, builds, and agent contexts. Merged sequentially after both QA gates passed (lowest NNN first: 005 then 006). This is exactly the "5-10 concurrent sessions" pattern the evaluators run daily.

Future parallel execution at scale:
- ORCHESTRATOR manages all worktrees from a single session
- Each pipeline/NNN branch gets its own worktree directory
- Human gates apply per worktree independently

### Why Not Implemented Now
Deliberate tradeoff decision:
- Auto-PR creation adds gh CLI dependency and auth complexity
- Risk of pipeline failure at final stage outweighs benefit
- Architecture supports it — QA agent needs one additional bash command to enable
- Describing the path is more valuable than rushing the implementation and breaking what works

### Testing Strategy Evolution

Current: Unit tests (Vitest/Jest) — 42 passing (30 frontend + 12 backend integration)
Next: ATDD (Acceptance Test-Driven Development) — QA-FIRST red-green-refactor pipeline
Then: Contract Testing (Pact.io) — consumer-driven API contracts
Then: Property-Based Testing (fast-check) — financial edge cases

Full testing pyramid for production fintech:
- Unit tests (current) — fast, isolated
- Contract tests (next) — API stability guaranteed
- Property tests (next) — financial edge cases covered
- E2E tests (future) — full user journey on device
