# obsidian-linear-calendar — domain language

**Calendar note** — a vault note tagged `#linear-calendar` (or a `linear-calendar/` subtag) with a start date in its frontmatter. Source of every bar.

**Category** — the first `linear-calendar/*` subtag on a calendar note. Notes with none are "uncategorized" (shown as "Other").

**Item** — what the calendar draws for a year: one bar's worth of data. Has a **kind**.

**Kind** — what an item is:
- **event** — a calendar note's own dates. Includes an anniversary note in its origin year.
- **recurrence** — a copy of an anniversary note projected into a later year. Carries its **origin year**. Not draggable.
- **reminder** — a synthetic ghost bar drawn from another note's remind date. A fixed one-off; clicking it promotes it to a real note.

**Anniversary** — a calendar note flagged to repeat on the same date every later year. Produces recurrences.

**Origin year** — the year of an anniversary note's own start date. A recurrence's age is its year minus the origin year.

**Raw item** — what a calendar note yields before a year is chosen (`RawCalendarItem`). `expandForYear` turns raw items into items.

**Event note** — a calendar note created by the plugin's "Create event" flow: lives directly in the event folder and is named `"{date prefix} {title}"`.

**Event folder** — the `newEventFolder` setting; empty means the vault root. Only direct children count as event notes.

**Date prefix** — the start date formatted per `newEventDateFormat` (default `YYYY-MM-DD`), followed by a space, at the start of an event note's name. Dragging an event renames its note to the new date's prefix.

**Uncategorized** — the category of an item with no `linear-calendar/` subtag, shown as "Other". Its key `"__uncategorized__"` is persisted in view state, so it must not change.
