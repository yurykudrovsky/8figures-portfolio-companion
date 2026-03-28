# Task 014 — Portfolio Performance Chart
## Agent: ARCHITECT → BUILDER → REVIEWER → QA-VERIFY
## Source: challenge.pdf — "User Experience & Design 20%", "Real Implementation"
## Branch: pipeline/005-portfolio-chart
## Integration Boundary: Frontend only

## Objective
Add a portfolio performance chart to the dashboard showing
historical performance or allocation breakdown. Evaluators
score UX/Design at 20% — a chart is a direct visual differentiator.

## Acceptance Criteria

### Frontend (AC-F series)
- AC-F1: Chart renders on portfolio dashboard below the hero value section
- AC-F2: Chart shows portfolio allocation by asset type (stock/ETF/crypto)
  as a visual breakdown (donut/pie or bar)
- AC-F3: Chart uses Bloomberg design tokens (--app-accent, --app-loss, --app-card)
- AC-F4: Chart animates in on load (consistent with card stagger)
- AC-F5: Chart is responsive — fits all iPhone screen widths
- AC-F6: No external charting library — use SVG or Canvas directly to keep
  bundle size minimal

## Technical Approach
- Pure SVG donut chart rendered in the component template
- Data: aggregate holdings by assetType, calculate % of totalValue
- Segments: stocks (--app-accent teal), crypto (#f59e0b amber), ETFs (#6366f1 indigo)
- Centre label: total portfolio value
- Legend below: each segment label + percentage

## Deliverables
- MODIFY: frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.html
- MODIFY: frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.ts
- MODIFY: frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.scss

## Definition of Done
- [ ] TypeScript compiles zero errors
- [ ] All existing tests pass (27 frontend)
- [ ] Chart visible on iOS Simulator
- [ ] Chart uses design tokens — no hardcoded colors
- [ ] Committed with conventional commit message
