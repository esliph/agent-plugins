---
name: new-plugin
description: >
  Place a plugin in this marketplace and register it: the project layout under
  `plugins/<name>/`, the project's governance files, and every
  repository-wide touchpoint, so the marketplace and owner-coverage checks
  pass. Complements a general plugin-authoring workflow — run it before, to
  open the place where the plugin will be written, or after, to fit an
  authored plugin into this repository. Invoked by the user only.
disable-model-invocation: true
argument-hint: <name> ["<one-line purpose>"]
---

# new-plugin — a plugin's place in this repository

Writing a plugin and making it exist in this marketplace are two different
jobs. The first is the same in any repository: purpose, components, manifest,
validation. The second is only this repository's: a project directory with a
distributed directory inside it, governance files beside it, and a handful of
lines spread across repository-wide files. Each missing line fails a different
check, and the failure names the symptom, not the forgotten step. This skill
does the second job, whole, and proves it with the checks CI runs.

## Boundary

**Territory** — decides where a plugin lives in this repository and what
registers it: the project directory and its distributed directory, the
project's governance files, and one line or entry in every repository-wide
index. Decides that the placement is done only when the repository's own
checks say so.

**Out of bounds**

- Designing and writing the plugin: its purpose, its components, the content
  of its manifest and README, and validating the plugin as a plugin. That is
  the general plugin-authoring workflow; this skill leaves the place ready for
  it, or takes what it produced.
- What the plugin must do — the rule comes before the code, and no rule is
  invented here.
- The plugin's documentation frame: ID families, `docs/` directories, any
  code→doc link other than the one to the CHANGELOG, maturity stage. That is
  the job of whoever sets up living documentation for a project.
- The toolchain of a plugin with code (package manifest, compiler and linter
  configuration, its `Spurfile` and its line in the root one, its CI workflow). The stack is a decision of whoever writes
  the code; this skill lists it as pending.
- Committing, the commit message, the branch and the PR — repository
  convention.
- Accepting or promoting anything — a human act.

**What I do not need to know** — which components the plugin has or will have,
its language or runtime, and how it was authored. None of it changes where the
plugin lives or which lines register it.

**Edge contract** — receives a plugin name, and either nothing under
`plugins/<name>/` yet or a plugin already written there. Delivers the created,
moved and edited paths, the output of the checks, and the list of what was left
out on purpose.

**Hard dependency** — the "Adding a plugin" section of `CONTRIBUTING.md`: it is
the layout and the list of touchpoints. If it is missing or no longer lists
them, stop and say so; do not rebuild the list from memory or from this file.

## Procedure

### 1. Read the list, then the shape

Read the "Adding a plugin" section of `CONTRIBUTING.md` and turn it into a
checklist — the layout of the project, and one item per file or line it names.
That section is the source of truth; if it now lists something this skill does
not mention, the section wins.

Then read one existing plugin end to end as the model of shape: its manifest,
its `README.md`, `CHANGELOG.md` and `.ownership.yml`, and the line each
repository-wide file holds for it. Every value you write that is not the name
or the purpose — owner handle, starting version, marketplace entry fields, the
CHANGELOG header, the include style, the README table columns — is copied from
what is there, not chosen here. If two existing plugins disagree on a value,
say so and ask which one to follow.

### 2. Find out what already exists

Look at `plugins/<name>/` and at the repository-wide files, and decide which
case you are in:

- **Nothing yet.** The name is kebab-case and nothing uses it: no directory,
  no marketplace entry, no `include:` line. You need a one-sentence purpose in
  English — it becomes the manifest and marketplace descriptions and the README
  row. If it is missing, ask; if it came in another language, propose an
  English version and confirm it. Do not invent a purpose.
- **A plugin was already written here.** Take its name and description from
  its manifest instead of asking. Your job is to fit it into the layout and
  register it. Check two things:
  - The manifest is inside the distributed directory the layout names, not at
    the project root. If it is at the root, the plugin was written with a
    generic layout: stop and propose the move, listing each path, and move only
    after the user agrees — it changes what gets installed.
  - Governance files live at the project level, beside the distributed
    directory, not inside it — what is inside ships to whoever installs. A
    README or CHANGELOG found inside the distributed directory is moved up. If
    it is not yet committed, move it and say so; if it is, ask first.
- **Already registered somewhere.** The name appears in some repository-wide
  files and not others — a half-finished earlier attempt. Complete only the
  missing items; do not duplicate a line that is there.
- **The name belongs to another, finished plugin.** Stop, change nothing, and
  ask whether the intent is to extend that plugin or to pick another name.

Ask also whether the plugin ships or will ship code, unless the files already
answer it. It does not change the placement; it decides whether toolchain and
workflow appear in the pending list.

### 3. Write the project

Under `plugins/<name>/`, create what is missing, in the minimum form, and leave
what exists alone:

- the plugin manifest inside the distributed directory, with name, version and
  description — only when no manifest exists. An existing manifest keeps its
  content; the checks will say if its name or version disagree with the
  marketplace entry;
- `README.md` for whoever installs: what the plugin is for and how to install
  it, in running text;
- `CHANGELOG.md` with the same header as its siblings and an `Unreleased`
  entry announcing the plugin in the marketplace;
- `.ownership.yml` declaring an owner for every path the project holds right
  now, relative to the project directory. Documents get the same `living-docs:`
  block their counterparts get in the sibling file; the distributed directory
  gets an owner only. Add one code→doc link: the distributed directory to the
  project's `CHANGELOG.md`, marked visible to whoever consumes, in the shape
  the siblings use. It is what makes every later change to what the plugin
  ships ask for a changelog entry; without it, the first component lands
  unannounced. Nothing else — no ID family, no other link: see Out of bounds.

The README and every changelog entry are read outside this repository: they
cite no artifact ID and no internal path, and explain in running text.

When the plugin does not exist yet, create nothing inside the distributed
directory besides the manifest: no empty component directories. The authoring
workflow fills it.

### 4. Register it

Add one line or entry, in the style of the existing ones, to each
repository-wide file the checklist names — whatever that list says today.
Append after the existing plugins unless the file is visibly sorted.

Edit only the line you add. Reformatting the rest of a shared file turns a
five-line change into a review of the whole file. This includes tables: a new
row goes in without re-padding the other rows, even if a formatter would
realign them. Realigning is a separate change.

### 5. Prove it

Run the checks the marketplace workflow runs for the whole repository — read
them from that workflow rather than from memory: the marketplace manifest
check, and the ownership validation (owner coverage included). If living
documentation validation runs there too, run it.

A failure is information about a touchpoint: fix the touchpoint and run again.
Do not weaken a check, add an `ignore`, or edit anything generated to make it
pass. A disagreement between an existing manifest and the marketplace entry is
fixed in the entry you wrote, not in the manifest. If a check fails for a
reason outside this plugin (it already failed before your change), say so and
leave it.

### 6. Report

- Every path created, moved or edited, one line each.
- The output of each check.
- What was left out on purpose: the documentation frame, and — when the plugin
  ships code — the toolchain, its `Spurfile` and the plugin's own CI workflow, as
  `CONTRIBUTING.md` describes them.
- When the plugin does not exist yet: the distributed directory is where its
  components go, and nothing there is written yet.

## Checklist

- [ ] The layout and touchpoints came from `CONTRIBUTING.md` in this run, not from memory.
- [ ] Owner, version and every format were copied from an existing plugin.
- [ ] Whatever the plugin already had was kept; only what was missing was created.
- [ ] Nothing that ships lives at the project level, and no governance file lives inside the distributed directory.
- [ ] The README and the changelog entries cite no artifact ID and no internal path.
- [ ] The project's `.ownership.yml` covers every file it holds, links the distributed directory to the CHANGELOG as consumer-visible, and declares nothing else.
- [ ] Each shared file gained exactly the plugin's line and nothing else changed.
- [ ] The workflow's repository-wide checks pass, and their output is in the report.
- [ ] The report lists what was left out and why.
