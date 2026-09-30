---
title: Error catalog
owner: "{{OWNER}}"
trigger: >
  A new error code; a code that changes status; a change in what a code means
  to whoever consumes the public interface.
last-reviewed: {{TODAY}}
---

# Error catalog

A code, once published, never changes meaning: when it goes out of use, it
gets `deprecated` and a replacement. The code is the contract; the displayable
message is not part of it.

| Code | Meaning | When it occurs | Transport | Public | Status |
| --- | --- | --- | --- | --- | --- |
| EXAMPLE-CODE | Replace with the stable meaning, not the displayable message | The observable condition that triggers it | HTTP 400 / exit 2 / event | yes | active |
