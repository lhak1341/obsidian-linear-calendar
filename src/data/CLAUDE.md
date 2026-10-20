# Data layer

## Obsidian tag format (API gotcha)

Dual-prefix tag gating (`frontmatter.tags` vs `cache.tags[].tag`) — see `utils/CLAUDE.md`. The gate check itself lives in `frontmatterMapper.ts`; `FrontmatterScanner.processFile` only extracts raw tags and delegates.

## Change detection (DataSource.onChange)

- `FrontmatterScanner` owns it: it registers its own `metadataCache` "changed" and vault `delete`/`rename` listeners (via the `Component` passed to its constructor) and tells subscribers through `onChange(cb)`, debounced 300ms, no arguments. Hosts repaint by calling `scan` again; `LinearCalendarView` and `mountMonthStrip` both subscribe.
- It emits only for calendar notes: a "changed" file that is a known entry (so a note losing its gate tag still counts) or carries the gate tag now, and a delete or rename of a known entry. Vault `create` is not listened to — a new calendar note triggers "changed" once indexed.
- The "changed" callback signature is `(file: TFile, data, oldData)` — always capture the `TFile` arg; `() => handler()` silently discards it and defeats file-level filtering.
- Daily-note changes are not item change: `DailyNotes` (`src/DailyNotes.ts`) has its own `onChange`, and both hosts subscribe to it as well.

## Category = tags[0]

Defined in `utils/category.ts` (`categoryOf`) — the first `linear-calendar/*` subtag surviving the filter in `mapFrontmatterToItem()`. When writing tags programmatically, put the desired category subtag first in the array.

## processFrontMatter() write/read race

`app.fileManager.processFrontMatter()`'s promise resolves once the write hits disk, but `metadataCache` re-parses the frontmatter asynchronously after that — a `getFileCache()` read (or a scan/render) right after the await can still see the pre-write frontmatter, and a scan in that window caches the stale read under the new mtime. The scanner therefore drops a file's entry on every "changed" event, and on delete/rename.

A fake `App` models Obsidian's cache timing by guess: two bugs (an `update` that returned before the cache refreshed, a cached-empty note) only showed in a live check on `lhakZettel`. Live-check anything touching `metadataCache`/`processFrontMatter` timing before calling it done.

Every `EventNotes` verb (`EventNotes.ts`) handles this itself: after its write it waits (`settle`) until the cached frontmatter reflects what it wrote, or 2s elapses. The wait checks the cache first and compares content, so it neither misses an event that fired early nor mistakes a create's empty-file indexing for the write. Callers re-render on completion and need no ambient listener. A new write path goes through `EventNotes`; a raw `processFrontMatter` elsewhere reintroduces the race.

## One note, multiple items

`processFile()` can return more than one `CalendarItem` for a single note: the real item, plus a synthetic reminder ghost (`deriveReminderItem()` in `frontmatterMapper.ts`) when the note also has `remindProp` set. `CacheEntry.items` is an array for exactly this reason — don't assume 1:1 file-to-item.

## Cache lifecycle

The scanner keys its cache on the mapping it was last given (`JSON.stringify(mapping)`), so a changed mapping empties it on the next `scan` — nothing calls an invalidate on settings save. Eviction on delete/rename is internal. `DataSource` is just `scan` + `onChange`.
