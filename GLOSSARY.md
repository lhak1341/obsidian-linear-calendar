# Glossary

Domain terms as this repo uses them. Code names in backticks.

**Item** (`CalendarItem`): one thing drawn on the calendar, derived from a note's frontmatter. Its `kind` is `event`, `recurrence` or `reminder`. It carries its own span (`dateStart`/`dateEnd`), never cut to what a view shows; the view range's layout clips it per row.

**Event**: an item built from a note's own dates (including an anniversary note in its origin year).

**Recurrence**: a copy of an anniversary note projected into a later year; carries `originYear`.

**Reminder**: a synthetic ghost item drawn from another note's remind property. Its `filePath` still points at the source note.

**Birthday**: an item tagged `linear-calendar/birthday`. Its recurrences show an age badge ("Turns N", from `describeItem`); its origin-year event does not.

**Anniversary**: a note flagged to repeat yearly. Yields an event in its origin year and recurrences after: one copy per year whose span touches what a view shows, so a note across New Year shows its tail in January as well as its next start in December.

**Event note**: a note with the gate tag that the plugin reads (scanner) and writes (`EventNotes`). Its frontmatter fields are `EventFields`.

**Gate tag**: the `#linear-calendar` tag that makes a note eligible to appear. `hasGateTag()` checks it.

**Category**: an item's first `linear-calendar/*` subtag, else `UNCATEGORIZED` (displayed "Other"). The key is persisted in view state as `hiddenCategories`; don't change it.

**Category chip**: a clickable pill showing a category's hue dot, name and item count (a narrow panel hides the name; the tooltip shows it); click hides or shows that category's bars. Owned by `CategoryChips`. Counts cover what the view range covers: the year view counts its year, a rolling strip its 30 days.

**Bar**: the rendered span of an item, split into one segment per row of the view range (per month, in the year view) and packed into lanes by the range's `layoutBars`.

**Drag session** (`DragSession`, `utils/dragSession.ts`): one press on a bar, from mousedown to mouseup, and every decision it makes: whether a body press is a click or a drag (4px on either axis; a handle press drags at once), which day the pointer is on, and what the release writes (nothing when the dates did not change). Refuses to start on a grid that measures no width. `DragHandler` is its DOM adapter.

**Daily note**: the note for one date, located via another plugin's folder and format settings. Looked up only through `DailyNotes.get(year, month, day)` (0-based month); no caller builds the `YYYY-MM-DD` key.

**View range** (`ViewRange`, `utils/viewRange.ts`): what one calendar shows. A plain value a host builds: a **year** (12 rows, one per month; carries the layout, horizontal or vertical, and the align mode) or a **day window**. `resolveRange` answers every per-range question: its rows and the cells each holds, its `first` and `last` day (what the data source is asked for), its bar layout, and where a date sits (`locate`). Renderers ask it instead of branching on the kind.

**Day window**: a run of consecutive days (`DayWindow`: a start and a count) drawn as a single row, crossing months and years. A first of a month after the row's first column is labelled "M/1".

**Row** / **lane**: a row is one line of a view range (a month in the year view, the whole window in a strip), indexed from 0; `DaySpan.row` names it. A lane is a bar's stacking position inside its row (`Placement.lane`), capped per layout.

**Rolling strip** (`mountRollingStrip`): a 30-day day-window embed of the calendar, mounted by `obsidian-lhak-dashboard`, starting today and paged by 30 days. Implemented by `RollingStrip` (`view/RollingStrip.ts`), a sibling host to `LinearCalendarView` with its own resize policy (ADR-0001). Replaced the single-month month strip (68da6f5).
