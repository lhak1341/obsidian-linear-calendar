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
- No gate pins these signatures (a type-pin test here can only restate the declaration, so
  it would go stale in lockstep with a rename rather than catching it). The real check is a
  typecheck in `obsidian-lhak-dashboard` against this repo — deferred until the two repos
  share a build. Class has fired zero times so far; count it here when it does.

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
  user-configured icon values (`iconMap`/frontmatter). This exemption is why the rule stays
  prose: a lint rule banning bare `setIcon` would have to tell user-configured values apart
  from literal built-in ids, which is the reasoning, not the rule. Ruled out unless the
  `Menu` path disappears.
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

- `create()` takes `CreateOptions` (= `CreateEventOptions` + a **required**
  `openAfterCreate`); `updateEvent()` takes plain `CreateEventOptions` and never opens
  anything. Omitting the flag is a type error, so nothing to remember — the default-`true`
  that silently auto-opened notes for internal callers (bit twice: e915cfc, f6e9234) no
  longer exists.
