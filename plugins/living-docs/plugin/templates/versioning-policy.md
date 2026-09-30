---
title: Versioning policy
owner: "{{OWNER}}"
trigger: >
  A public interface change; a decision to deprecate something published; a
  change to the policy itself.
last-reviewed: {{TODAY}}
---

# Versioning policy

This is the policy **around** the public contract, not the contract: what is
generated lives in the generated artifact.

## What is public

List here, explicitly, what consumers can depend on: paths, error codes,
formats, stable IDs. What is not on this list can change without notice — and
that is what prevents the silent widening of the contract.

## What never changes meaning

A published identifier (error code, rule ID, field name) is neither reused nor
redefined. Correcting the meaning of a published code silently breaks whoever
was already handling it.

## How to deprecate

A deprecation requires four things: the announcement date, the removal version
or date, a replacement, and the migration guide. If any is missing, it is not a
deprecation.

## Who decides

A compatibility-breaking change goes through an ADR — the decision and what we
accept to lose are recorded, not left in the head of whoever was in the room.
