# prontend-stack

Skills for frontend work with Claude Code.

## Install

```
/plugin marketplace add Riyenz/prontend-stack
/plugin install prontend-stack@prontend-stack
```

## Skills

**design-loop** designs a screen with you before anyone builds it. It learns who uses the
screen and what it must do, shows 3 UX concepts, writes a design brief for the one you pick,
then shows A/B/C variants and repeats rounds of feedback until you say final.

Every round is one HTML file. It holds the real screen, built from your repo's own components,
theme and layout, with demo data. Buttons, tabs and modals work. A bar on top switches the
round, the variant, the screen of that variant, and between desktop, phone and tablet. You open it with a double-click; no server
runs. Keep that one tab open: it moves to each new round by itself.

```
1 Understand → 2 Requirements → 3 Concepts → you pick
→ 4 Brief → 5 Variants A/B/C → feedback → next round … → you say "final"
→ 6 Final → 7 Handoff
```

**create-design-lab** makes the one part that differs per repo: the lab, a small build that
turns a folder of variants into that HTML file. It reads the repo (framework, app shell,
sign-in, data calls, existing Storybook or test mocks), writes `.claude/skills/design-lab/`,
and proves it on one real screen before it hands over. `design-loop` runs it when a repo has
no lab.

## Stacks

| Stack | Status |
|---|---|
| Nuxt 3 / 4 | Proven on a production app |
| Vite + React | Proven on a test repo |
| Vite + Vue, Svelte, Solid | Recipe, not yet proven |
| Next.js | Recipe, not yet proven |

## Requirements

Node 20 or later, and Playwright with Chromium in the repo for the check step
(`npm i -D playwright && npx playwright install chromium`).

## License

MIT
