# src root (main.ts, settings.ts, NoteCreator.ts, icon files)

## Public API — coordinated with obsidian-lhak-dashboard

- `mountMonthStrip(container, categoriesEl, onMonthChange?)` (returns `MonthStripHandle`:
  `next`/`prev`/`today`/`destroy`) and `getCalendarData(year)` on `LinearCalendarPlugin`
  are called at runtime by `obsidian-lhak-dashboard`. Changing either signature requires
  coordinating both repos.
- Types used only internally by those two (e.g. `RenderConfig`) are **not** part of the
  coordinated surface.
- The dashboard only calls `mountMonthStrip`, never `getCalendarData` — `CalendarItem`'s
  field shape (e.g. `isReminder`/`anniversary`) is free to reshape without cross-repo
  coordination.
- `mountMonthStrip`'s `alignMode` is hardcoded to `"date"` regardless of
  `settings.alignMode`. Intentional for the single-month embed context — don't fold it
  into a settings-accessor refactor.

## Icons

- Icon ids are stored bare everywhere (`iconMap`, frontmatter `icon:`) — strip the
  `lucide-` prefix when displaying or writing them.
- Every dynamic `setIcon(el, name)` call must go through `resolveLucideIconId(name)`
  first. `lucide-icons.ts` bundles the full current Lucide set offline
  (`lucide-icon-svgs.json`, regenerated via `bun run sync:lucide`) so icons missing from
  Obsidian's pinned snapshot (e.g. `mosque`, `broccoli`) still resolve — Obsidian's
  `getIcon()` silently no-ops on `addIcon()` entries registered under its own `lucide-`
  prefix, so gap-fill icons live under `linear-calendar-lucide-` instead.
  `registerLucideIcons()` runs once in `main.ts`'s `onload()`.
- `Menu`/`MenuItem.setIcon` (context menus, command palette) take Obsidian's built-in icon
  ids directly and skip `resolveLucideIconId` — that gap-fill path is only for
  user-configured icon values (`iconMap`/frontmatter).
- `IconSuggest.getSuggestions()` ranks via `utils/iconSearch.ts`'s
  `rankIconSuggestions()` (name matches first, then tag matches against
  `lucide-icon-tags.json`'s per-icon search synonyms) — so typing "chem" surfaces
  flask-conical/atom/biohazard even though none of those names contain "chem".

## Settings modal

- Chaining multiple controls onto one `Setting` (e.g. a mode dropdown + number + unit on
  one row) needs a scoped `.setting-item-control > * { width: auto !important }`
  override — the modal's default per-field `width: 100%` makes siblings fight for the
  same full-row width otherwise. See `.lc-remind-setting` in `styles.css`.

## Note creation

- `NoteCreator.create()`/`updateEvent()`'s `openAfterCreate` defaults `true` — any new
  internal caller (promote, duplicate, batch, edit) must pass `openAfterCreate: false`
  explicitly or the note silently auto-opens. Already bit twice.
