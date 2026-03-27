# Feature Checklist Skill

Use this checklist before marking any feature complete and creating its commit. A feature is NOT done until every item is checked. Work through the list top to bottom — do not skip items because they seem obvious.

## 1. Compilation
- [ ] `npm run build` in `frontend/` exits with zero TypeScript errors
- [ ] `npm run build` in `frontend/` exits with zero warnings (budget warnings must be resolved by adjusting budgets if Ionic size is the cause)
- [ ] `tsc` in `backend/` exits with zero TypeScript errors

## 2. iOS Simulator
- [ ] App launches without crash on iOS Simulator
- [ ] Feature renders correctly at iPhone viewport (375pt width)
- [ ] No blank/white screen — data loads or an error state is shown
- [ ] All `ion-` components render properly (no unstyled native elements)
- [ ] Navigation works (back button returns to previous screen)

## 3. Android Emulator
- [ ] App launches without crash on Android Emulator
- [ ] Feature renders correctly at medium-phone viewport
- [ ] No blank/white screen — data loads or an error state is shown
- [ ] HTTP API calls succeed (backend reachable via `10.0.2.2:3000`)
- [ ] No mixed-content or cleartext errors in logcat

## 4. State Completeness
- [ ] **Loading state** — skeleton or spinner is visible the moment data fetch begins
- [ ] **Error state** — visible message + retry button when the HTTP call fails (test by stopping the backend)
- [ ] **Empty state** — meaningful UI when a list has zero items (not just an empty container)
- [ ] **Streaming state** (chat only) — typing indicator visible, send disabled, input disabled while streaming

## 5. Data Display
- [ ] All currency values use `$1,234.56` locale format — no raw floats shown to user
- [ ] All percentage values show explicit sign: `+2.34%` or `-1.23%`
- [ ] Gain values are visually green (`var(--ion-color-success)`)
- [ ] Loss values are visually red (`var(--ion-color-danger)`)
- [ ] Large numbers (portfolio totals) are not truncated on small screens

## 6. Code Quality Gate
- [ ] No `any` types introduced — run `grep -r ": any" src/` to verify
- [ ] No `console.log` in production code — run `grep -r "console.log" src/` to verify
- [ ] No business logic added to components — all new calculations live in services
- [ ] Every new subscription uses `takeUntilDestroyed`

## 7. Unit Tests
- [ ] Run `npx ng test --watch=false` from `frontend/` — all tests must pass
- [ ] Any new service has a corresponding `.spec.ts` covering happy path, error path, and platform variants
- [ ] No `any` types in test files — fixture objects must match their interfaces exactly
- [ ] Streaming observables tested with `vi.useFakeTimers()` + `vi.runAllTimers()`
- [ ] `httpMock.verify()` called in `afterEach` — no unexpected HTTP requests left open

## 8. Commit Readiness
- [ ] All changes are scoped to the feature being committed (no unrelated edits staged)
- [ ] Commit message follows conventional format: `feat: <description>` / `fix: <description>`
- [ ] Commit is atomic — one logical change, not a dump of everything since last commit
