# Reminder feature — spec

Status: drafted via wayfinder grilling session, 2026-08-21. Not yet built.

## Motivation

A note about something happening today (e.g. "Cleaning AC") often implies a future
follow-up ("do this again in 4 months") that the user doesn't want to forget, but also
doesn't want to fully schedule yet. This feature lets a note flag a future date as a
soft reminder, shown as a translucent "ghost" bar on the calendar, which the user can
later click to spin off a real note at that date.

## Data model

Add one new configurable frontmatter key, following the existing `ColumnMapping`
pattern (`src/types.ts:17-24`, defaults in `src/constants.ts:5-12`):

- `remindProp` (setting key) → default frontmatter key `remindon` (mirrors `datestart`,
  `dateend`, `icon`, `anniversary`, `description` — all configurable, none hardcoded).
- Value: an absolute date (same format as `datestart`). Resolved to an absolute date at
  write time — there is no relative-date ("in 4 months") concept stored anywhere in the
  pipeline; any "in N months" UI is just input sugar the user resolves themselves when
  typing the date (no dedicated modal is in scope — see "Out of scope").

**A note can carry both `datestart` and `remindon` at once.** They are not mutually
exclusive:

- `datestart` present → the note renders as a normal bar, as today.
- `remindon` present → the note *additionally* renders a ghost bar at that date,
  regardless of whether `datestart` is also set.

So one note can produce two bars on the calendar: its real bar at `datestart`, and a
ghost bar at `remindon`.

## Rendering

- `mapFrontmatterToItem()` (`src/utils/frontmatterMapper.ts:9-83`) needs to emit a
  second synthetic `CalendarItem` for any note with `remindon` set — same `filePath`,
  `title`, `tags`/category, `icon` as the source item, but `dateStart` = the `remindon`
  value, and a new `isReminder: true` (or similar) flag. No `dateEnd` — single-day width,
  same treatment as anniversary notes today (`BarRenderer.ts:117`, `styles.css:413-420`
  is the precedent for a bar variant driven by a boolean flag).
- `BarRenderer` (`src/view/BarRenderer.ts`) renders the reminder item through the
  existing bar path with reduced opacity. Precedent for the opacity value: `.lc-drag-ghost
  { opacity: 0.4 !important }` (`styles.css:460-461`) and `.lc-category-hidden { opacity:
  0.35 }` (`styles.css:163-164`) — reuse one of these values rather than inventing a third.
- Reminder bars should respect the existing category-hide toggle (`CalendarRenderer.ts:211`)
  the same way real bars do, since they share the same tag/category — no special-casing
  needed if they flow through the normal per-category filtering already applied to items
  before they reach `BarRenderer`.
- Color: same tag → same `tagColorMap` lookup as the source note
  (`colorUtils.ts:9-30`) — the ghost is a translucent version of the same color, not a
  distinct "reminder color".

## Click / promote behavior

Reminder bars do **not** reuse the plain `openLinkText` click handler
(`BarRenderer.ts:58-61`) — clicking a reminder bar has no existing note to open at that
path/date, so it must go through a new "materialize" path:

1. Duplicate the source note's frontmatter (title, tag(s), icon, description) into a new
   note via the existing `ObsidianNoteCreator.create()` (`src/NoteCreator.ts:30-119`),
   which already handles the `{dateFormat} {title}.md` filename convention and opens the
   file on creation (`NoteCreator.ts:114`) — reuse this, don't build a second creation path.
2. New note's `datestart` = the reminder's date (the old `remindon` value).
3. New note's `remindon` is **recomputed forward**, not copied verbatim and not dropped:
   `newRemindOn = newDateStart + (oldRemindOn − oldDateStart)` — i.e. the same interval
   the user originally set, reapplied from the new date. This makes reminders recurring
   by design: promoting one spins off the next one automatically, chaining until the
   user deletes the field. This was confirmed as core, not a stretch feature — it's the
   literal mechanism behind "the reminder transfers from the old note to the new note."
4. The **source note's `remindon` field is deleted** once the new note is created — its
   ghost bar disappears, preventing two ghosts (old note's stale one, new note's fresh
   one) from overlapping.

No modal is shown during promotion — it's a single click that silently creates and opens
the new note, matching the "minimal UI" call below.

## UI scope

- **No new modal.** `CreateEventModal` (`src/CreateEventModal.ts`) gained one optional
  date field ("Remind me"), gated on `mapping.remindProp` being set (same gating
  `descriptionProp` already uses) — writes via the same `extraFrontmatter` mechanism
  `promoteReminder` uses. Setting `remindon` on a note that predates this field, or that
  wasn't created through the modal, is still manual frontmatter editing.
- The only other new interactive behavior is the reminder-bar click handler described above.

## Out of scope

- A dedicated "set reminder" modal or relative-date input ("in 4 months" → resolved
  date) — user types an absolute date by hand for now.
- Notifications, toasts, or any OS-level alerting when a reminder date arrives.
- Snoozing / editing a reminder's date after it's set, other than editing the frontmatter
  directly.
- Reminder bars on notes that aren't already matched by the plugin's existing
  `linear-calendar/*` tag scan — this only extends notes already in scope.

## Open implementation details (not decisions, just need care during build)

- Confirm whether `mapFrontmatterToItem` currently assumes exactly one `CalendarItem`
  per note file (1:1) — emitting two items for one file (real + ghost) may need a small
  restructure of whatever calls this mapper per-file (`getCalendarData`, per repo's
  public API in `CLAUDE.md`) to accept a note producing an array of items instead of one.
- Verify `z-index`/stacking doesn't visually confuse a real bar and its own ghost bar
  landing in the same visible month range (e.g. a 1-month reminder) — decide whether
  that's worth a "too soon to ghost" guard, or just let it render as-is.
