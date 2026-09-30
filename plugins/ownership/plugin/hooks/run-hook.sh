#!/usr/bin/env bash
# Wrapper for the ownership core hooks: runs on the host node.
# Fails open by contract — a missing node, a timeout or an execution error
# all result in empty output and exit 0.
#
# TOOLKIT_ROOT is the root of THIS plugin (one level above hooks/, because
# hooks/ and src/ live side by side in the plugin directory). REPO_ROOT is the
# repository this plugin judges, taken from CLAUDE_PROJECT_DIR.

HOOK="${1:-}"
TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | OWNERSHIP_REPO_ROOT="$REPO_ROOT" \
  timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
