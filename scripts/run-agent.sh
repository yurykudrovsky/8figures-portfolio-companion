#!/usr/bin/env bash
set -euo pipefail

AGENT="${1:-}"
TASK="${2:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTEXT_DIR="${REPO_ROOT}/.claude/agents"
LOG_DIR="${REPO_ROOT}/logs/agent-sessions"

# Branch safety check
# NOTE: Temporary manual enforcement. Future evolution:
# orchestrator creates branches automatically per
# tasks/README.md "Future Integration Roadmap"
CURRENT_BRANCH=$(git -C "${REPO_ROOT}" branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "ERROR: Cannot run pipeline on main branch"
  echo "Create pipeline branch: git checkout -b pipeline/NNN-description"
  echo "See ARCHITECTURE.md Pipeline Evolution for future automation"
  exit 1
fi

if [[ -z "$AGENT" ]]; then
  echo "ERROR: Agent name required."
  echo "Agents: scout | architect | builder | reviewer | qa"
  exit 1
fi

if [[ -z "$TASK" ]]; then
  echo "ERROR: Task description required."
  exit 1
fi

CONTEXT_FILE="${CONTEXT_DIR}/${AGENT}.md"

if [[ ! -f "$CONTEXT_FILE" ]]; then
  echo "ERROR: No context file for agent '${AGENT}'"
  exit 1
fi

mkdir -p "${LOG_DIR}"
TIMESTAMP="$(date +%Y-%m-%dT%H-%M-%S)"
AGENT_UPPER="$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')"
LOG_FILE="${LOG_DIR}/${TIMESTAMP}-${AGENT}.md"

cat > "${LOG_FILE}" << EOF
# Agent Session — ${AGENT_UPPER} — ${TIMESTAMP}

## Agent
${AGENT}

## Task
${TASK}

## Started
$(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Status
running

---

EOF

echo "──────────────────────────────────────────────"
echo " 8FIGURES Agent Pipeline"
echo "──────────────────────────────────────────────"
echo " Agent : ${AGENT_UPPER}"
echo " Task  : ${TASK}"
echo " Log   : ${LOG_FILE}"
echo "──────────────────────────────────────────────"
echo ""

CONTEXT_CONTENT="$(cat "${CONTEXT_FILE}")"

claude \
  --system-prompt "${CONTEXT_CONTENT}" \
  --print \
  "${TASK}" \
  | tee -a "${LOG_FILE}"

cat >> "${LOG_FILE}" << EOF

---

## Completed
$(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Status
complete
EOF

echo ""
echo "──────────────────────────────────────────────"
echo " Session complete. Log: ${LOG_FILE}"
echo "──────────────────────────────────────────────"
