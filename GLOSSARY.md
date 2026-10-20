# Glossary

Domain terms as this repo uses them. Code names in backticks.

**Item** (`CalendarItem`): one thing drawn on the calendar, derived from a note's frontmatter. Its `kind` is `event`, `recurrence` or `reminder`.

**Event**: an item built from a note's own dates (including an anniversary note in its origin year).

**Recurrence**: a copy of an anniversary note projected into a later year; carries `originYear`.

**Reminder**: a synthetic ghost item drawn from another note's remind property. Its `filePath` still points at the source note.

**Anniversary**: a note flagged to repeat yearly. Yields an event in its origin year and recurrences after.

**Event note**: a note with the gate tag that the plugin reads (scanner) and writes (`EventNotes`). Its frontmatter fields are `EventFields`.

**Gate tag**: the `#linear-calendar` tag that makes a note eligible to appear. `hasGateTag()` checks it.

**Category**: an item's first `linear-calendar/*` subtag, else `UNCATEGORIZED` (displayed "Other"). The key is persisted in view state as `hiddenCategories`; don't change it.

**Category chip**: a clickable pill showing a category's dot, name and item count; click hides or shows that category's bars. Owned by `CategoryChips`. Counts cover only the viewed months, so a month strip counts one month and the year view counts twelve.

**Bar**: the rendered span of an item, split into one segment per month and packed into rows by `layoutBars`.

**Daily note**: the note for one date, located via another plugin's folder and format settings. Looked up only through `DailyNotes.get(year, month, day)` (0-based month); no caller builds the `YYYY-MM-DD` key.

**Month strip** (`mountMonthStrip`): a single-month embed of the calendar mounted by `obsidian-lhak-dashboard`. Implemented by `MonthStrip` (`view/MonthStrip.ts`), a sibling host to `LinearCalendarView` with its own resize policy (ADR-0001).
