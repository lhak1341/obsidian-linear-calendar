# Graph Report - obsidian-linear-calendar  (2026-08-21)

## Corpus Check
- 49 files · ~121,726 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 426 nodes · 773 edges · 54 communities (34 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a7008bf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Drag Interaction Logic
- Data Scanning Layer
- Repo Overview & Icon Field
- Build Toolchain Dependencies
- Daily Notes Integration
- Settings & Constants
- Month Strip & Tag Utils
- Create Event Modal
- Plugin Entry Point
- TypeScript Config
- Now Indicator
- Plugin Manifest
- Lucide Icon Sync Script
- Deploy Script
- Calendar Render Methods
- Linear Calendar
- Reminder feature — spec
- Data layer
- View layer
- Issue tracker: GitHub
- Domain Docs
- Utils
- MonthStripHandle
- bun (build/runtime tool)
- 0001-no-calendar-widget-factory.md
- 0002-no-dragattacher-seam.md
- vitest (test framework)
- createCalendarWidget() (rejected factory)
- No Shared CalendarWidget Factory (ADR-0001 decision)
- No DragAttacher Seam (ADR-0002 decision)
- DragAttacher (rejected seam interface)
- One-Adapter Rule
- obsidian-lhak-dashboard (consuming plugin)
- ScannerCache.evictFile(path)
- source.hasCalendarEntry(file.path)
- FrontmatterScanner.processFile
- getCalendarData(year)
- BarRenderer constructor onDropCommit param
- CalendarRenderer.RenderCallbacks interface
- DragHandler.onDropCommit callback

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 28 edges
2. `CalendarItem` - 25 edges
3. `ColumnMapping` - 20 edges
4. `LinearCalendarSettingTab` - 16 edges
5. `DragHandler` - 16 edges
6. `GridRenderer` - 16 edges
7. `LinearCalendarPlugin` - 15 edges
8. `CalendarRenderer` - 15 edges
9. `PluginSettings` - 13 edges
10. `MonthRowRef` - 13 edges

## Surprising Connections (you probably didn't know these)
- `LinearCalendarView` --references--> `NoteCreator`  [EXTRACTED]
  src/view/LinearCalendarView.ts → src/NoteCreator.ts
- `LinearCalendarPlugin` --references--> `ObsidianNoteCreator`  [EXTRACTED]
  src/main.ts → src/NoteCreator.ts
- `LinearCalendarPlugin` --references--> `DataSource`  [EXTRACTED]
  src/main.ts → src/data/DataSource.ts
- `LinearCalendarView` --references--> `DataSource`  [EXTRACTED]
  src/view/LinearCalendarView.ts → src/data/DataSource.ts
- `LinearCalendarPlugin` --references--> `ScannerCache`  [EXTRACTED]
  src/main.ts → src/data/DataSource.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CalendarRenderer constructed directly by both callers (no shared factory)** — src_main_mountmonthstrip, src_view_linearcalendarview_linearcalendarview, src_view_calendarrenderer_calendarrenderer, docs_adr_0001_no_calendar_widget_factory_createcalendarwidget [INFERRED 0.85]
- **onDropCommit callback signature threaded through 4 files** — src_view_draghandler_ondropcommit, src_view_barrenderer_barrenderer, src_view_calendarrenderer_rendercallbacks, src_main_mountmonthstrip, src_view_linearcalendarview_linearcalendarview [EXTRACTED 1.00]
- **Pure-logic extraction to src/utils/ for testability outside Obsidian coupling** — src_utils_dragutils, src_utils_rowassignment_assignrowsformonth, src_utils_frontmattermapper_mapfrontmattertoitem, src_utils_iconsearch_rankiconsuggestions [INFERRED 0.85]

## Communities (54 total, 20 thin omitted)

### Community 0 - "Drag Interaction Logic"
Cohesion: 0.09
Nodes (21): getContrastColor(), addDays(), computeSegmentPlacement(), findFreeRow(), GhostSeg, mDays(), newDatesFromDelta(), RowOccupancy (+13 more)

### Community 1 - "Data Scanning Layer"
Cohesion: 0.10
Nodes (26): COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, DataSource, ScannerCache, CacheEntry, FrontmatterScanner, FONT_OPTIONS (+18 more)

### Community 2 - "Repo Overview & Icon Field"
Cohesion: 0.17
Nodes (11): IconField, IconFieldOptions, IconSuggest, allLucideIconNames(), gapNames, getLucideIconTags(), nativeNames, registerLucideIcons() (+3 more)

### Community 3 - "Build Toolchain Dependencies"
Cohesion: 0.06
Nodes (35): builtin-modules, esbuild, eslint, eslint-plugin-obsidianmd, lucide-static, obsidian, description, devDependencies (+27 more)

### Community 4 - "Daily Notes Integration"
Cohesion: 0.12
Nodes (9): AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins, ObsidianPlugins (+1 more)

### Community 5 - "Settings & Constants"
Cohesion: 0.16
Nodes (9): DailyNoteStyle, computeSolidColor(), computeTint(), GridRenderCallbacks, GridRenderer, GridRenderOptions, MONTH_NAMES, WEEKDAY_ABBR (+1 more)

### Community 6 - "Month Strip & Tag Utils"
Cohesion: 0.25
Nodes (4): formatDateRange(), formatTagLabel(), BarInfo, Tooltip

### Community 7 - "Create Event Modal"
Cohesion: 0.26
Nodes (5): CreateEventModal, pad(), parseInputDate(), toInputDate(), NoteCreator

### Community 9 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2018, ES2021.String, src/**/*.ts, compilerOptions, allowJs, importHelpers (+11 more)

### Community 10 - "Now Indicator"
Cohesion: 0.18
Nodes (15): AppWithPlugins, CreateEventOptions, ObsidianNoteCreator, TemplaterPlugin, waitForMetadataChange(), write_template_to_file(), addMonthsClamped(), dayOfYear() (+7 more)

### Community 11 - "Plugin Manifest"
Cohesion: 0.25
Nodes (7): author, description, id, isDesktopOnly, minAppVersion, name, version

### Community 12 - "Lucide Icon Sync Script"
Cohesion: 0.33
Nodes (4): allTags, files, svgs, tags

### Community 13 - "Deploy Script"
Cohesion: 0.40
Nodes (3): OPTIONAL, REQUIRED, targets

### Community 18 - "Linear Calendar"
Cohesion: 0.13
Nodes (13): Agent skills, Domain docs, Issue tracker, obsidian-linear-calendar, Public API, Rendering, Testing, Development (+5 more)

### Community 19 - "Reminder feature — spec"
Cohesion: 0.22
Nodes (8): Click / promote behavior, Data model, Motivation, Open implementation details (not decisions, just need care during build), Out of scope, Reminder feature — spec, Rendering, UI scope

### Community 20 - "Data layer"
Cohesion: 0.22
Nodes (8): Cache lifecycle (ScannerCache interface), Category = tags[0], Data layer, metadataCache.on("changed") callback shape, Obsidian tag format (API gotcha), One note, multiple items, processFrontMatter() write/read race, Stale cache when rapidly recreating a test note

### Community 21 - "View layer"
Cohesion: 0.22
Nodes (8): Category toggle re-render scope, onDropCommit signature is threaded through 4 files, Reading CSS-driven visibility in event handlers, ResizeObserver — LinearCalendarView vs mountMonthStrip, Testing mountMonthStrip for a specific month without faking the date, Tracking a CSS grid column with a positioned overlay, Verifying drag behavior (ADR-0002: untestable in vitest), View layer

### Community 22 - "Issue tracker: GitHub"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 23 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 24 - "Utils"
Cohesion: 0.33
Nodes (5): Daily note plugin priority, Frontmatter tag format (API gotcha), Moment, Testing, Utils

## Knowledge Gaps
- **128 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Daily Notes Integration` to `Data Scanning Layer`, `Create Event Modal`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `CalendarRenderer` connect `Data Scanning Layer` to `Drag Interaction Logic`, `Daily Notes Integration`, `Settings & Constants`, `Month Strip & Tag Utils`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `CalendarItem` connect `Data Scanning Layer` to `Drag Interaction Logic`, `Daily Notes Integration`, `Month Strip & Tag Utils`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Drag Interaction Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.09019607843137255 - nodes in this community are weakly interconnected._
- **Should `Data Scanning Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.09837092731829573 - nodes in this community are weakly interconnected._
- **Should `Build Toolchain Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._