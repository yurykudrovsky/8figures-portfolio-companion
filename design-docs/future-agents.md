# Future Agent Architecture

## Current State
5 agents: scout, architect, builder, reviewer, qa
Human acts as orchestrator between all handoffs.

## Planned: ORCHESTRATOR Agent
### Purpose
Meta-agent that runs the full pipeline autonomously.
Reads task file → decides agent sequence → passes artifacts →
escalates to human only when blocked.

### Why Not Implemented Now
- Claude Code native Plan Mode already provides orchestration
- Adding orchestrator layer risks agent confusion and loops
- Debugging multi-agent failures is complex
- Human-in-the-loop at every gate is deliberate Level 5 practice

### Implementation Path
- Define orchestrator.md with pipeline state machine
- Use TaskCreate/TaskGet/TaskUpdate tools for state tracking
- Orchestrator reads pipeline-log.md as memory between steps
- Estimated: 1 sprint

## Planned: SCOUT-UX Agent
### Purpose
Specialized auditor for mobile UX, visual hierarchy,
Ionic component usage, animation quality, accessibility.
Current SCOUT only audits code quality, not UX quality.

### Why Not Implemented Now
- Current tasks are code quality focused
- UX audit requires visual inspection beyond file reading
- Risk of conflicting findings with code SCOUT

### Implementation Path
- Create .claude/agents/scout-ux.md
- Extend reviewer.md with UX checklist
- Run scout + scout-ux in parallel for UI tasks
- Estimated: 2 days

## Planned: ORCHESTRATOR + PM Integration
### Full Vision
See tasks/README.md "Future Integration Roadmap" and
ARCHITECTURE.md "Pipeline Evolution" for complete roadmap
of Jira/GitHub/Monday integration.
