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

## Verifying drag behavior (ADR-0002: untestable in vitest)

- Simulate a real drag with `obsidian-cli dev:cdp method=Input.dispatchMouseEvent params='{"type":"mousePressed"|"mouseMoved"|"mouseReleased", "x":.., "y":.., "button":"left", "buttons":1}'` — a `mousePressed` then `mouseMoved` past the 4px threshold then `mouseReleased`, coordinates from the bar's `getBoundingClientRect()`
- Check `dev:errors` after release, and re-read the note's frontmatter to confirm the committed dates

## ResizeObserver — LinearCalendarView vs mountMonthStrip

- LinearCalendarView has no ResizeObserver: CSS grid `1fr` columns adapt to container resize natively — no JS re-render needed. Adding one causes a full 372-node rebuild on every panel resize.
- `mountMonthStrip` in main.ts legitimately uses ResizeObserver because it renders a single fixed-month strip whose width is dynamically constrained by an external host view.

## onDropCommit signature is threaded through 4 files

`DragHandler`'s `onDropCommit` callback type is independently redeclared in `BarRenderer`'s constructor param and `CalendarRenderer`'s `RenderCallbacks` interface, then satisfied at two call sites (`main.ts`'s `mountMonthStrip`, `LinearCalendarView.ts`). Changing its signature means updating all 4 — TypeScript won't catch a stale callback type in the middle of the chain if the outer two still structurally match.

## Testing mountMonthStrip for a specific month without faking the date

`mountMonthStrip` always starts on the current month, but its returned handle exposes `next()`/`prev()`/`today()`. Mount a throwaway instance via `eval` (append a scratch div, call `plugin.mountMonthStrip(containerEl, catsEl)`, keep the handle on `window`), then call `.next()`/`.prev()` to walk to any month for inspection — call `.destroy()` and remove the div when done. Avoids needing a real date in a short month to test short-month-specific rendering.
