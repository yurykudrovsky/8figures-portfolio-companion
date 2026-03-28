# Design Doc — Bloomberg Dark UI Transformation — 2026-03-28

## Problem Statement

Task 012 identifies the UX/Design criterion as 20% of the assessment score, making
the visual treatment a direct scoring lever. The current UI uses default Ionic light
surfaces (white cards, `--ion-color-primary` backgrounds, hardcoded success/danger
colour variables) that read as a generic mobile prototype rather than a professional
financial tool. Specific gaps motivating this design:

- The portfolio dashboard summary card uses `var(--ion-color-primary)` as its
  background — it will shift colour if the theme palette changes and does not match
  the dark terminal aesthetic required.
- Gain/loss colours are hardcoded as `#4ade80` / `#f87171` on lines 50 and 53 of
  `portfolio-dashboard.component.scss`. These do not match the project design tokens
  (`--app-accent: #00d4aa` / `--app-loss: #ff4757`).
- `ion-card` and `ion-toolbar` retain their default Ionic light/white backgrounds
  unless explicitly overridden via Ionic's published CSS custom properties.
- No stagger animation, no count-up animation, and no slide-in for chat messages
  currently exist.
- Scout finding W4 notes that `formatCurrency`, `formatPercent`, and `formatChange`
  live on the component. This design does not move them (that is the scope of a
  separate audit-fix task) but it must not break their call sites in the HTML.

No CRITICAL findings from the scout audit affect this feature directly. All scout
WARNINGS are noted; this design does not resolve W1–W6 (those are addressed by the
companion audit-fix design doc at `design-docs/2026-03-28-audit-fixes.md`), but it
must not introduce new violations.

---

## Proposed Solution

Define a set of named CSS custom properties (design tokens) once in
`frontend/src/theme/variables.css` and then apply them globally by overriding the
Ionic surface variables (`--ion-background-color`, `--ion-toolbar-background`,
`--ion-card-background`, `--ion-item-background`) in the same file. Component SCSS
files reference only the design tokens — never raw hex values — so the palette is
changed in one place. The portfolio dashboard receives a restructured hero section,
dark card rules, and a gain/loss pill badge; the component TypeScript gains a
count-up signal for the animated total value. The chat page SCSS is restyled to
match the same dark surface palette. No new npm dependencies are introduced; all
animation uses native CSS `@keyframes` and a single `setInterval` in `ngOnInit`.

---

## Interface Definitions

```typescript
/**
 * CountUpState is the internal shape used by the count-up animation signal.
 * The component holds displayValue as a writable Signal<number> separate from
 * the portfolio Signal so the template can show an intermediate value during
 * the 600 ms animation without mutating the portfolio data model.
 */
interface CountUpState {
  /** The value currently rendered in the hero number during animation. */
  displayValue: number;
  /** True while the setInterval is still ticking. */
  animating: boolean;
}
```

No new public service interfaces are required. The existing `Portfolio` and
`Holding` interfaces defined in `CLAUDE.md` and implemented in
`frontend/src/app/core/models/portfolio.model.ts` are used as-is.

---

## Data Flow Diagram

```
PortfolioService.getPortfolio()
        │
        ▼
portfolio Signal<Portfolio | null>      (existing)
        │
        ├──► template binding: formatCurrency(p.totalValue)   (existing method)
        │
        └──► ngOnInit count-up trigger
                  │
                  ▼
            displayValue Signal<number>  (new)
                  │
                  ├── starts at 0
                  ├── setInterval ticks every ~10 ms
                  ├── increments toward portfolio.totalValue over 600 ms
                  ├── on final tick: set to exact portfolio.totalValue, clearInterval
                  └──► template renders formatCurrency(displayValue())
                             │
                             ▼
                        Hero section in portfolio-dashboard.component.html
```

```
Design tokens defined once
  frontend/src/theme/variables.css
        │
        ├──► :root { --app-bg, --app-card, --app-card-border, … }
        ├──► Ionic surface overrides (--ion-background-color, etc.)
        ├──► portfolio-dashboard.component.scss  (consumes tokens)
        └──► chat-page.component.scss            (consumes tokens)
```

---

## Component Tree

No new components are introduced. All changes are style and behaviour modifications
to the two existing page components.

```
AppComponent (root)
  ├── PortfolioDashboardComponent   [MODIFY]
  │     ├── ion-header / ion-toolbar
  │     ├── ion-content
  │     │     ├── ion-refresher
  │     │     ├── .summary-hero     ← renamed from .summary-card for new layout
  │     │     │     ├── .hero-label
  │     │     │     ├── .hero-value  ← binds displayValue() signal (count-up)
  │     │     │     └── .hero-change
  │     │     ├── h2.section-heading
  │     │     └── ion-card.holding-card  (× N holdings)
  │     │           ├── .holding-accent-bar  ← new gain/loss left-border element
  │     │           ├── ion-card-header
  │     │           │     ├── .holding-title-group
  │     │           │     └── .gain-loss-pill   ← new badge element (replaces ion-badge)
  │     │           └── ion-card-content
  └── ChatPageComponent             [MODIFY]
        ├── ion-header / ion-toolbar
        ├── ion-content
        │     └── .message-list
        │           ├── .bubble.user-bubble
        │           └── .bubble.assistant-bubble
        └── ion-footer
              └── .input-bar
                    ├── ion-textarea.chat-input
                    └── ion-button.send-btn
```

---

## API Contract

No backend API endpoints are added or changed by this task. All changes are
frontend-only (CSS, HTML, TypeScript component behaviour).

---

## CSS / SCSS Design Token Definitions

### Token declarations — `frontend/src/theme/variables.css`

All tokens go inside the existing `:root` block (or a new one appended to the
file). The file currently only imports `dark.system.css`; BUILDER must append the
token block and the Ionic override block below it.

```css
/* ── 8FIGURES design tokens ───────────────────────────────── */
:root {
  --app-bg:             #0a0a0f;
  --app-card:           #0d1117;
  --app-card-border:    #1a2332;
  --app-accent:         #00d4aa;
  --app-loss:           #ff4757;
  --app-text-primary:   #e8eaf0;
  --app-text-secondary: #8892a4;
  --app-accent-10:      rgba(0, 212, 170, 0.10);
  --app-loss-10:        rgba(255, 71, 87, 0.10);
}
```

### Global Ionic surface overrides — same file, same `:root` block

These use the CSS custom properties that Ionic 8 exposes for theming. They must be
placed in `:root` (or `.ion-palette-dark` if using the class-based dark palette
import) so they take effect globally. Because the project currently imports
`dark.system.css`, Ionic will apply its own dark values when the OS is in dark mode;
the declarations below override those values unconditionally, ensuring the Bloomberg
palette is always active regardless of OS setting.

```css
/* ── Global Ionic surface overrides ───────────────────────── */
:root {
  --ion-background-color:        var(--app-bg);
  --ion-background-color-rgb:    10, 10, 15;

  --ion-text-color:              var(--app-text-primary);
  --ion-text-color-rgb:          232, 234, 240;

  --ion-toolbar-background:      var(--app-card);
  --ion-toolbar-color:           var(--app-text-primary);
  --ion-toolbar-border-color:    var(--app-card-border);

  --ion-card-background:         var(--app-card);

  --ion-item-background:         transparent;
  --ion-item-border-color:       var(--app-card-border);

  --ion-color-step-50:           #0f1419;
  --ion-color-step-100:          #141b24;
  --ion-color-step-150:          #1a2332;
  --ion-color-step-200:          #1f2b3a;
}
```

The `--ion-color-step-*` overrides are required because many Ionic components use
step colours as separator/divider colours. Setting steps 50–200 to dark values
eliminates residual light rules.

---

## Portfolio Dashboard SCSS Changes

The following rules replace or augment the existing `portfolio-dashboard.component.scss`.
BUILDER must keep all existing rules that are not explicitly replaced, and add the
new ones described below.

### 1. Hero section (replaces `.summary-card`)

The existing CSS class `.summary-card` is renamed to `.summary-hero` in both the
SCSS and the HTML. The background changes from `var(--ion-color-primary)` to
`var(--app-card)`.

```scss
.summary-hero {
  background: var(--app-card);
  border: 1px solid var(--app-card-border);
  border-radius: 16px;
  padding: 28px 24px 24px;
  text-align: center;
  margin-bottom: 24px;

  &.skeleton-summary {
    min-height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
}

.hero-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--app-text-secondary);
  margin: 0 0 8px;
}

.hero-value {
  font-size: 2.8rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--app-text-primary);
  font-variant-numeric: tabular-nums;
  margin: 0 0 10px;
}

.hero-change {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0;

  ion-icon {
    font-size: 1.1rem;
  }

  &.gain {
    color: var(--app-accent);
  }

  &.loss {
    color: var(--app-loss);
  }
}
```

The existing `.summary-label`, `.total-value`, `.daily-change` rules are removed
(their selectors no longer exist in the HTML after the rename).

### 2. Gain/loss colours (replaces hardcoded hex)

The existing `.gain` and `.loss` rules currently use hardcoded hex. Replace them:

```scss
.gain {
  color: var(--app-accent);
}

.loss {
  color: var(--app-loss);
}
```

### 3. Dark holding card

Replace the existing `.holding-card` block:

```scss
.holding-card {
  margin: 0 0 10px;
  border-radius: 12px;
  border: 1px solid var(--app-card-border);
  background: var(--app-card);
  overflow: hidden;
  position: relative;
  opacity: 0;
  animation: card-fade-in 300ms ease-out forwards;

  ion-card-header {
    padding-bottom: 0;
  }
}
```

The `opacity: 0` + `animation` combination produces the stagger effect when combined
with the nth-child delay rule described in section 5 below.

### 4. Gain/loss left-border accent bar

```scss
.holding-accent-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;

  &.bar-gain {
    background: var(--app-accent);
  }

  &.bar-loss {
    background: var(--app-loss);
  }
}
```

### 5. Gain/loss pill badge

```scss
.gain-loss-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &.pill-gain {
    color: var(--app-accent);
    background: var(--app-accent-10);
  }

  &.pill-loss {
    color: var(--app-loss);
    background: var(--app-loss-10);
  }
}
```

### 6. Stagger animation

```scss
@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stagger: 50 ms per card, up to 10 cards */
@for $i from 1 through 10 {
  .holding-card:nth-child(#{$i}) {
    animation-delay: #{($i - 1) * 50}ms;
  }
}
```

### 7. Section heading colour update

```scss
.section-heading {
  color: var(--app-text-secondary);
}
```

### 8. Pull-to-refresh colour override

`ion-refresher` does not expose a direct CSS variable for spinner colour in Ionic 8.
The spinner colour is controlled by scoping a CSS variable override on the
`ion-refresher` host:

```scss
ion-refresher {
  --color: var(--app-accent);
}
```

### 9. Holding row separator

The row separator currently uses `var(--ion-color-step-100)`. With the token
overrides in place this resolves to `#141b24`, which is correct. No change needed.

---

## Portfolio Dashboard HTML Changes

BUILDER must make the following precise HTML changes. The component's signal names
(`portfolio()`, `loading()`, `error()`), method names (`formatCurrency()`,
`formatPercent()`, `formatChange()`, `assetTypeLabel()`), and the `@let p = portfolio()!`
pattern must not change — doing so would break the existing tests.

### 1. Remove `color="primary"` from `ion-toolbar`

```html
<!-- BEFORE -->
<ion-toolbar color="primary">

<!-- AFTER -->
<ion-toolbar>
```

Rationale: `color="primary"` forces Ionic to apply its primary palette colours as
inline CSS, overriding the `--ion-toolbar-background` token. Removing the attribute
lets the token take effect.

The same change applies to the chat page `ion-toolbar`.

### 2. Rename `.summary-card` to `.summary-hero`; rename child class selectors

```html
<!-- BEFORE (loading state) -->
<div class="summary-card skeleton-summary">

<!-- AFTER -->
<div class="summary-hero skeleton-summary">
```

```html
<!-- BEFORE (data state) -->
<div class="summary-card">
  <p class="summary-label">Total Portfolio Value</p>
  <h1 class="total-value">{{ formatCurrency(p.totalValue) }}</h1>
  <p class="daily-change" [ngClass]="p.dailyChange >= 0 ? 'gain' : 'loss'">
    <ion-icon [name]="p.dailyChange >= 0 ? 'trending-up-outline' : 'trending-down-outline'"></ion-icon>
    {{ formatChange(p.dailyChange, p.dailyChangePercent) }}
  </p>
</div>

<!-- AFTER -->
<div class="summary-hero">
  <p class="hero-label">Total Portfolio Value</p>
  <h1 class="hero-value">{{ formatCurrency(displayValue()) }}</h1>
  <p class="hero-change" [ngClass]="p.dailyChange >= 0 ? 'gain' : 'loss'">
    <ion-icon [name]="p.dailyChange >= 0 ? 'trending-up-outline' : 'trending-down-outline'"></ion-icon>
    {{ formatChange(p.dailyChange, p.dailyChangePercent) }}
  </p>
</div>
```

Note: `displayValue()` is the new signal defined in the TS section. During count-up
it holds an intermediate number; after animation it holds `p.totalValue`. The call
to `formatCurrency()` is unchanged so locale formatting and tests are unaffected.

### 3. Add `.holding-accent-bar` inside each `ion-card`

```html
<!-- BEFORE -->
<ion-card class="holding-card">
  <ion-card-header>

<!-- AFTER -->
<ion-card class="holding-card">
  <div class="holding-accent-bar" [ngClass]="holding.gainLoss >= 0 ? 'bar-gain' : 'bar-loss'"></div>
  <ion-card-header>
```

### 4. Replace `ion-badge` with `.gain-loss-pill`

The existing `ion-badge` shows asset type (Stock / ETF / Crypto / Bond). This is
retained as a small text label. The new pill badge is added to show the gain/loss
percentage and replaces visual emphasis previously carried by the plain text in the
`holding-row`.

```html
<!-- BEFORE: in .holding-header -->
<ion-badge [color]="holding.assetType === 'crypto' ? 'warning' : holding.assetType === 'etf' ? 'tertiary' : 'medium'">
  {{ assetTypeLabel(holding.assetType) }}
</ion-badge>

<!-- AFTER: in .holding-header, replace ion-badge with: -->
<div class="holding-header-right">
  <span class="asset-type-label">{{ assetTypeLabel(holding.assetType) }}</span>
  <span class="gain-loss-pill" [ngClass]="holding.gainLoss >= 0 ? 'pill-gain' : 'pill-loss'">
    {{ formatPercent(holding.gainLossPercent) }}
  </span>
</div>
```

The `.holding-header-right` wrapper stacks the asset type label above the pill.
Add the following SCSS rule for it:

```scss
.holding-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.asset-type-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--app-text-secondary);
}
```

Note: `IonBadge` is still imported in the component `imports` array because it may
be referenced by tests. BUILDER must check test files before removing the import.
If no test references `IonBadge` directly, it may be removed from the `imports`
array to keep the bundle clean.

---

## Portfolio Dashboard TypeScript Changes

### Count-up animation

Add one new `WritableSignal<number>` called `displayValue` and populate it via
`setInterval` in a private method called `startCountUp`. This method is invoked
from the existing `loadPortfolio` subscribe `next` callback, immediately after
`this.portfolio.set(data)`.

```typescript
// New signal — add alongside existing signal declarations
displayValue = signal<number>(0);
```

```typescript
// New private method — add after loadPortfolio()
private startCountUp(targetValue: number): void {
  const duration = 600;       // total animation ms
  const intervalMs = 10;      // tick every 10 ms
  const steps = duration / intervalMs;
  const increment = targetValue / steps;
  let current = 0;
  let ticks = 0;

  const timer = setInterval(() => {
    ticks++;
    current += increment;
    if (ticks >= steps) {
      this.displayValue.set(targetValue);
      clearInterval(timer);
    } else {
      this.displayValue.set(Math.round(current));
    }
  }, intervalMs);
}
```

```typescript
// Modified next callback inside loadPortfolio()
next: (data) => {
  this.portfolio.set(data);
  this.loading.set(false);
  this.startCountUp(data.totalValue);   // ← new line
},
```

The `setInterval` returns a `ReturnType<typeof setInterval>` (a number in browser
environments). No `ngOnDestroy` teardown is required because `clearInterval` is
always called on the final tick. If the component is destroyed mid-animation the
interval will continue to fire until it completes (at most 600 ms), then stop
naturally — this is acceptable given the short duration. BUILDER must not use a
`DestroyRef`-based teardown here as it would complicate the implementation for a
600 ms window.

The `handleRefresh` subscribe block should also call `this.startCountUp(data.totalValue)`
in its `next` callback so pull-to-refresh also animates the value.

No new imports are needed in the TypeScript file. `signal` is already imported from
`@angular/core`.

---

## Chat Page SCSS Changes

Replace or supplement the existing `chat-page.component.scss` rules as follows.

### 1. Header toolbar (handled globally via token; no component SCSS needed)

Removing `color="primary"` from `ion-toolbar` in the HTML is sufficient; the global
`--ion-toolbar-background: var(--app-card)` token then applies.

### 2. User message bubble

```scss
.user-bubble {
  background: var(--app-card-border);
  color: var(--app-text-primary);
  border-bottom-right-radius: 4px;
  border-left: 3px solid var(--app-accent);

  .bubble-time {
    color: var(--app-text-secondary);
  }
}
```

### 3. Assistant message bubble

```scss
.assistant-bubble {
  background: var(--app-card);
  color: var(--app-text-primary);
  border-bottom-left-radius: 4px;

  .bubble-time {
    color: var(--app-text-secondary);
  }
}
```

### 4. Typing indicator dots

```scss
.typing-indicator {
  background: var(--app-card);

  span {
    background: var(--app-accent);
  }
}
```

### 5. Input bar and footer

```scss
ion-footer {
  background: var(--app-card);
  border-top: 1px solid var(--app-card-border);
}

.chat-input {
  --background: var(--app-card);
  --color: var(--app-text-primary);
  --placeholder-color: var(--app-text-secondary);
  --border-color: var(--app-card-border);
  --highlight-color-focused: var(--app-accent);
}

.send-btn {
  --background: var(--app-accent);
  --background-activated: #00b891;
  --color: #0a0a0f;
}
```

### 6. Chat message slide-in animation

Add to the chat SCSS:

```scss
@keyframes msg-slide-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-row {
  animation: msg-slide-in 150ms ease-out forwards;
}
```

### 7. Empty/loading state colours

```scss
.empty-chat {
  color: var(--app-text-secondary);
}

.empty-icon {
  color: var(--app-text-secondary);
}
```

---

## File Map

| Action | File path | What changes |
|--------|-----------|--------------|
| MODIFY | `frontend/src/theme/variables.css` | Append design token block + Ionic surface variable overrides in `:root` |
| MODIFY | `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.scss` | Replace `.summary-card` with `.summary-hero` hero section rules; add `.holding-accent-bar`, `.gain-loss-pill`, `.gain-loss-pill` colour classes, `.holding-header-right`, `.asset-type-label`, stagger `@keyframes card-fade-in`, `@for` stagger delays, pull-to-refresh colour, update `.gain`/`.loss` to use tokens |
| MODIFY | `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.html` | Remove `color="primary"` from `ion-toolbar`; rename `.summary-card` to `.summary-hero`, `.summary-label` to `.hero-label`, `.total-value` to `.hero-value`, `.daily-change` to `.hero-change`; bind `displayValue()` signal in hero value; add `.holding-accent-bar` div; replace `ion-badge` with `.holding-header-right` + `.gain-loss-pill` structure |
| MODIFY | `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.ts` | Add `displayValue = signal<number>(0)`; add private `startCountUp(targetValue: number): void` method; call `startCountUp` from both `loadPortfolio` and `handleRefresh` next callbacks |
| MODIFY | `frontend/src/app/features/chat/components/chat-page/chat-page.component.html` | Remove `color="primary"` from `ion-toolbar` |
| MODIFY | `frontend/src/app/features/chat/components/chat-page/chat-page.component.scss` | Replace `.user-bubble`, `.assistant-bubble`, `.typing-indicator span` background colours with design tokens; update `ion-footer`, `.chat-input`, `.send-btn` CSS variable overrides; add `@keyframes msg-slide-in` + `.message-row` animation rule; update `.empty-chat` and `.empty-icon` colours |

---

## Open Questions

**OQ-1 — `ion-badge` import removal.**
The HTML change replaces `<ion-badge>` with a plain `<span>` for the asset type /
pill badge. BUILDER must grep the test files for `IonBadge` before removing it from
the component `imports` array. If any test spec imports or references `IonBadge`,
the import must be retained. Path to check:
`frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.spec.ts`

**OQ-2 — `dark.system.css` interaction.**
`frontend/src/theme/variables.css` currently imports `@ionic/angular/css/palettes/dark.system.css`.
That import applies Ionic's own dark variable overrides only when the OS is in dark
mode. The design tokens defined in `:root` will always apply. On a device running in
light mode the Ionic step colours will be light values unless overridden. BUILDER
must ensure the `--ion-color-step-*` overrides in the token block are placed after
the `@import` line so they take precedence unconditionally. If that is not sufficient
(i.e., some surfaces remain light on a light-OS test device), BUILDER should switch
the import from `dark.system.css` to `dark.always.css` and document the change.

**OQ-3 — `ion-refresher` spinner variable.**
The `--color` variable on `ion-refresher` is not listed in Ionic 8's official
refresher documentation. BUILDER must verify this variable name in the Ionic 8
source or changelog before shipping. If the variable does not exist, the alternative
approach is to set `--ion-color-primary: var(--app-accent)` scoped to the refresher
host, which is a confirmed Ionic theming pattern.

**OQ-4 — `setInterval` return type.**
In the browser `setInterval` returns `number`; in Node.js it returns
`NodeJS.Timeout`. Because `tsconfig` targets the browser environment this should
always be `number`, but if the TypeScript compiler infers `ReturnType<typeof setInterval>`
BUILDER must type the local variable explicitly as `ReturnType<typeof setInterval>`
and call `clearInterval(timer)` with that typed reference to satisfy strict mode.
