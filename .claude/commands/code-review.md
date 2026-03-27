# Code Review Skill

When reviewing any Angular component, service, or backend file generated during this project, apply the following checklist in order. Flag every violation with the file path and line number. Do not approve until all items pass.

## TypeScript Strict Compliance
- [ ] `strict: true` is set in the relevant `tsconfig.json` — never downgrade it
- [ ] Zero `any` types — use `unknown` with a type guard if the shape is truly unknown
- [ ] All public method return types are explicitly declared
- [ ] All function parameters are typed — no implicit parameter types
- [ ] `interface` used for object shapes, not `type` aliases (unless a union/intersection is needed)
- [ ] Enums or discriminated unions used for fixed value sets (e.g. `assetType`)

## Angular / Component Hygiene
- [ ] `standalone: true` on every component — no `NgModule` referenced anywhere
- [ ] `ChangeDetectionStrategy.OnPush` declared on every component
- [ ] `inject()` used for all dependency injection — zero constructor-injected dependencies
- [ ] No business logic in components — calculations, formatting rules, and data transforms live in services
- [ ] No raw `new ServiceName()` instantiation — everything goes through DI
- [ ] `@Input` signals use `input()` / `input.required()` (Angular 17+); legacy `@Input()` decorator only if there is a specific reason

## Subscription Management
- [ ] Every `subscribe()` call is paired with `takeUntilDestroyed(this.destroyRef)` or uses the `async` pipe
- [ ] No bare `subscribe()` without cleanup in a component
- [ ] `DestroyRef` injected via `inject(DestroyRef)`, not via `OnDestroy` + subject pattern
- [ ] Streaming observables (chat) have `error` and `complete` handlers, not just `next`

## State Completeness
- [ ] Loading state: skeleton or spinner shown while any async operation is in flight
- [ ] Error state: user-visible message + retry action for every fallible HTTP call
- [ ] Empty state: meaningful "no data" UI for every list that can be empty
- [ ] Streaming state: send button disabled, input disabled, typing indicator visible while streaming

## UI / Ionic Rules
- [ ] Every page has `ion-header` + `ion-toolbar` + `ion-title`
- [ ] All scrollable areas use `ion-content`
- [ ] No hardcoded hex/rgb colors — only `var(--ion-color-*)` CSS variables
- [ ] All currency values formatted as `$1,234.56` via `toLocaleString` or `CurrencyPipe`
- [ ] All percentage values formatted as `+2.34%` / `-1.23%` with explicit sign
- [ ] Gain values styled `color: var(--ion-color-success)`, loss values `var(--ion-color-danger)`

## Code Quality
- [ ] Zero `console.log` statements — use a logging service or remove entirely
- [ ] All async operations have `try/catch` or RxJS `catchError` — no unhandled promise rejections
- [ ] No magic numbers or magic strings — extract to named constants
- [ ] Files live in the correct feature directory — nothing created outside the defined structure

## Build Gate
- [ ] `npm run build` (frontend) produces zero TypeScript errors and zero warnings
- [ ] `tsc` (backend) produces zero TypeScript errors
- [ ] After review fixes, re-run build before marking complete
