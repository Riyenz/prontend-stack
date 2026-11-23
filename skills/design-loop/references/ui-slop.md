# UI slop to avoid

Patterns that make a screen look machine-made. Collected in November 2026 from Impeccable's
detector rules, Paralect's 21 signs and the avoid-ai-design catalog (sources at the end), cut to
what matters on product screens: forms, tables, settings, dashboards, flows.

The repo's theme decides fonts, colours and radius. These rules cover what a variant adds on
top. A rule holds even when a repo component offers the pattern as an option: pick the
component's plain variant. A pattern is fine only when it carries information the screen needs:
a badge for a real status, a number for a real sequence. Test: does the screen lose information
without it?

`verify.mjs` prints a `slop:` line for the 4 marked (auto). Check the rest by eye before the
user sees a round.

## Boxes and layout

- **Side stripe** (auto): a thick coloured line down one edge of a box, alert or card. Use the
  plain tinted alert with an icon and a clear title, or put the message next to what it is
  about.
- **Cards inside cards**: boxes nested 2 or 3 deep. Keep one level of box; group with space and
  headings.
- **A border around every block**: when everything has an outline, nothing stands apart. Border
  only what must.
- **Ghost card**: a hairline border plus a wide soft shadow. Pick one: flat, bordered or raised,
  by the element's role.
- **Frosted glass** (auto): translucent blurred panels. Use solid surfaces; blur only behind a
  modal.
- **Same gap everywhere**: no rhythm. Use the spacing scale, with more space between groups than
  inside them.
- **Overstuffed screen**: a card per metric, an "AI insight" banner, a tip, a checklist, quick
  actions, a "What's new" box. Remove anything the user does nothing with; answer the screen's 1
  or 2 questions.
- **Chip soup**: count or status pills on every heading and row, including "0 received, 0 this
  week". Show a chip only for a real state that changes; show zeros in the empty state, not as
  pills.
- **Decorative stat strip**: big round numbers in a row of tiles. Put a number where the user
  acts on it.

## Colour

- **Purple-to-blue gradient**, on surfaces, buttons or backgrounds. Use the theme's solid colours.
- **Gradient text** (auto): a background-clipped gradient on a heading or number. Use solid text;
  emphasise with size and weight.
- **Colour with no meaning**: a blue card here, a green badge there. Colour marks state and the
  primary action only.
- **Glows and coloured shadows**, orbs, blurred blobs. Shadow shows elevation, nothing else.
- **Low-contrast grey text**: body text below 4.5:1. Keep it at 4.5:1 or more.
- **Every button primary**: one primary action per area; the rest secondary or text buttons.

## Type

- **Tracked uppercase labels** added above headings or as section chrome ("PAID THIS MONTH"). Use
  sentence case, or drop a label that repeats the heading.
- **Flat type scale**: heading sizes barely differ from body. Use the repo's real heading sizes
  and weights.
- **Tiny functional text**: labels, hints or buttons under 11 px.
- **Monospace for labels, inputs or buttons**. Mono is for code, IDs to copy and numbers in
  tables.
- **Title Case Everywhere**. Interface text is sentence case.
- **One accented word** in a heading: coloured, italic or highlighted. Let the whole heading carry
  it.

## Icons and decoration

- **Emoji as icons** (auto). Use the repo's icon set, or no icon.
- **Icon in a tinted rounded square** above every heading, or a check mark in a tinted circle on
  every list item. Use the plain icon, or none.
- **Stock AI glyphs**: sparkles for AI, rocket, zap, shield. Pick icons for meaning.
- **Meaningless badges and dots**: NEW, BETA, AI, a green "LIVE" dot or a pulsing dot where
  nothing is live.
- **Decorative 01 / 02 / 03** on things that are not a sequence.
- **Arrows typed into labels**: "Learn more →". Use the repo's icon only where the direction
  means something.
- **Placeholders**: initials in coloured circles, grey logo boxes, empty image frames. Demo data
  looks like a real customer.

## Motion

- **Content hidden until it animates**, or the same fade-up on every block. Show content at once.
- **Hover lift on every card**, clickable or not. Hover only on what can be clicked.
- **Bounce or elastic easing.** Ease out, no overshoot.
- **Looping pulse or shimmer** with nothing loading and nothing live.

## Words

- **Vague words**: seamless, powerful, effortless, elevate, unleash, best-in-class. Say what
  happens.
- **Generic buttons**: Submit, Get started, Learn more. Name the action and the object: "Send
  report".
- **Numbers as words** in headings, buttons and steps: write 3, not three.
- **Slogans**: "Not X. Y.", "Faster, smarter, simpler." One plain claim.

## States

- **Missing states**: no focus, disabled, error, empty or loading design. Show the states that
  matter as screens (`A--empty`, `A--error`).

## Sources

- Impeccable detector rules (Paul Bakaus), described at
  https://botmonster.com/web-dev/impeccable-design-detector-rules-59-ai-design-tells/ (2026-08)
- https://www.paralect.com/blog/signs-of-ai-slop-in-design (2026)
- https://github.com/funboy322/avoid-ai-design, `references/ai-tells-catalog.md` (2026)
