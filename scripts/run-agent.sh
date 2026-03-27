#!/usr/bin/env bash
# scripts/run-agent.sh — Launch a named agent with its context file
#
# Usage:
#   ./scripts/run-agent.sh <agent> "<task description>"
#
# Examples:
#   ./scripts/run-agent.sh scout "audit API routes for type safety"
#   ./scripts/run-agent.sh architect "design new allocation chart feature"
#   ./scripts/run-agent.sh builder "implement allocation chart per design-docs/2026-03-27-allocation-chart.md"
#   ./scripts/run-agent.sh reviewer "review allocation chart implementation"
#   ./scripts/run-agent.sh qa "test allocation chart service"

set -euo pipefail

AGENT="${1:-}"
TASK="${2:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTEXT_DIR="${REPO_ROOT}/.claude/agents"
LOG_DIR="${REPO_ROOT}/logs/agent-sessions"

# ── Validate inputs ────────────────────────────────────────────────────────────

if [[ -z "$AGENT" ]]; then
  echo "ERROR: Agent name required." >&2
  echo "Usage: $0 <agent> \"<task description>\"" >&2
  echo "Agents: scout | architect | builder | reviewer | qa" >&2
  exit 1
fi

if [[ -z "$TASK" ]]; then
  echo "ERROR: Task description required." >&2
  echo "Usage: $0 <agent> \"<task description>\"" >&2
  exit 1
fi

CONTEXT_FILE="${CONTEXT_DIR}/${AGENT}.md"

if [[ ! -f "$CONTEXT_FILE" ]]; then
  echo "ERROR: No context file found for agent '${AGENT}'." >&2
  echo "Expected: ${CONTEXT_FILE}" >&2
  echo "Available agents:" >&2
  ls "${CONTEXT_DIR}"/*.md 2>/dev/null | xargs -I{} basename {} .md >&2 || true
  exit 1
fi

# ── Prepare session log ────────────────────────────────────────────────────────

mkdir -p "${LOG_DIR}"
TIMESTAMP="$(date +%Y-%m-%dT%H-%M-%S)"
SESSION_ID="${TIMESTAMP}-${AGENT}"
LOG_FILE="${LOG_DIR}/${SESSION_ID}.md"

cat > "${LOG_FILE}" <<EOF
# Agent Session — ${AGENT^^} — ${TIMESTAMP}

## Agent
${AGENT}

## Task
${TASK}

## Context file
${CONTEXT_FILE}

## Started
$(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Status
running

---

EOF

echo "──────────────────────────────────────────────────"
echo " 8FIGURES Agent Pipeline"
echo "──────────────────────────────────────────────────"
echo " Agent   : ${AGENT^^}"
echo " Task    : ${TASK}"
echo " Context : ${CONTEXT_FILE}"
echo " Log     : ${LOG_FILE}"
echo "──────────────────────────────────────────────────"
echo ""
echo "Starting agent session…"
echo ""

# ── Launch Claude Code with agent context ─────────────────────────────────────
# The --system-prompt flag prepends the agent context file contents.
# The task description is passed as the initial user message.
# Output is tee'd to the session log.

CONTEXT_CONTENT="$(cat "${CONTEXT_FILE}")"

claude \
  --system-prompt "${CONTEXT_CONTENT}" \
  --print \
  "${TASK}" \
  | tee -a "${LOG_FILE}"

# ── Mark session complete ──────────────────────────────────────────────────────

cat >> "${LOG_FILE}" <<EOF

---

## Completed
$(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Status
complete
EOF

echo ""
echo "──────────────────────────────────────────────────"
echo " Session complete. Log: ${LOG_FILE}"
echo "──────────────────────────────────────────────────"
