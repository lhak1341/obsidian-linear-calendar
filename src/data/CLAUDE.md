# Data layer

## Obsidian tag format (API gotcha)

Dual-prefix tag gating (`frontmatter.tags` vs `cache.tags[].tag`) — see `utils/CLAUDE.md`. The gate check itself lives in `frontmatterMapper.ts`; `FrontmatterScanner.processFile` only extracts raw tags and delegates.

## metadataCache.on("changed") callback shape

- Signature is `(file: TFile, data, oldData)` — always capture the `TFile` arg; `() => handler()` silently discards it and defeats file-level filtering.
- Use `source.hasCalendarEntry(file.path)` to fast-path known calendar files; fall back to tag inspection for new files not yet in cache.

## Category = tags[0]

Category comes from the first `linear-calendar/*` subtag surviving the filter in `mapFrontmatterToItem()` (`utils/frontmatterMapper.ts`) — when writing tags programmatically, put the desired category subtag first in the array.

## Stale cache when rapidly recreating a test note

- Deleting + recreating a fixture note at the same path in quick succession (e.g. scripted manual tests) can leave a stale `item: null` cached under the old mtime — if a freshly created note isn't showing up in `scan()`, call `scanner.invalidateMapping()` before assuming a bug

## Cache lifecycle (ScannerCache interface)

- `evictFile(path)` — O(1) deletion; call from Plugin vault `delete` and `rename` handlers in `main.ts`
- `invalidateMapping()` — clears cache; call from `saveSettings()` before `view.refresh()`
- Both methods live on `ScannerCache` (`DataSource.ts`), separate from `DataSource` itself — `main.ts` depends on `DataSource & ScannerCache`; `LinearCalendarView`/`CalendarRenderer` only need plain `DataSource` since they never touch cache lifecycle
