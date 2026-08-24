#!/usr/bin/env bash
# Ponte host → container para os hooks de documentação viva.
#
# Falha aberta por contrato (LIVING-DOCUMENTATION-TOOLKIT.md §7): container fora
# do ar, timeout ou erro de execução resultam em saída vazia e exit 0. Um hook
# quebrado não pode travar o trabalho.

HOOK="${1:-}"
CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"
HOST_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | timeout 5 docker exec -i \
  -e LIVING_DOCS_ROOT=/app \
  -e LIVING_DOCS_HOST_ROOT="$HOST_ROOT" \
  "$CONTAINER" node "/app/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
