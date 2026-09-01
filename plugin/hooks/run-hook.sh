#!/usr/bin/env bash
# Wrapper dos hooks de documentação viva: executa o toolkit no node do host.
#
# Falha aberta por contrato (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7):
# node ausente, dependência faltando, timeout ou erro de execução resultam em
# saída vazia e exit 0. Um hook quebrado não pode travar o trabalho.
#
# Duas raízes, e elas não se confundem (ADR-0003): o código do **toolkit** sai
# do caminho deste script, dois níveis acima dele; o `.ownership.yml` lido é o do
# **repositório validado**, que vem de CLAUDE_PROJECT_DIR.

HOOK="${1:-}"
TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | LIVING_DOCS_REPO_ROOT="$REPO_ROOT" \
  timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
