# No DragAttacher seam between BarRenderer and DragHandler

`BarRenderer` constructs `DragHandler` internally. Introducing a `DragAttacher` interface and injecting it was considered to enable unit testing of `BarRenderer.render()` without drag wiring.

We decided against it because the seam does not unlock testability. `BarRenderer.render()` calls `rowRef.barsContainer.createDiv()` — an Obsidian-extended DOM method absent from jsdom. Even with a `NullDragAttacher` injected, `render()` cannot run in vitest. The DOM coupling is the binding constraint, not `DragHandler`. Manual testing in the vault is the right surface for `BarRenderer` (consistent with the project convention that Obsidian-coupled code lives outside `src/utils/` and is not unit tested).

The one-adapter rule also applies: `DragHandler` has no second adapter (no touch-drag implementation, no test fake that does real work). A seam with one adapter is hypothetical — the interface adds complexity without leverage. If a second adapter appears, revisit.

The real testability move was extracting `assignRowsForMonth` to `src/utils/rowAssignment.ts` — pure interval-scheduling logic with no DOM dependency, following the same pattern as `dragUtils.ts`.

## Addendum: the pure side deepened

`assignRowsForMonth` (`rowAssignment.ts`), `segmentByMonth.ts` and the ghost helpers in `dragUtils.ts` were merged into `src/utils/barLayout.ts` (`layoutBars`, `previewMove`, `gridArea`). It is the same move this ADR endorsed, taken further: bars and drag ghosts now share one splitter and one row cap. `DragHandler` is still constructed by `BarRenderer` and still owns all DOM; no seam was added.
