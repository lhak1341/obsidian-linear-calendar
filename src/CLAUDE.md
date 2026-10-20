# src root (main.ts, settings.ts, EventNotes.ts, icon files)

## Public API — coordinated with obsidian-lhak-dashboard

- `mountMonthStrip(container, categoriesEl, onMonthChange?)` (returns `MonthStripHandle`:
  `next`/`prev`/`today`/`destroy`) and `getCalendarData(year)` on `LinearCalendarPlugin`
  are called at runtime by `obsidian-lhak-dashboard`. Changing either signature requires
  coordinating both repos.
- `mountMonthStrip` is a one-line `new MonthStrip(...)`; the strip itself lives in `view/MonthStrip.ts` (a class implementing `MonthStripHandle`). `onMonthChange` fires after every render, not only on navigation.
- Types used only internally by those two (e.g. `RenderConfig`) are **not** part of the
  coordinated surface.
- The dashboard only calls `mountMonthStrip`, never `getCalendarData` — `CalendarItem`'s
  field shape (e.g. `kind`/`originYear`) is free to reshape without cross-repo
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

- `settings.ts` mutates `plugin.settings` in place, then `saveSettings()` saves and calls `SettingsChanges.notify()`. Every host (`LinearCalendarView`, each `MonthStrip`) subscribes via `onChange` and repaints fully; hosts read settings through a `getSettings` getter, never a captured object. A new host must subscribe, or it goes stale after a settings save. Not unit-tested (a subscriber set); verify live via `obsidian eval`: mount a strip with an `onMonthChange` counter, toggle a setting and `await plugin.saveSettings()`, and the count rises by one; after `destroy()` it no longer rises. Restore the setting afterwards. Run 2026-10-21 in `lhakZettel`: passed (render count only, DOM change not inspected).

## Daily notes

- `DailyNotes` (`DailyNotes.ts`) is the only place the daily-note filename format, folder and `YYYY-MM-DD` key are known: hosts call `get(year, month, day)` (0-based month) and `create(...)`, never build a key. The plugin owns one instance (built in `onload`) and passes it to the view and every month strip.
- Folder and format come from another plugin's settings, which fire no event, so `get` compares a `folder|format` signature with the one the index was built from and rebuilds on a mismatch. Vault events drop the index only for markdown files under the folder (or a folder holding it); `onChange` notifies debounced (300ms).

## Note creation

- `eventFields.ts` holds `EventFields` and its two mirror images: `applyFields` writes them into frontmatter, `readEventFields` reads `{ date, fields }` back. `title` comes back undefined when the note has none — callers choose the fallback (filename, prefix-stripped filename, blank). They differ on purpose, so don't fold them into one shared read: `promoteReminder` strips the date prefix so the new note, named `{date} {title}`, doesn't get two prefixes; the edit modal shows the raw basename because its title input is disabled in filename mode and nothing is written back. `tag` is the first `linear-calendar/*` subtag; a bare-gate-tag note has none, which `create` writes back as the bare tag.
- `eventForm.ts` is the form side of that codec: `buildEventFields` (form state → `EventFields`, with the end-before-start check and relative/exact reminder maths) and `formStateFromFields` (the reverse, for edit prefill). `CreateEventModal` holds widgets and one `EventFormState`; put validation and reminder rules in `eventForm.ts`, not the modal.
- `EventNotes` (`EventNotes.ts`) is the only writer of event-note frontmatter:
  `create`/`update`/`move`/`promoteReminder`. `create()` takes `CreateOptions` (=
  `EventFields` + a **required** `openAfterCreate`); `update()` takes plain `EventFields`
  and never opens anything. `create` merges (omitted field untouched, a template may have
  set it); `update` replaces (omitted field cleared). Every verb resolves only after the
  metadata cache reflects the write, never throws, and resolves `false` after a log + Notice.
  Omitting `openAfterCreate` is a type error, so nothing to remember — the default-`true`
  that silently auto-opened notes for internal callers (bit twice: e915cfc, f6e9234) no
  longer exists.
