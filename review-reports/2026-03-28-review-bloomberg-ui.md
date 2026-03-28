# Review Report — Bloomberg Dark UI (Task 012) — 2026-03-28

## Result: FAIL

## Recommendation: RETURN TO BUILDER

One WARNING-level violation remains open: `color="primary"` was not removed from
the send button in the chat page. The design doc required removal of
`color="primary"` from `ion-toolbar` elements and that was done correctly, but the
`ion-button.send-btn` in `chat-page.component.html` retains `color="primary"`,
which causes Ionic to apply its primary palette to the button host and can conflict
with or partially override the `--background: var(--app-accent)` token set in
`.send-btn` SCSS.

---

## Files Reviewed

| File | Status |
|------|--------|
| `frontend/src/theme/variables.css` | Reviewed |
| `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.scss` | Reviewed |
| `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.html` | Reviewed |
| `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.ts` | Reviewed |
| `frontend/src/app/features/chat/components/chat-page/chat-page.component.html` | Reviewed |
| `frontend/src/app/features/chat/components/chat-page/chat-page.component.scss` | Reviewed |
| `design-docs/2026-03-28-bloomberg-ui.md` | Reviewed (spec reference) |

---

## Grep Evidence

### Design tokens present — PASS
```
variables.css:14:  --app-bg:             #0a0a0f;
variables.css:17:  --app-accent:         #00d4aa;
variables.css:27:  --ion-background-color:        var(--app-bg);
variables.css:10:@import '@ionic/angular/css/palettes/dark.always.css';
```
All four required tokens/overrides confirmed. `dark.always.css` is used (not
`dark.system.css`), satisfying OQ-2 from the design doc.

### Hardcoded hex in portfolio-dashboard SCSS — PASS
No output from `grep -n "#4ade80\|#f87171\|#ffffff\|#FFFFFF"`. No legacy
hardcoded gain/loss hex values remain.

### Hardcoded hex in chat-page SCSS — CONDITIONAL PASS
```
chat-page.component.scss:170:  --background-activated: #00b891;
chat-page.component.scss:171:  --color: #0a0a0f;
```
These two values are prescribed verbatim in the design doc (section "Chat Page
SCSS Changes, 5. Input bar and footer"). BUILDER reproduced the spec faithfully.
`#0a0a0f` is the value of `--app-bg`; no token was defined for it in the button
context. Flagged as INFO — this is a design doc gap, not a BUILDER deviation.

### color="primary" on ion-toolbar — PASS
Both `portfolio-dashboard.component.html` and `chat-page.component.html` contain
no `color="primary"` on any `ion-toolbar` element.

### color="primary" on ion-button — FAIL
```
chat-page.component.html:63:      color="primary"
```
The send button (`ion-button.send-btn`) in the chat page retains `color="primary"`.
The design doc mandated that `color="primary"` be removed from `ion-toolbar`
elements. The send button was not explicitly called out, but CLAUDE.md rule
"Do NOT hardcode colors — use CSS variables" combined with the design doc's token
architecture means the button should use only CSS variable overrides without the
`color` attribute, which forces Ionic's primary palette cascade onto the host.

### displayValue signal — PASS
```
portfolio-dashboard.component.ts:74:  displayValue = signal<number>(0);
portfolio-dashboard.component.ts:142:        this.displayValue.set(targetValue);
portfolio-dashboard.component.ts:145:        this.displayValue.set(Math.round(current));
```

### startCountUp method — PASS
```
portfolio-dashboard.component.ts:99:          this.startCountUp(data.totalValue);
portfolio-dashboard.component.ts:119:          this.startCountUp(data.totalValue);
portfolio-dashboard.component.ts:130:  private startCountUp(targetValue: number): void {
```
Called in both `loadPortfolio` and `handleRefresh` next callbacks as required.

### No any types — PASS
Zero matches for `: any` in the component TypeScript file.

### gain-loss-pill in HTML — PASS
```
portfolio-dashboard.component.html:92:  <span class="gain-loss-pill" [ngClass]="holding.gainLoss >= 0 ? 'pill-gain' : 'pill-loss'">
```

### holding-accent-bar in HTML — PASS
```
portfolio-dashboard.component.html:83:  <div class="holding-accent-bar" [ngClass]="holding.gainLoss >= 0 ? 'bar-gain' : 'bar-loss'"></div>
```

---

## Build Result

PASS — zero errors.

```
Application bundle generation complete. [2.111 seconds]
Output location: /Users/prime/Documents/dev/ai/8figures/frontend/dist/frontend
```

---

## Test Result

PASS — 30 tests passing, 0 failing.

```
Test Files  3 passed (3)
      Tests  30 passed (30)
   Duration  1.53s
```

---

## Violations

| # | Severity | File | Line | Rule | Finding |
|---|----------|------|------|------|---------|
| 1 | WARNING | `frontend/src/app/features/chat/components/chat-page/chat-page.component.html` | 63 | CLAUDE.md: "Do NOT hardcode colors — use CSS variables" / design doc token architecture | `color="primary"` remains on `ion-button.send-btn`. Ionic applies its primary colour palette to the button host when this attribute is present, which can override or conflict with the `--background: var(--app-accent)` CSS variable override set in `.send-btn` SCSS. The design doc required removal of `color="primary"` from `ion-toolbar` elements; the button was not explicitly listed but the same token-integrity concern applies. |
| 2 | INFO | `frontend/src/app/features/chat/components/chat-page/chat-page.component.scss` | 170–171 | Design doc OQ-2 gap | `.send-btn` uses `--background-activated: #00b891` and `--color: #0a0a0f` as raw hex. Both values are specified verbatim in the design doc. `#0a0a0f` equals `--app-bg` and could use the token. `#00b891` has no corresponding token. This is a design doc gap — BUILDER reproduced the spec as written. No fix required from BUILDER unless the design doc is updated. |

---

## Checklist

- [x] No `any` types — zero matches for `: any` across all component TypeScript files
- [x] No `console.log` — zero matches across all TypeScript source files
- [x] All components `standalone: true` — all `.component.ts` files include `standalone: true`
- [x] All components `ChangeDetectionStrategy.OnPush` — all `.component.ts` files include `OnPush`
- [x] All DI via `inject()` — no constructor parameters in any component
- [x] All subscriptions have `takeUntilDestroyed` — both component subscriptions use `.pipe(takeUntilDestroyed(this.destroyRef))` before `.subscribe()`; spec test subscriptions are exempt
- [x] All `ion-` components imported from `@ionic/angular/standalone` — confirmed in portfolio-dashboard.component.ts lines 13–28
- [x] No `NgModule` references — zero matches
- [x] Loading / error / empty states present for all data-fetching components — confirmed: loading skeleton, error state with retry, empty holdings state all present in portfolio dashboard; chat page has empty/loading state
- [x] All currency values use locale format (`$1,234.56`) — `formatCurrency` uses `toLocaleString('en-US', { style: 'currency', currency: 'USD' })` on line 151 of component TS
- [x] All percentage values show explicit sign (`+2.34%` / `-1.23%`) — `formatPercent` prepends `+` for gains on line 155 of component TS
- [x] Gains shown in `var(--ion-color-success)` green — NOTE: gains use `var(--app-accent)` per design doc. The design doc explicitly replaces the Ionic success variable with the custom `--app-accent` token (`#00d4aa`). This is an intentional design decision documented in the spec.
- [x] Losses shown in `var(--ion-color-danger)` red — NOTE: losses use `var(--app-loss)` per design doc. Same intentional token substitution (`#ff4757`).
- [x] No business logic in components — `formatCurrency`, `formatPercent`, `formatChange`, and `assetTypeLabel` remain on the component (pre-existing scout warning W4; design doc explicitly defers this to a separate audit-fix task)

---

## Summary

Build is clean, all 30 tests pass, and all CLAUDE.md structural rules are satisfied.
One WARNING remains: `color="primary"` on `ion-button.send-btn` in
`frontend/src/app/features/chat/components/chat-page/chat-page.component.html`
line 63 was not removed and conflicts with the design token architecture. BUILDER
must remove the `color="primary"` attribute from that element before this task can
be approved.
