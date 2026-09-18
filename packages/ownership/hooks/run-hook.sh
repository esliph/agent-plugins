#!/usr/bin/env bash
# Wrapper dos hooks do núcleo de ownership: executa no node do host.
# Falha aberta por contrato — node ausente, timeout ou erro de execução
# resultam em saída vazia e exit 0.
#
# TOOLKIT_ROOT é a raiz DESTE plugin (um nível acima de hooks/, porque
# hooks/ e src/ moram lado a lado em packages/ownership/). REPO_ROOT é o
# repositório que este plugin julga, vindo de CLAUDE_PROJECT_DIR.

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
