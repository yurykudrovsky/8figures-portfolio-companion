# Git Workflow Skill

Apply these conventions for all commits and branches in this repository. These rules exist so that the evaluators (who review git history as part of scoring) can reconstruct exactly what was built, when, and why.

## Commit Message Format

```
<type>(<optional scope>): <imperative description>

[optional body — what and why, not how]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New user-visible feature or capability |
| `fix` | Bug fix or broken behavior corrected |
| `chore` | Scaffolding, dependency installs, config, build setup |
| `refactor` | Code restructured without behavior change |
| `docs` | README, ARCHITECTURE, comments only |
| `style` | SCSS / CSS changes with no logic impact |
| `test` | Adding or updating tests |

### Rules
- Use **imperative mood**: "add chat route" not "added chat route" or "adds chat route"
- Keep the subject line under 72 characters
- Do not end the subject line with a period
- One logical change per commit — if you need "and" in the subject, split it
- Commit after each working feature, not at the end of a session
- Never commit broken code — `npm run build` must pass before every commit

### Good examples
```
feat: portfolio dashboard — holdings list, P&L display, loading/error states
fix: connect frontend to backend — Android 10.0.2.2 routing, HTTP cleartext
chore: initial project scaffold — Angular 21 + Ionic 8 + Capacitor 6
docs: ARCHITECTURE.md decision record + README.md developer guide
```

### Bad examples
```
updates                          # no type, no description
feat: lots of changes            # not specific
fix: fixed the thing             # meaningless
WIP                              # never commit WIP to main
```

## Branch Strategy

This project uses **pipeline branches** for all feature work:

```
pipeline/NNN-description  — one branch per pipeline run
main                      — always deployable, merged via PR only
```

Branch naming must match task file number:
- `tasks/012-bloomberg-ui.md` → `pipeline/012-bloomberg-ui`
- `tasks/013-claude-api.md` → `pipeline/013-claude-api`

Never commit pipeline work directly to main.
Every pipeline branch must be merged via PR after QA-VERIFY passes.

In future: ORCHESTRATOR agent creates branches automatically.
See `design-docs/future-agents.md` — Planned: ORCHESTRATOR Agent.

## Pre-Commit Gate

Before every `git commit`, verify:

```bash
# Frontend
cd frontend && npm run build
# Must exit 0 with zero errors and zero warnings

# Backend
cd backend && npm run build
# Must exit 0 with zero TypeScript errors

# Quick any/console checks
grep -r ": any" frontend/src/ --include="*.ts" | grep -v ".spec."
grep -r "console.log" frontend/src/ --include="*.ts"
grep -r "console.log" backend/src/ --include="*.ts"
```

If any check fails, fix it before committing. Never use `--no-verify`.

## Tagging Releases

After each phase is complete and committed:

```bash
git tag -a phase-<N> -m "Phase <N> complete: <one-line description>"
# Example:
git tag -a phase-3 -m "Phase 3 complete: AI chat with streaming responses"
```

## What Never Goes in Git

- `node_modules/` — covered by `.gitignore`
- `dist/` — build output, regenerated on demand
- `.env` files — secrets never committed
- `ios/App/Pods/` — CocoaPods dependencies, installed locally
- `android/app/build/` — Gradle build output
