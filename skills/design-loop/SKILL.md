---
name: design-loop
description: Design a screen with the user before anyone builds it - learn who uses it and what it must do, show 3 different UX concepts, write a design brief for the chosen one, then show A/B/C variants and repeat rounds of feedback until the user says final. Every round is one self-contained, interactive HTML file built from the repo's real components, theme and layout, with a Desktop/Tablet/Phone switch, opened with a double-click, no server running. Works in any repo through a per-repo lab made by /create-design-lab. Use when asked to design, redesign or explore a screen, "show me options", "A/B/C variants", "mock up", "UX discovery", or a design brief.
---

# Design loop

The user reviews designs as files, never as a running app. Each round is one HTML file. A top
bar holds the rounds on the left and Desktop/Tablet/Phone on the right; a left panel holds the
variants and, when a variant has several screens, its screens. The real screen, built from the
repo's own components with demo data, fills the rest at its true size, shrunk to fit: desktop
is a 1440 x 900 laptop. Buttons, tabs and modals work. Keys: ← → round, 1 to 9 variant, ↑ ↓
screen, `d t p` device, `?` all keys. Each control shows its key. The user keeps one tab open for
the whole loop: it moves to each new round by itself.

```
1 Understand → 2 Requirements → 3 Concepts (HTML) → user picks
→ 4 Brief → 5 Variants A/B/C (HTML) → feedback → next round … → user says "final"
→ 6 Final → 7 Handoff
```

The user decides at 3 points: the concept, the feedback on each round, and "final". Do not start
the next stage before that decision.

## Before the first round

The repo needs a lab: `.claude/skills/design-lab/` with a `lab.json`. If it is missing, run the
`create-design-lab` skill first. Read the lab's SKILL.md before you write a variant; it names the
variant file type, the demo-data file and what the lab cannot show.

## Files

One folder per screen under `.design-lab/` at the repo root (`round.mjs` writes a `.gitignore`
there that ignores it all):

```
.design-lab/<screen>/
  brief.md            stages 1, 2, 4, plus one line per round
  concepts/           one file per concept, plus demo data  → concepts.html
  round-1/            one file per variant, plus demo data  → round-1.html
  round-2/            copy of the round it builds on, then edited → round-2.html
  round-2-shots/      PNGs from verify.mjs
  rounds.js           list of built rounds; open tabs read it to follow new builds
```

Each variant is one file, labelled with its file name, in name order. A variant with several
screens or states has one file per screen, named `<variant>--<screen>`: `A-card--1-contract`,
`A-card--2-photos`, `A-card--empty`. The viewer shows `A-card` once in the variant row and its
screens in the row below, so 3 concepts of 4 screens are 3 tabs, not 12. A file with no `--`
is the variant's only screen. Use the same screen names in every variant, so the user can keep
a screen and switch variants to compare it. Never edit an old round; copy it forward so the user can
go back.

## 1. Understand

Find the repo's own description of its users (a users or personas doc, the README, the
project's CLAUDE.md or AGENTS.md) and name the screen's user. Read the current screen and its
components, its stories or tests with demo data, and the repo's UI rules. If the screen exists,
start `brief.md` with what is wrong with it today, from code or from what the user points at.

## 2. Requirements

Write in `brief.md`: the user, the one job of the screen, what must be on it, what is out of
scope, and the states that matter (empty, full, error, phone). Keep it short; the user reads it.

## 3. Concepts

Build 3 concepts in `concepts/` that differ in structure or flow, not in colour or spacing: a
table against cards against a step-by-step, one page against a modal. When a concept is a flow,
show its key screens as `<concept>--<screen>` files. Build, check and open them (see below). In the reply, give each concept one line on what it optimises for, and
recommend one. Wait for the pick; the user may mix two.

## 4. Brief

Add to `brief.md`: the chosen concept, the reason, and every rule the user gave. Check each later
round against the brief.

## 5. Variants and rounds

`round-1/` holds 3 variants of the chosen concept that differ in hierarchy, density or emphasis.
Build, check, open. After each round, write one line in `brief.md`: the round, what the user
said, what changed. Copy the chosen round to the next folder, apply the feedback, and repeat
until the user says final. When the user picks one variant, the next round can hold just that
variant and its states.

## 6. Final

The final round holds one variant and its states. Run `verify.mjs` on it for desktop and phone
PNGs.

## 7. Handoff

Write the brief, the final PNGs and the path of the final HTML into the repo's tracker (a GitHub
issue with `gh issue create` when the repo uses GitHub). Images uploaded to a public host need
the user's yes first. The real build then follows the repo's normal flow. The variant code is a
starting point, not shippable code.

## Writing a variant

Use only what the repo has: its component library, its own components, its layout, its theme,
and its UI rules. A variant that needs a new component builds it inside the round folder. Demo
data looks like a real customer of this product, never lorem ipsum. Start from the repo's
stories, fixtures or seed data.

Avoid the patterns in [references/ui-slop.md](references/ui-slop.md): side stripes on boxes,
cards inside cards, chip soup, emoji icons, gradients, tracked uppercase labels and the rest.
Read it before the first variant of a loop, and check every screen against it before the user
sees a round.

## Build, check, open

`<skill>` is this skill's folder, the base directory shown when the skill loads.

```bash
node <skill>/scripts/round.mjs .design-lab/<screen>/round-1
node <skill>/scripts/verify.mjs .design-lab/<screen>/round-1.html
open .design-lab/<screen>/concepts.html     # first build of the screen only
```

`round.mjs` runs the lab's build, packs fonts, images, scripts and styles into one file, wraps
it in the viewer, prints one line and exits. `verify.mjs` opens the file with no server, clicks
every screen of every variant at desktop (1440 px) and phone (390 px), saves PNGs, and exits 1 on any console
error, any network request, or a screen that never loads. Fix every problem it prints before
the user sees the file. It also prints a `slop:` line for each side stripe, gradient text,
frosted panel or emoji icon it finds. Fix each one that comes from the variant's code; one in
the repo's own shell stays. It uses the repo's Playwright, or installs one once into
`~/.cache/design-loop/playwright`. Look at a PNG only to judge a layout problem; the user looks
at the HTML.

Run `open` only for the first build of a screen. After that the open tab checks `rounds.js`
every 1.5 s and moves to the new round within 2 seconds, so never open the file again: a second
`open` gives the user a second tab. In the reply, say the round is in their open tab and give the
path in case they closed it. On macOS `open` shows the file; elsewhere give the path.

How the lab and the viewer talk: [references/lab-contract.md](references/lab-contract.md).
