#!/usr/bin/env bash
# PreToolUse (Edit|Write): denies hand edits to package-lock.json and to
# anything under node_modules/. The whole flow depends on `npm ci`, and a lock
# edited by hand breaks it without warning.

node -e '
  let s = "";
  process.stdin.on("data", (c) => (s += c)).on("end", () => {
    let f = "";
    try {
      const i = JSON.parse(s);
      f = String((i.tool_input && (i.tool_input.file_path || i.tool_input.notebook_path)) || "").replace(/\\/g, "/");
    } catch {
      return;
    }
    const lock = /(^|\/)package-lock\.json$/.test(f);
    const modules = /(^|\/)node_modules(\/|$)/.test(f);
    if (!lock && !modules) return;
    const reason = lock
      ? "package-lock.json is not edited by hand: change package.json and run `npm install` in the plugin project, so `npm ci` keeps working."
      : "node_modules/ is not edited by hand: it is what `npm ci` installs. Change the dependency and reinstall.";
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
    }));
  });
'
exit 0
