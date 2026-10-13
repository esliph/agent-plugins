#!/usr/bin/env bash
# Runs one hook of this plugin on the machine's node.
#
# It fails open: without node, without the dependencies, on a timeout or on
# any error, it prints nothing and exits 0. A hook never blocks work because of
# a defect of its own.

HOOK="${1:-}"

[ -n "$HOOK" ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

# hooks/ and src/ sit side by side in the plugin directory.
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT="$(cat)"

# `timeout` is not on every machine (macOS has none); the hook also ends itself
# after the same five seconds.
if command -v timeout >/dev/null 2>&1; then
  OUTPUT="$(printf '%s' "$INPUT" | timeout 5 node "$PLUGIN_ROOT/src/hooks/main.ts" "$HOOK" 2>/dev/null)"
  STATUS=$?
else
  OUTPUT="$(printf '%s' "$INPUT" | node "$PLUGIN_ROOT/src/hooks/main.ts" "$HOOK" 2>/dev/null)"
  STATUS=$?
fi

[ "$STATUS" -eq 0 ] || exit 0
[ -n "$OUTPUT" ] || exit 0

# Whatever is not one JSON value is dropped: the host would read it as a broken answer.
if printf '%s' "$OUTPUT" | node -e 'JSON.parse(require("node:fs").readFileSync(0, "utf8"))' >/dev/null 2>&1; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
