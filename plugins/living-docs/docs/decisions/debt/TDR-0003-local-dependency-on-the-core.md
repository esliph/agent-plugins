---
id: TDR-0003
title: '@esliph/ownership as file:../ownership breaks the remote installation of living-docs'
status: open
owner: '@esliph/engineering'
trigger: >
  When the payment trigger below is met.
last-reviewed: 2026-09-28
relates-to: [ADR-0025, ADR-0029, RNF-0002]
# Single quotes: in YAML, single quotes do not process `\`, and the pattern is a regex.
pay-when:
  pattern: '"@esliph/ownership":\s*"[\^~]?\d'
  paths:
    - plugins/living-docs/plugin/package.json
---

# TDR-0003 — @esliph/ownership as file:../ownership breaks the remote installation of living-docs

## The shortcut

living-docs declares `@esliph/ownership` as `file:../ownership` and resolves it from
the source code, with the `development` condition. In the checkout this works
without `dist/`, and that is what keeps old code from running silently. Outside the
checkout it does not work: in the marketplace cache `../ownership` does not exist,
living-docs' `npm ci` fails and, without `node_modules`, every hook of it fails
open. The default of `--invoke-ownership` (`npx ownership`) does not work outside
this repository either.

## Why it was accepted

The core is not yet published on npm, and publishing it is another delivery, with
its own decision about name, version and channel. Today only the author uses the
plugin, and all consumers are in the checkout. Waiting for publication to adopt the
core would block the removal of the duplicated rules on a step that does not depend
on them.

## Payment trigger

`@esliph/ownership` published on npm. Observable signal: the dependency in
`plugins/living-docs/plugin/package.json` stops being `file:` and becomes a semver range
from the registry. At that moment, the dependency becomes that range, living-docs'
`plugin-cache.test.ts` goes back to requiring that the hook answers from the cache,
and the default of `--invoke-ownership` starts working outside here.

## Cost of continuing to owe

The remote installation of living-docs stays broken, and whoever tries it receives
no hooks, without warning: the hook fails open and goes quiet. While the `todo` of
`plugin-cache.test.ts` is there, no test proves the plugin works installed, only
that it goes quiet when it does not.
