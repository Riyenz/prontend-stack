# Lab recipes

Every recipe ends in the same place: `{dist}/index.html` with one script and one stylesheet, a
page that speaks the 3 messages of the lab contract, and no browser history.

## Variant discovery (every stack)

The build reads the round folder from its arguments, lists the variant files (one extension, in
name order), and generates a module the page imports:

```js
import V0 from '/abs/round-1/A.vue'
import V1 from '/abs/round-1/B.vue'
import setupDemo from '/abs/round-1/demo.ts'
export const variants = [{ label: 'A', component: V0 }, { label: 'B', component: V1 }]
export { setupDemo }
```

Serve it as a virtual module (a Vite plugin with `resolveId` and `load`, or a Nuxt module with
`addTemplate`). The page calls `setupDemo` once, then renders `variants[index]`.

Tailwind must also scan the round folder and the app source: add `@source` lines (Tailwind 4) or
`content` globs (Tailwind 3) for both in the lab's CSS entry. Name the exact round folder, added
at build time: `round.mjs` writes `.design-lab/.gitignore` = `*`, and Tailwind 4 skips ignored
files under a parent `@source` like `.design-lab` without a word. With Vite, a `pre` plugin
whose `transform` appends `@source "<round folder>";` to the lab's CSS file does it. Prove it on
a class only a variant uses (`verify.mjs` passes when classes are missing; the PNG shows it).

## Nuxt 3 / 4 (proven on a production app: Nuxt 4.4, Nuxt UI 4, Clerk)

A second Nuxt app in `.claude/skills/design-lab/` that reuses the real `app/`. Build it with
`nuxi generate <lab dir>` and environment variables for the round and the output folder.

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', designRound],
  ssr: false,
  buildDir: join(scratch, 'nuxt'),
  nitro: { output: { dir: join(scratch, 'nitro'), publicDir: distDir } },
  dir: { public: emptyDir },
  alias: { '~': appDir, '@': appDir, '~~': repoDir, '@@': repoDir, '@clerk/vue': clerkMock },
  components: [{ path: join(appDir, 'components') }],
  imports: { dirs: [join(appDir, 'composables'), join(appDir, 'utils')], presets: [/* the auth module's auto-imports, from the mock */] },
  plugins: [/* only the app plugins a screen needs, e.g. dayjs */],
  runtimeConfig: { public: {/* copy the public keys the screens read; feature flags on */} },
  experimental: { appManifest: false, payloadExtraction: false },
  features: { inlineStyles: false },
  app: { baseURL: './', buildAssetsDir: '_nuxt/' },
  icon: { provider: 'none', fallbackToApi: false, serverBundle: false, clientBundle: { icons: scannedIconNames, sizeLimitKb: 4096 } },
  vite: { build: { assetsInlineLimit: 100 * 1024 * 1024, cssCodeSplit: false, modulePreload: false, rollupOptions: { output: { inlineDynamicImports: true, manualChunks: undefined } } } }
})
```

- `app/router.options.ts` returns `{ history: base => createMemoryHistory(base) }`. Hash mode is
  not enough: it still calls `replaceState`.
- `app/app.vue` is `<UApp><NuxtPage /></UApp>` (or the repo's root wrapper without SEO and
  analytics). `app/app.config.ts` re-exports the repo's.
- `app/pages/[...slug].vue` is the page. A variant imports the real layout and page:
  `import AppLayout from '~/layouts/app.vue'`.
- Set `dir.public` to an empty folder, so the build does not copy a large `public/`;
  `round.mjs` inlines what the code names.
- Icons: the Iconify API is a network request. Scan the app, the round and the UI library's
  runtime for icon names, keep the names found in the installed `@iconify-json/*` sets, and
  bundle them.
- Auth modules (`@clerk/nuxt`, `@sidebase/nuxt-auth`) are left out of `modules`; alias their
  Vue package to the Storybook mock and register their global components in a lab plugin.
- Time: about 7 s per round.

## Vite with Vue, React, Svelte or Solid (proven for React: Vite 8, React 19, react-router 8, Tailwind 4, lucide; Vue, Svelte, Solid not yet)

A `vite.config.ts` in the lab with `root` set to the lab folder. `lab.json` passes the folders
as environment variables:
`DESIGN_ROUND={round} DESIGN_DIST={dist} npx vite build --config .claude/skills/design-lab/vite.config.ts`.

- The repo's framework plugin (`@vitejs/plugin-react`, `@vitejs/plugin-vue`,
  `@sveltejs/vite-plugin-svelte`) and the repo's aliases (copy from its Vite config or the
  `paths` in `tsconfig.json`).
- `base: './'`, `publicDir: false`, `build.outDir` = the dist argument,
  `build.emptyOutDir: true`, `build.assetsInlineLimit` very large, `build.cssCodeSplit: false`,
  `build.modulePreload: false`, and one chunk: `rolldownOptions.output.codeSplitting: false`
  on Vite 8, `rollupOptions.output.inlineDynamicImports: true` before it.
- `index.html` plus an entry that imports a lab CSS file (`@import` the repo's global CSS), wraps
  the variant in the same providers the app's root uses (theme, i18n, query client, store), and
  speaks the 3 messages. Remount on each variant (`key={label}`) so state starts fresh.
- Shell: when the layout renders `<Outlet />`, the lab puts the variant inside it:
  `<MemoryRouter initialEntries={[demo.path]}><Routes><Route element={<AppLayout />}><Route path="*" element={<Variant />} /></Route></Routes></MemoryRouter>`.
  A variant is then just the page content.
- Router: `createMemoryHistory` (vue-router), `createMemoryRouter` or `MemoryRouter`
  (react-router), `memoryHistory` (TanStack Router).
- Stand-ins for the repo's own modules (an auth hook, an API client): swap them by resolved
  file, not by alias string, so relative imports swap too. A `pre` plugin's `resolveId` calls
  `this.resolve(source, importer, { skipSelf: true })` and returns the stand-in when the result
  is the real file. A sign-out that sets `window.location` would navigate the frame away; the
  stand-in makes it do nothing.
- Data: replace the API client or `window.fetch` in the demo file with handlers. Parse URLs
  against a fixed base (`new URL(input, 'http://design-lab.local')`); `about:srcdoc` is not a
  valid base. Log a `console.warn` for a request with no handler, so `verify.mjs` names it. MSW
  needs a service worker, which a `file://` page cannot register; reuse its handler data, not
  MSW itself.
- A Google Font `@import` in the repo's CSS needs nothing: `round.mjs` inlines it.
- Time: about 1 s per round; 1.4 MB, most of it 28 inlined font files.

## Next.js (not yet proven)

Next cannot build one self-contained file. Build the variants with the Vite recipe instead, and
alias Next's modules to stand-ins:

- `next/link` → a plain `<a>`; `next/image` → `<img>`; `next/navigation` and `next/router` →
  memory-router hooks with the same names; `next/font/*` → functions that return the class names
  and the Google Fonts URL (inlining picks it up); `next/headers`, server actions,
  `server-only` → modules that return demo data.
- Server components cannot run in the browser. A variant renders the client components and
  passes them the props the server component would have fetched.
- Import the app's global CSS and wrap variants in the same providers as `app/layout.tsx`.

## Other stacks

SvelteKit: the Vite recipe, with `$app/navigation`, `$app/stores` and `$app/environment`
aliased to stand-ins. Angular, Remix, Astro: write the lab with the framework's own client-only
build if it can produce one bundle; otherwise a Vite build of the components. Record what you
did as a new section here after it passes the proof.
