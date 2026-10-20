# View layer

## Bar placement lives in `utils/barLayout.ts`

`BarRenderer` and `DragHandler` do no geometry. `layoutBars(items, year, maxRows)` splits items into month segments and packs rows; `BarRenderer` reads `placementsFor(month)` and hands the same `BarLayout` to `DragHandler.setLayout`, whose `previewMove` places drag ghosts in the first free row under the same cap (a ghost with no free row is not drawn, like a bar). `gridArea(span, row, weekdayOffset, layout)` is the only place the CSS-grid column/row strings are built. Items arrive already clamped to the viewed year by `expandForYear`; `splitByMonth` compares calendar days, not timestamps, so a time-of-day at the year's edge cannot empty a span.

## Bar/chip colors

- Set via inline `style.backgroundColor` in JS, not CSS — CSS cannot override them.
  Contrast and theming adaptations happen in JS at render time.

## Sticky headers vs bars

- Sticky headers need `z-index` > 5 — bars sit at `z-index: 5`.

## Filling a cell with a dynamic background

- Put the class on the container itself, or use `position: absolute; inset: 0`.
  `width/height: 100%` on a `<span>` inside a flex column is unreliable.

## Tooltips in cross-plugin embeds

- `setTooltip` does not fire in cross-plugin embeds (`mountMonthStrip`). Use
  `Tooltip.showForChip()` instead — it works anywhere via direct listeners.

## Scoping shared CSS rules

- `@media`/`@container` rules on shared `.lc-*` classes must be scoped to
  `.linear-calendar-container`, or they bleed into dashboard embeds.

## Category toggle re-render scope

- `onCategoryToggle` must call `renderBarsOnly()`, not `renderCalendar()` — `populateDayCell()` never receives `hiddenCategories`, so the day cell DOM is invariant under category filter changes; only bars and chips need rebuilding.
- `CategoryChips`'s `lastSig` guards chip DOM rebuilds — include ALL visual chip properties (color, icon, etc.) in the sig or a change to that property will be silently skipped on re-render

## Tracking a CSS grid column with a positioned overlay

- Don't use `offsetLeft`/`offsetWidth` — values captured at render time go stale when CSS grid reflows on container resize
- Use `left: (colIdx / totalCols) * 100%` and `width: calc(100% / totalCols)` — correct because `repeat(N, 1fr)` makes each column exactly `100%/N` wide
- Set `position: relative` on the grid container parent

## Reading CSS-driven visibility in event handlers

- Use `getComputedStyle(el).display !== "none"` to check actual rendered state including `@container` query results — do not rely on class presence alone, since container queries toggle visibility without touching the DOM

## Verifying drag behavior (ADR-0002: untestable in vitest)

- Simulate a real drag with `obsidian-cli dev:cdp method=Input.dispatchMouseEvent params='{"type":"mousePressed"|"mouseMoved"|"mouseReleased", "x":.., "y":.., "button":"left", "buttons":1}'` — a `mousePressed` then `mouseMoved` past the 4px threshold then `mouseReleased`, coordinates from the bar's `getBoundingClientRect()`
- Check `dev:errors` after release, and re-read the note's frontmatter to confirm the committed dates
- Activate the calendar leaf (`app.workspace.setActiveLeaf(leaf,{focus:true})`) and assert `.lc-days-grid` `clientWidth > 0` immediately before pressing — a hidden leaf (another session shares the app) makes `dayWidth` 0, the delta `Infinity`, and the release writes `Invalid date` to the note
- CDP mouse x clamps to `window.innerWidth`, so keep the drag within the window (a 1-day cross-month move works; a bar at the grid's left edge has no room to drag left, so press at ~80% of the bar's width and move one `dayWidth` left); send `mouseReleased` first if a prior run left the button down, or the next `mousePressed` is swallowed

## ResizeObserver — LinearCalendarView vs mountMonthStrip

- LinearCalendarView has no ResizeObserver: CSS grid `1fr` columns adapt to container resize natively — no JS re-render needed. Adding one causes a full 372-node rebuild on every panel resize.
- `mountMonthStrip` in main.ts legitimately uses ResizeObserver because it renders a single fixed-month strip whose width is dynamically constrained by an external host view.

## Note-mutating callbacks

`onDropCommit`/`onReminderClick`/`onEditNote`/`canEditNote` come from `createInteractions()` (`calendarInteractions.ts`), spread into `CalendarRenderer`'s callbacks by both `LinearCalendarView` and `mountMonthStrip`. They are required (`CalendarRendererCallbacks extends CalendarInteractions`) and `BarRenderer` takes the whole `CalendarInteractions`, so a host that forgets one fails to compile; only `onDayDblClick`/`onDayContextMenu`/`onCategoryToggle` are optional host extras. Add a new one there, not inline in a host; construction and resize policy stay per-host (ADR-0001).

## Testing mountMonthStrip for a specific month without faking the date

`mountMonthStrip` always starts on the current month, but its returned handle exposes `next()`/`prev()`/`today()`. Mount a throwaway instance via `eval` (append a scratch div, call `plugin.mountMonthStrip(containerEl, catsEl)`, keep the handle on `window`), then call `.next()`/`.prev()` to walk to any month for inspection — call `.destroy()` and remove the div when done. Avoids needing a real date in a short month to test short-month-specific rendering.

## Live-testing the view via `obsidian eval`

- After `plugin:reload` the leaf's `view` is a deferred placeholder (no `calendarRenderer`, `getState` or DOM) until `await leaf.loadIfDeferred()`; load it before any `view.*` access below.
- Vault has native menus on, so a context menu has no DOM to read: call the handler directly (`view.calendarRenderer.barRenderer.<fn>`, `view.calendarRenderer.callbacks.<fn>`) instead of dispatching `contextmenu`.
- The view restores its persisted `year` — set it first (`view.setState({...view.getState(), year}, {history:false})`) or DOM counts reflect whatever year was last open.
- Write tests against `lhakZettel` with throwaway notes (`zz` prefix, far-future year ≤ 2068 — its `YYMMDD` formats parse `99` as 1999, so 2099 fixtures are never found) and trash them in `finally`. Create them with `plugin.eventNotes.create(date, { title, openAfterCreate: false })` rather than driving the modal; drive the modal only to test the modal. Assert deltas against a baseline, not totals: the year already holds real bars, and a promoted note with a remind date draws its own ghost.
