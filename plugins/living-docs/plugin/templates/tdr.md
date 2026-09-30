---
id: {{ID}}
title: {{TITLE}}
status: open
owner: "{{OWNER}}"
trigger: >
  When the payment trigger below is met.
last-reviewed: {{TODAY}}
relates-to: []
# The payment trigger in machine form. Uncomment and fill in: `pattern` is a
# regex (single quotes, so the `\` is not a YAML escape) and `paths` says where
# to look for it. living-docs/staleness fails while it does not exist, and it is
# that failure that forces the conversation about what the real trigger is.
#
# pay-when:
#   pattern: '^- \*\*status:\*\* revoked'
#   paths: ["docs/requirements/**"]
---

# {{ID}} — {{TITLE}}

## The shortcut

<!-- What was done, deliberately, below the standard. -->

## Why it was accepted

## Payment trigger

<!-- It must be observable: "when volume passes X", "on the first PR that
     touches this module". "When there is time" is not a trigger. -->

## Cost of continuing to owe
