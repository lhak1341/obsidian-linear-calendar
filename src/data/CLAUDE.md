# Data layer

## Obsidian tag format (API gotcha)

- `frontmatter.tags` — no `#` prefix: `"linear-calendar/work"`
- `cache.tags[].tag` — has `#` prefix: `"#linear-calendar/work"`

Check both when gating on tags (see FrontmatterScanner.ts).

## metadataCache.on("changed") callback shape

- Signature is `(file: TFile, data, oldData)` — always capture the `TFile` arg; `() => handler()` silently discards it and defeats file-level filtering.
- Use `source.hasCalendarEntry(file.path)` to fast-path known calendar files; fall back to tag inspection for new files not yet in cache.

## FrontmatterScanner cache management (concrete type only)

- `evictFile(path)` — O(1) deletion; call from Plugin vault `delete` and `rename` handlers in `main.ts`
- `invalidateMapping()` — bumps generation counter + clears cache; call from `saveSettings()` before `view.refresh()`
- Neither method is on the DataSource interface — callers must hold a FrontmatterScanner reference
