---
name: create-design-lab
description: Make the per-repo lab that the design-loop skill needs - the small build that turns a folder of screen variants into one self-contained HTML page made from this repo's real components, theme and layout, with sign-in and data stood in. Detects the stack (Nuxt, Vite with Vue/React/Svelte, Next.js, others), writes .claude/skills/design-lab/, and proves it on one real screen before handing over. Use for /create-design-lab, when design-loop finds no lab, or when a lab broke after a framework upgrade.
---

# Create a design lab

`design-loop` is the same in every repo. The lab is the part that is not: it knows how this repo
builds a screen. Write it to `.claude/skills/design-lab/`, prove it, and hand it over. The next
agent reads the lab cold, mid-design, so write its SKILL.md for that reader.

Read [the lab contract](../design-loop/references/lab-contract.md) first. The lab exists to meet
it, nothing more.

## 1. Read the repo, not the user

Answer these from the code. Ask the user only what the code cannot tell you.

- **Stack:** the framework and its version, the bundler, the component library, the CSS setup
  (Tailwind entry file and config, CSS modules, CSS-in-JS), icons, fonts.
- **Screens:** where pages and layouts live, and what the app shell around a page is (sidebar,
  header, providers). Variants must sit inside that same shell.
- **What a screen needs to start:** providers and plugins it reads (theme, i18n, router, store,
  query client), auth calls (Clerk, Auth0, NextAuth, Supabase, Firebase), data calls (fetch
  wrappers, API clients, server actions), feature flags, environment config. Note which plugins
  only do analytics, tracking or service workers; the lab leaves those out.
- **Stand-ins that already exist:** Storybook config and decorators, test setup files, mocks,
  fixtures, seed data, demo helpers. Reuse them. A lab that reuses Storybook's mocks keeps
  working when the app changes, because the repo already maintains them.

If the repo does not build, fix that or report it before you write the lab.

## 2. Pick the recipe

Open [references/recipes.md](references/recipes.md) and take the section for the stack. Each
section says whether a real repo proved it. Mark a recipe you had to change, and why, in the
lab's SKILL.md.

## 3. Write the lab

Write into `.claude/skills/design-lab/`:

- `lab.json`, per the contract.
- The build: a config for the repo's own framework or bundler that reads the round folder and
  the output folder from its arguments or environment, finds the variant files, and builds one
  page with one script and one stylesheet.
- The page: renders one variant at a time inside the real app shell and speaks the 3 messages.
- Stand-ins only for what a screen calls and cannot get in a file: sign-in, network data, the
  router's browser history, server-only modules. Alias the real package or module to the
  stand-in at build time (see the recipe); never edit the app's source.
- `.gitignore` for the lab's caches and for the example round's output (`example/.build`,
  `example/round-1.html`, `example/round-1-shots`).
- `example/round-1/`: 3 small variants of one real, data-heavy screen of the app, plus its demo
  data, taken from an existing story or fixture.

Keep the lab out of the repo's lint and type checks if they would scan it (the lint ignore list
is the usual place). Make no other change outside `.claude/skills/design-lab/`.

## 4. Write the lab's SKILL.md

Frontmatter `name: design-lab` and a `description` that names the repo and says it is the lab
for `design-loop`. Then, from what this repo actually does:

- **Variants:** the file type, a minimal variant that renders a real page inside the app shell,
  and the import aliases that work.
- **Demo data:** the file name, what it must set up (stand-in responses, the signed-in user, the
  selected account or location), and which existing stories or fixtures to start from.
- **Stand-ins:** each one, what it replaces, and where it comes from.
- **What the file cannot show:** every gap you found while proving it (a request with no
  stand-in leaves part of the screen empty, icon names built at runtime, links that do not
  navigate, plugins left out).

## 5. Prove it

`<design-loop>` is the design-loop skill's folder, next to this skill's folder.

```bash
node <design-loop>/scripts/round.mjs .claude/skills/design-lab/example/round-1
node <design-loop>/scripts/verify.mjs .claude/skills/design-lab/example/round-1.html
```

It passes when `verify.mjs` prints `problems: 0` with all 3 variants, and the desktop and phone
PNGs match the real screen: the same shell, fonts, icons and colours. Compare against the
screen's Storybook story or a screenshot of the running app when one is available. Fix and
rebuild until both hold. A lab that never passed this is a draft, not a lab.

## 6. Hand over

Tell the user the build time, the file size, what is stood in, and what the file cannot show.
Then run `design-loop` on the screen they want.
