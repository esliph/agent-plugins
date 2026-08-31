#!/usr/bin/env bash
# Ponte host -> container para os hooks de documentação viva.
#
# Falha aberta por contrato (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7): container fora
# do ar, timeout ou erro de execução resultam em saída vazia e exit 0. Um hook
# quebrado não pode travar o trabalho.
#
# O hook lê o `.ownership.yml` do **repositório validado** (/workspace) e executa
# o código do **toolkit** (/opt/living-docs). ADR-0003.

HOOK="${1:-}"
CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"
HOST_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | timeout 5 docker exec -i \
  -e LIVING_DOCS_REPO_ROOT=/workspace \
  -e LIVING_DOCS_HOST_ROOT="$HOST_ROOT" \
  "$CONTAINER" node "/opt/living-docs/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
