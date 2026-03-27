# 8FIGURES Portfolio Companion — Project Intelligence

## Project Context
This is a Principal Engineer assessment for 8FIGURES, an AI-powered personal
financial advisor startup (pre-Series A, team of 8). The evaluators are
engineers who run 5-10 concurrent Claude Code sessions daily. They will read
every line of this CLAUDE.md and judge pipeline quality as 50% of the score.

## What We Are Building
A mobile-first AI portfolio companion with:
1. Portfolio Dashboard — holdings, total value, daily P&L
2. AI Chat Interface — streaming responses, portfolio-aware context
3. Lightweight Node/Express backend — data API + AI proxy
4. Capacitor deployment — iOS Simulator + Android Emulator

## Tech Stack (non-negotiable, exact versions)
- Angular 20+ (standalone components, no NgModules)
- Ionic Framework 8+ (mobile UI components)
- Capacitor 6+ (iOS + Android builds)
- TypeScript 5+ (strict mode, no ANY types ever)
- Node.js + Express (backend API)
- RxJS + Angular Signals (reactive patterns)

## Architecture Principles
- Standalone components ONLY — no NgModules
- Feature-based folder structure, not type-based
- Smart/dumb component pattern strictly enforced
- Services handle ALL business logic — components are display only
- Dependency injection for everything — no service instantiation in components
- Reactive first: Signals for local state, RxJS for async streams

## Folder Structure
```
8figures/
├── frontend/                    # Angular + Ionic app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/            # singleton services, interceptors, guards
│   │   │   │   ├── services/
│   │   │   │   └── models/
│   │   │   ├── features/
│   │   │   │   ├── portfolio/   # dashboard feature
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── models/
│   │   │   │   └── chat/        # AI chat feature
│   │   │   │       ├── components/
│   │   │   │       ├── services/
│   │   │   │       └── models/
│   │   │   └── shared/          # reusable UI components
│   │   └── environments/
├── backend/                     # Node + Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── data/                # mock data
└── .claude/                     # Claude Code pipeline config
    └── commands/                # custom slash commands
```

## Data Models (follow exactly)

### Portfolio
```typescript
interface Portfolio {
  id: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  lastUpdated: Date;
  holdings: Holding[];
}

interface Holding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  avgCostBasis: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  assetType: 'stock' | 'etf' | 'crypto' | 'bond';
}
```

### Chat
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatContext {
  portfolio: Portfolio;
  messages: ChatMessage[];
}
```

## Mock Data Requirements
Create realistic portfolio with minimum:
- 8 holdings (mix of stocks, ETFs, crypto)
- Include winners AND losers (realistic)
- Total portfolio value ~$125,000
- Mix of asset types

Suggested holdings: AAPL, NVDA, MSFT, BTC, ETH, VOO, TSLA, AMZN

## AI Chat Implementation
Use MOCK implementation with streaming simulation:
- Simulate streaming with Observable + timer intervals
- Character-by-character reveal (15ms delay per character)
- Responses MUST reference actual portfolio data
- Pre-built contextual responses for common questions:
  - "How is my portfolio doing?"
  - "What is my best performer?"
  - "Should I rebalance?"
  - "What is my crypto exposure?"
- Fallback intelligent response for unknown questions

## Streaming Pattern (mandatory)
```typescript
// Always use this pattern for streaming
streamResponse(text: string): Observable {
  return new Observable(observer => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        observer.next(text[index]);
        index++;
      } else {
        clearInterval(interval);
        observer.complete();
      }
    }, 15);
  });
}
```

## Backend API Endpoints
```
GET  /api/portfolio          → returns Portfolio object
GET  /api/portfolio/holdings → returns Holding[]
POST /api/chat               → accepts {message, context}, returns stream
GET  /api/health             → health check
```

## TypeScript Rules
- strict: true in tsconfig — always
- No implicit any — EVER
- All function parameters typed
- All return types explicit on public methods
- Interfaces over types for objects
- Enums for fixed sets of values

## Ionic/Mobile UI Rules
- Use ion- components for ALL UI elements
- ion-header + ion-toolbar + ion-title on every page
- ion-content with padding for all scrollable areas
- ion-card for holdings list items
- ion-avatar or ion-icon for asset type indicators
- Color scheme: use Ionic CSS variables, dark theme preferred
- Financial numbers: always use proper locale formatting
  - Currency: $1,234.56 format
  - Percentages: +2.34% / -1.23% with color (green/red)
  - Never show raw unformatted numbers

## Code Quality Rules
- No console.log in production code (use proper service)
- Error handling on ALL async operations
- Loading states for ALL data fetching
- Empty states for lists (no data scenarios)
- Never subscribe() without unsubscribe — use async pipe or takeUntilDestroyed

## Git Conventions
- Conventional commits: feat:, fix:, refactor:, docs:, chore:
- One logical change per commit
- Commit after each working feature, not at the end

## What NOT to Do
- Do NOT use NgModules — standalone only
- Do NOT use any — use unknown and type guard
- Do NOT put business logic in components
- Do NOT use deprecated Ionic 5 patterns
- Do NOT forget error states in UI
- Do NOT hardcode colors — use CSS variables
- Do NOT create files outside the defined structure

## Build Commands
```bash
# Frontend
cd frontend
npm install
npm start                    # dev server
npm run build               # production build
npx cap sync                # sync to native
npx cap run ios             # iOS simulator
npx cap run android         # Android emulator

# Backend
cd backend
npm install
npm run dev                 # development with nodemon
```

## Pipeline Git Rules
CRITICAL: Every pipeline run MUST follow this git flow automatically.

Before starting ANY pipeline task:
1. Check current branch — if on main, create new branch
2. Branch naming: pipeline/NNN-short-description
   where NNN matches the task file number
3. Never commit pipeline artifacts to main directly
4. After QA approves: remind Engineering Director to open PR

NOTE: This is a temporary manual approach. See ARCHITECTURE.md
"## Pipeline Evolution" for the roadmap to fully automated
PR creation where:
- QA agent runs gh pr create automatically
- REVIEWER report becomes PR description
- Human gate moves from "create PR" to "click Merge"

## Definition of Done
A feature is complete when:
1. TypeScript compiles with zero errors
2. Runs on iOS Simulator without crashes
3. Runs on Android Emulator without crashes
4. Loading state implemented
5. Error state implemented
6. Empty state implemented (where applicable)
7. All financial numbers properly formatted
