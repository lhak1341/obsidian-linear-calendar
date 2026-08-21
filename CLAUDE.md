# obsidian-linear-calendar

Horizontal year-at-a-glance timeline rendered from note frontmatter.

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill —
bun, script contract, ESLint/obsidianmd setup, `Setting` API details, CSS specificity and
`@container` rules, live debugging. Only repo-specific facts are below.

Has `graphify-out/`.

## Public API

- `mountMonthStrip(container, categoriesEl, onMonthChange?)` (returns `MonthStripHandle`:
  `next` / `prev` / `today` / `destroy`) and `getCalendarData(year)` on
  `LinearCalendarPlugin` are consumed by `obsidian-lhak-dashboard` at runtime. Signature
  changes require coordinating both repos.
- Types used internally by those two (e.g. `RenderConfig`) are **not** part of the
  coordinated surface — only the two signatures and `MonthStripHandle` are.
- `mountMonthStrip`'s `alignMode` is hardcoded to `"date"` regardless of
  `settings.alignMode`. That is intentional for the single-month embed context — do not
  fold it into a settings-accessor refactor.

## Rendering

- Bar colors are set via inline `style.backgroundColor` in JS, so CSS cannot override them;
  contrast and theming adaptations happen in JS at render time.
- Sticky headers need `z-index` > 5 — bars sit at `z-index: 5`.
- To fill a cell with a dynamic background, put the class on the container or use
  `position: absolute; inset: 0`; `width/height: 100%` on a `<span>` inside a flex column
  is unreliable.
- `setTooltip` does not fire in cross-plugin embeds (`mountMonthStrip`). Use
  `Tooltip.showForChip()`, which works anywhere via direct listeners.
- `@media` / `@container` rules on shared `.lc-*` classes must be scoped to
  `.linear-calendar-container`, or they bleed into dashboard embeds.
- Icons are stored bare everywhere (`iconMap`, frontmatter `icon:`) — strip the `lucide-`
  prefix when displaying or writing icon ids.
- `src/lucide-icons.ts` bundles the full current Lucide set offline (`src/lucide-icon-svgs.json`,
  regenerated via `bun run sync:lucide`) so icons missing from Obsidian's pinned snapshot
  (e.g. `mosque`, `broccoli`) still resolve. Every dynamic `setIcon(el, name)` call must go
  through `resolveLucideIconId(name)` first — Obsidian's `getIcon()` silently no-ops on
  `addIcon()` entries registered under its own `lucide-` prefix, so gap-fill icons live under
  `linear-calendar-lucide-` instead. `registerLucideIcons()` runs once in `main.ts` `onload()`.
- The same sync script also writes `src/lucide-icon-tags.json` (lucide-static's per-icon search
  synonyms, e.g. "flask-conical" -> ["lab", "chemistry", ...] — the data lucide.dev's own icon
  search runs on). `IconSuggest.getSuggestions()` ranks via `src/utils/iconSearch.ts`'s
  `rankIconSuggestions()`, name matches first then tag matches, so typing "chem" surfaces
  flask-conical/atom/biohazard/etc even though none of those names contain "chem".

## Testing

`bun run test` (vitest) covers `src/utils/` only. Files outside it are Obsidian-coupled and
verified manually in `test-vault/`; extract pure functions into `src/utils/` to make them
testable (see `dragUtils.ts`).

`obsidian eval` does not work against `vault=test-vault` — that vault has no CLI bridge
plugin enabled. Use `vault=lhakZettel`, where this plugin is also deployed.

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
