# Data layer

## Obsidian tag format (API gotcha)

- `frontmatter.tags` — no `#` prefix: `"linear-calendar/work"`
- `cache.tags[].tag` — has `#` prefix: `"#linear-calendar/work"`

Check both when gating on tags (see FrontmatterScanner.ts).

## metadataCache.on("changed") callback shape

- Signature is `(file: TFile, data, oldData)` — always capture the `TFile` arg; `() => handler()` silently discards it and defeats file-level filtering.
- Use `source.hasCalendarEntry(file.path)` to fast-path known calendar files; fall back to tag inspection for new files not yet in cache.

## Category = tags[0]

Category comes from the first `linear-calendar/*` subtag surviving the filter in `processFile()` — when writing tags programmatically, put the desired category subtag first in the array.

## Cache lifecycle (ScannerCache interface)

- `evictFile(path)` — O(1) deletion; call from Plugin vault `delete` and `rename` handlers in `main.ts`
- `invalidateMapping()` — bumps generation counter + clears cache; call from `saveSettings()` before `view.refresh()`
- Both methods live on `ScannerCache` (`DataSource.ts`), separate from `DataSource` itself — `main.ts` depends on `DataSource & ScannerCache`; `LinearCalendarView`/`CalendarRenderer` only need plain `DataSource` since they never touch cache lifecycle
