#!/bin/bash
# PreToolUse/Bash: caps output from known-noisy commands (test/build/lint/
# install runners) so a verbose run doesn't land in context verbatim and get
# re-sent on every subsequent turn for the rest of the session.
set -euo pipefail

input="$(cat)"
command="$(echo "$input" | jq -r '.tool_input.command // empty')"

if [ -z "$command" ]; then
  exit 0
fi

# Already piped through a truncator — leave it alone.
if echo "$command" | grep -qE '\|[[:space:]]*(tail|head)\b'; then
  exit 0
fi

if echo "$command" | grep -qEi '\b(npm|yarn|pnpm)[[:space:]]+(install|ci|run[[:space:]]+(test|build|lint)|test|build|lint)\b|\b(jest|vitest|mocha|pytest|go[[:space:]]+test|cargo[[:space:]]+test|eslint|tsc|webpack|vite[[:space:]]+build|make)\b|\bapt-get[[:space:]]+install\b'; then
  wrapped="{ ${command}; } 2>&1 | tail -n 300; exit \"\${PIPESTATUS[0]}\""
  jq -n --arg cmd "$wrapped" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: { command: $cmd }
    }
  }'
fi

exit 0
