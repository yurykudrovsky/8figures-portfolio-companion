# Task 012 — Bloomberg Dark UI Transformation
## Source: challenge.pdf — "User Experience & Design 20%"
## Agent: ARCHITECT → BUILDER → REVIEWER → QA
## Priority: HIGH — assessment scoring criterion

## Objective
Transform the current basic Ionic UI into a premium dark financial
theme that reads like a professional trading terminal. Evaluators
score UX/Design at 20% — this is a direct scoring lever.

## Design Tokens
- Background: #0a0a0f
- Card surface: #0d1117
- Card border: #1a2332
- Accent / gain: #00d4aa (teal-green)
- Loss: #ff4757 (red)
- Text primary: #e8eaf0
- Text secondary: #8892a4
- Font: system-ui stack, numbers in tabular-nums

## Deliverables — Portfolio Dashboard

### Total Value Header
- Large hero number: portfolio total value (32px+, bold)
- Daily change line below: +$X,XXX.XX (+X.XX%) in accent color
- Subtle animated count-up on load (CSS counter animation or
  Angular signal + interval for 600ms on component init)

### Holdings Cards
- Dark card #0d1117 with #1a2332 border
- Left: ticker (bold, large) + asset name (secondary color)
- Right: current value (primary) + gain/loss % (color-coded)
- Gain/loss pill badge: rounded, colored background at 10% opacity
- Thin left border accent bar: green for gain, red for loss
- Remove ion-card default white background completely

### Global Dark Theme
- ion-content --background: #0a0a0f
- ion-header toolbar: #0d1117, no box-shadow
- ion-item background: transparent
- Remove all default Ionic light/white surfaces

### Pull-to-refresh
- Custom dark spinner color (#00d4aa)

## Deliverables — Chat Screen
- Match dark background — same #0a0a0f / #0d1117 palette
- User message bubbles: #1a2332 with #00d4aa left border
- Assistant message bubbles: #0d1117
- Input bar: #0d1117 background, #00d4aa focus ring
- Send button: #00d4aa background

## Deliverables — Animations
- Holdings cards: staggered fade-in on load (50ms delay per card)
- Value counter: count-up animation on portfolio load
- Chat messages: slide-in from bottom (150ms ease-out)

## Definition of Done
1. npm run build exits 0 — zero TypeScript errors
2. No Ionic default white/light surfaces visible
3. All financial numbers remain correctly formatted
4. All 41 existing tests still pass
5. iOS Simulator shows premium dark UI
