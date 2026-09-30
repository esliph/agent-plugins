#!/usr/bin/env bash
# PostToolUse (Edit|Write): runs Prettier and ESLint --fix on the edited .ts,
# from inside its plugin project, because the scripts there pass
# `--ignore-path ../../.prettierignore` relative to plugins/<name>/.
# What ESLint cannot fix goes back to the model (exit 2); everything else is
# silent and never blocks.

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

# No jq on this machine: node reads the payload and resolves the path relative
# to the repository, with forward slashes.
REL="$(REPO_ROOT="$REPO_ROOT" node -e '
  const path = require("path");
  let s = "";
  process.stdin.on("data", (c) => (s += c)).on("end", () => {
    try {
      const i = JSON.parse(s);
      const f = (i.tool_response && i.tool_response.filePath) || (i.tool_input && i.tool_input.file_path) || "";
      if (!f) return;
      const rel = path.relative(path.resolve(process.env.REPO_ROOT), path.resolve(f));
      process.stdout.write(rel.split(path.sep).join("/"));
    } catch {}
  });
' 2>/dev/null)"

case "$REL" in
  plugins/*/*.ts) ;;
  *) exit 0 ;;
esac
case "$REL" in
  */node_modules/*) exit 0 ;;
esac

PLUGIN="$(printf '%s' "$REL" | cut -d/ -f2)"
PROJECT="$REPO_ROOT/plugins/$PLUGIN"
FILE="${REL#plugins/$PLUGIN/}"

[ -f "$PROJECT/package.json" ] || exit 0
cd "$PROJECT" || exit 0

npx --no-install prettier --ignore-path ../../.prettierignore --write "$FILE" >/dev/null 2>&1

LINT="$(npx --no-install eslint --fix "$FILE" 2>&1)"
if [ $? -ne 0 ] && [ -n "$LINT" ]; then
  printf 'ESLint left problems in %s that --fix could not resolve:\n%s\n' "$REL" "$LINT" >&2
  exit 2
fi

exit 0
