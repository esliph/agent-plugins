#!/usr/bin/env bash
# Wrapper for the living-documentation hooks: runs the toolkit on the host's node.
#
# Fails open by contract:
# a missing node, a missing dependency, a timeout or an execution error all
# result in empty output and exit 0. A broken hook must not block the work.
#
# Two roots, and they are not mixed up: the **toolkit** code comes
# from this script's path, one level above it — hooks/ and src/ live side by
# side at the plugin root, which is the directory the marketplace cache copies
# whole. The `.ownership.yml` that is read belongs to the **validated repository**, which comes from
# CLAUDE_PROJECT_DIR.

HOOK="${1:-}"
TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

# The `development` condition resolves @esliph/ownership through the sibling package's src/:
# a checkout has no dist/, and that is what keeps stale code from running
# silently. Outside the checkout (marketplace cache) ../ownership does not exist,
# and the hook fails open until the core is published on npm.
OUTPUT="$(printf '%s' "$INPUT" | LIVING_DOCS_REPO_ROOT="$REPO_ROOT" \
  NODE_OPTIONS="--conditions=development" \
  timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
