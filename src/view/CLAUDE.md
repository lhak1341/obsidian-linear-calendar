# View layer

## Category toggle re-render scope

- `onCategoryToggle` must call `renderBarsOnly()`, not `renderCalendar()` — `populateDayCell()` never receives `hiddenCategories`, so the day cell DOM is invariant under category filter changes; only bars and chips need rebuilding.
- `lastCategoriesSig` in `renderCategories()` guards chip DOM rebuilds — include ALL visual chip properties (color, icon, etc.) in the sig or a change to that property will be silently skipped on re-render

## Tracking a CSS grid column with a positioned overlay

- Don't use `offsetLeft`/`offsetWidth` — values captured at render time go stale when CSS grid reflows on container resize
- Use `left: (colIdx / totalCols) * 100%` and `width: calc(100% / totalCols)` — correct because `repeat(N, 1fr)` makes each column exactly `100%/N` wide
- Set `position: relative` on the grid container parent

## Reading CSS-driven visibility in event handlers

- Use `getComputedStyle(el).display !== "none"` to check actual rendered state including `@container` query results — do not rely on class presence alone, since container queries toggle visibility without touching the DOM

## ResizeObserver — LinearCalendarView vs mountMonthStrip

- LinearCalendarView has no ResizeObserver: CSS grid `1fr` columns adapt to container resize natively — no JS re-render needed. Adding one causes a full 372-node rebuild on every panel resize.
- `mountMonthStrip` in main.ts legitimately uses ResizeObserver because it renders a single fixed-month strip whose width is dynamically constrained by an external host view.
