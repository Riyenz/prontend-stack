# Lab contract

A repo's lab is the only code that knows the repo's framework. `design-loop` calls it through
`.claude/skills/design-lab/lab.json` and talks to its page through `postMessage`. Everything
else (inlining, the viewer, the check) is shared.

## lab.json

```json
{
  "build": "node .claude/skills/design-lab/build.mjs {round} {dist}",
  "public": "public"
}
```

- `build` runs from the repo root. `round.mjs` replaces `{round}` with the round folder,
  `{dist}` with an empty output folder and `{build}` with a scratch folder for caches. All three
  are absolute and quoted.
- The command must write `{dist}/index.html` that loads exactly one script and one stylesheet
  (plus inline tags). Turn off code splitting and lazy chunks; `round.mjs` warns about any `.js`
  or `.css` file it did not inline. Fonts and images can stay as files; `round.mjs` inlines
  every literal path it finds in `{dist}`, and in `public` when the path starts with `/`.
- `public` (optional) is the repo's static folder, relative to the repo root.
- Keep build caches out of git: in `{build}` or in a folder the lab's `.gitignore` names.

## The page

The viewer puts the built page in an `<iframe srcdoc>` inside a `file://` document. So:

- No server, no network. Every request the screen makes needs a stand-in. `verify.mjs` fails on
  any request that is not `data:`, `blob:` or `about:`.
- No browser history. `history.pushState` and `replaceState` throw inside `srcdoc`. Use the
  router's memory mode (`createMemoryHistory`, `createMemoryRouter`, `MemoryRouter`), or no
  router.
- `localStorage` works. Cookies and service workers do not.

The page must speak 3 messages:

| Direction | Message | When |
|---|---|---|
| page → viewer | `{ type: 'design-lab:ready', variants: ['A', 'B', 'C'] }` | once, after the first render |
| viewer → page | `{ type: 'design-lab:show', variant: 'B' }` | on a tab click; render that variant |
| page → viewer | `{ type: 'design-lab:key', key }` | on keydown outside a text field, so the viewer's keys (1 to 9, `q w e`, `a s d f` …, arrows) still work |

Send to `window.parent` with target `'*'`. Each variant is one file in the round folder; its
label is the file name without the extension, in name order. Pass labels through unchanged: the
viewer groups `A-card--empty` under variant `A-card` as its `empty` screen. A non-component file in the round
(demo data) is the lab's choice; name it in the lab's SKILL.md.

## Proof

`<design-loop>` is the design-loop skill's folder.

```bash
node <design-loop>/scripts/round.mjs <round folder>
node <design-loop>/scripts/verify.mjs <round folder>.html
```

The lab works when `verify.mjs` prints `problems: 0` with every screen, and its PNGs look like
the real app at both sizes.
