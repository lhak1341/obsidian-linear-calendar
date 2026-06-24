# obsidian-linear-calendar

Obsidian plugin — horizontal year-at-a-glance timeline rendered from note frontmatter.

## Public API
- `mountMonthStrip(container, categoriesEl)` and `getCalendarData(year)` on `LinearCalendarPlugin` are consumed by `obsidian-lhak-dashboard` at runtime; signature changes require coordinating both repos

## Build & Test

- `npm run build` — production build → main.js
- `npm run deploy` — build + copy main.js, manifest.json, styles.css to test-vault plugin dir
- `npm test` (vitest) — pure-logic modules in `src/utils/` only; no Obsidian mocking needed
- Files outside `src/utils/` are Obsidian-coupled — test manually in test-vault; pure functions inside them can be extracted to `src/utils/` and tested (see `dragUtils.ts`)
- Uses esbuild (not webpack/vite)
- `npx fallow` dead-file/dead-export results are wrong — fallow reads `package.json` `"main": "main.js"` (compiled output) and can't trace back to `src/main.ts`; ignore dead-code section entirely, complexity/duplication sections are accurate

## Conventions

- All CSS in single `styles.css` (Obsidian plugin convention)
- Only use Obsidian CSS custom properties (`var(--...)`) for theme compatibility
- Bar colors set via inline `style.backgroundColor` in JS — CSS cannot override inline styles; color adaptations (contrast, theming) must be handled in JS at render time
- For bar visual markers (overlays, badges), use `outline` + `outline-offset: -Npx` (not `border`) — no layout shift, respects `border-radius`; `currentColor` inherits the JS-set contrast text color
- For dynamic colors needed by CSS pseudo-elements (::before, :hover), use `style.setProperty("--var", value)` and reference `var(--var)` in CSS rules
- `color-mix(in srgb, var(--color-accent) 12%, transparent)` works — Obsidian uses Chromium 114+
- Use `this.registerDomEvent()` for all DOM event listeners in views — raw `addEventListener` on `contentEl` leaks across open/close cycles
- Sticky headers need `z-index` > 5 (bars use `z-index: 5`) or they get painted over on scroll
- To fill a cell with a dynamic background, put the class on the container or use `position: absolute; inset: 0` — `width/height: 100%` on a `<span>` inside a flex column is unreliable
- In Settings UI, `Setting.then(cb)` is synchronous and returns `this` — use it mid-chain for raw DOM injection into `controlEl` (e.g. live-preview inputs) while still chaining `.addColorPicker()` / `.addExtraButton()`
- Command `name` must not include plugin name (e.g. `"Open"` not `"Open Linear Calendar"`) — Obsidian prepends plugin name in palette automatically
- Settings headings: use `new Setting(containerEl).setName("...").setHeading()` not `createEl("h2"/"h3")`; omit top-level plugin title (sidebar shows it); no "setting" or "option" in heading text
- For responsive CSS, prefer `@container` over `@media` — Obsidian panels resize independently of viewport; `.lc-month-row` has `container-type: inline-size`; place `@container` blocks before `@media` blocks so the media query wins the cascade when both fire

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
