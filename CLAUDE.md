# obsidian-linear-calendar

Obsidian plugin — horizontal year-at-a-glance timeline rendered from note frontmatter.

## Public API
- `mountMonthStrip(container, categoriesEl, onMonthChange?)` (returns `MonthStripHandle`: `next/prev/today/destroy`) and `getCalendarData(year)` on `LinearCalendarPlugin` are consumed by `obsidian-lhak-dashboard` at runtime; signature changes require coordinating both repos
- Types used internally by `mountMonthStrip`/`getCalendarData` (e.g. `RenderConfig`) are not part of that coordinated surface — only the two signatures above and `MonthStripHandle` are

## Build & Test

- `npm run build` — production build → main.js
- `npm run deploy` — build + copy main.js, manifest.json, styles.css to test-vault plugin dir
- `npm test` (vitest) — pure-logic modules in `src/utils/` only; no Obsidian mocking needed
- `npm run lint` — if the rtk proxy mangles `eslint`'s output (`JSON parse failed: EOF`), run `./node_modules/.bin/eslint 'src/**/*.ts' --ignore-pattern 'src/**/*.test.ts'` directly
- Files outside `src/utils/` are Obsidian-coupled — test manually in test-vault; pure functions inside them can be extracted to `src/utils/` and tested (see `dragUtils.ts`)
- Verifying an `AbstractInputSuggest` popover manually: `obsidian-cli dev:screenshot` blurs the input and closes the popover before capture — check `getComputedStyle`/`querySelectorAll('.suggestion-item')` instead of relying on the screenshot
- `obsidian-cli eval code="app.setting.open()"` throws "Converting circular structure to JSON" from auto-serializing the return value — harmless, settings still opens; ignore it
- Uses esbuild (not webpack/vite)
- `npx fallow` dead-file/dead-export results are wrong — fallow reads `package.json` `"main": "main.js"` (compiled output) and can't trace back to `src/main.ts`; ignore dead-code section entirely, complexity/duplication sections are accurate

## Conventions

- All CSS in single `styles.css` (Obsidian plugin convention)
- Only use Obsidian CSS custom properties (`var(--...)`) for theme compatibility
- Bar colors set via inline `style.backgroundColor` in JS — CSS cannot override inline styles; color adaptations (contrast, theming) must be handled in JS at render time
- `no-static-styles-assignment` only flags literal-value style assignments — dynamic ones (variables, template literals) are exempt; when fixing violations, move literal values into a CSS class and leave computed ones in JS
- For bar visual markers (overlays, badges), use `outline` + `outline-offset: -Npx` (not `border`) — no layout shift, respects `border-radius`; `currentColor` inherits the JS-set contrast text color
- For dynamic colors needed by CSS pseudo-elements (::before, :hover), use `style.setProperty("--var", value)` and reference `var(--var)` in CSS rules
- `color-mix(in srgb, var(--color-accent) 12%, transparent)` works — Obsidian uses Chromium 114+
- Use `this.registerDomEvent()` for all DOM event listeners in views — raw `addEventListener` on `contentEl` leaks across open/close cycles
- Sticky headers need `z-index` > 5 (bars use `z-index: 5`) or they get painted over on scroll
- To fill a cell with a dynamic background, put the class on the container or use `position: absolute; inset: 0` — `width/height: 100%` on a `<span>` inside a flex column is unreliable
- In Settings UI, `Setting.then(cb)` is synchronous and returns `this` — use it mid-chain for raw DOM injection into `controlEl` (e.g. live-preview inputs) while still chaining `.addColorPicker()` / `.addExtraButton()`
- Packing many controls into one `Setting.controlEl` row risks overflow: `.setting-item-control` defaults to `justify-content: flex-end` + `flex-wrap: nowrap` + `overflow: visible`, so when combined child width exceeds the column the excess spills left past the box and overlaps the name/desc text — fix with `flex-wrap: wrap` on the control, and `flex-shrink: 0` on children that must keep a fixed natural size (e.g. a swatch grid)
- Obsidian's icon resolver accepts bare Lucide names ("cake") same as the canonical `getIconIds()` form ("lucide-cake") — this plugin stores/writes icons bare everywhere (`iconMap`, frontmatter `icon:`), so strip the `lucide-` prefix when displaying or writing icon ids
- All Obsidian components are thenable (`BaseComponent.then()` exists for fluent chaining) — this trips `no-misused-promises` both when returning a component from a `void`-typed callback (use block body `{ comp.method(); }`) and when truthiness-testing a component variable in an `if` (needs a disable comment with description, e.g. "not a Promise, just checking assignment")
- Command `name` must not include plugin name (e.g. `"Open"` not `"Open Linear Calendar"`) — Obsidian prepends plugin name in palette automatically
- Settings headings: use `new Setting(containerEl).setName("...").setHeading()` not `createEl("h2"/"h3")`; omit top-level plugin title (sidebar shows it); no "setting" or "option" in heading text
- For modal titles use `Modal.setTitle()` (real title-bar API) — `new Setting(contentEl).setName(...).setHeading()` is just another content row with no visual weight outside `PluginSettingTab`
- Restyling `Setting` outside `PluginSettingTab` (e.g. in a `Modal`): Obsidian's own `.setting-item` border/padding rules and `select.dropdown` fitted-width tie or beat plain class-selector overrides on specificity — use `!important` or match the selector (e.g. `select.dropdown`), verify via `getComputedStyle` in the live vault, not just visually
- For responsive CSS, prefer `@container` over `@media` — Obsidian panels resize independently of viewport; `.lc-month-row` has `container-type: inline-size`; place `@container` blocks before `@media` blocks so the media query wins the cascade when both fire
- `setTooltip` does not fire in cross-plugin embeds (e.g. `mountMonthStrip`); use `Tooltip.showForChip()` instead — it works anywhere via direct event listeners
- `mountMonthStrip`'s `alignMode` is hardcoded to `"date"` regardless of `settings.alignMode` — intentional for the single-month embed context, not an oversight; don't fold it into settings-accessor refactors
- `@media` and `@container` rules on shared `.lc-*` classes must be scoped to `.linear-calendar-container` (e.g. `.linear-calendar-container .lc-categories`) to prevent bleeding into dashboard embeds
- `eslint-plugin-obsidianmd` recommended config bans eslint-disable comments for `no-static-styles-assignment`, `ui/sentence-case`, `no-deprecated` — fix the underlying code/config instead of suppressing (move literal styles to CSS classes; add `brands`/`ignoreRegex` to `eslint.config.mjs` for placeholder text; avoid calling the deprecated method directly)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
