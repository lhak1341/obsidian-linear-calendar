# Graph Report - obsidian-linear-calendar  (2026-08-14)

## Corpus Check
- 45 files · ~117,442 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 371 nodes · 698 edges · 43 communities (36 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a752ce94`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Core Data & Constants
- Drag & Layout Utilities
- View Lifecycle
- Grid Rendering & Interactions
- lucide-icons.ts
- Bar Rendering & Temporal Segmentation
- Settings Interface
- Daily Notes Integration
- Main Plugin Lifecycle
- Tooltip Feedback
- sync-lucide-icons.mjs
- Calendar Component Coordinator
- Test Configuration
- Settings Tab (Semantic)
- Plugin Settings (Semantic)
- 0001-no-calendar-widget-factory.md
- 0002-no-dragattacher-seam.md
- manifest.json
- obsidian-linear-calendar
- MonthStripHandle
- FrontmatterScanner cache management (concrete type only)
- RowAssignment
- GhostSeg
- RowOccupancy

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 26 edges
2. `CalendarItem` - 20 edges
3. `ColumnMapping` - 20 edges
4. `LinearCalendarSettingTab` - 16 edges
5. `GridRenderer` - 16 edges
6. `LinearCalendarPlugin` - 15 edges
7. `CalendarRenderer` - 15 edges
8. `DragHandler` - 15 edges
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
- **Rendering Pipeline** — src_view_calendarrenderer_calendarrenderer, src_view_gridrenderer_gridrenderer, src_view_barrenderer_barrenderer, src_view_nowindicator_nowindicator, src_view_tooltip_tooltip [EXTRACTED 1.00]
- **Data Scanning Flow** — src_data_frontmatterscanner_frontmatterscanner, src_data_datasource_datasource, src_main_linearcalendarplugin [EXTRACTED 1.00]

## Communities (43 total, 7 thin omitted)

### Community 0 - "Core Data & Constants"
Cohesion: 0.10
Nodes (9): AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins, ObsidianPlugins (+1 more)

### Community 1 - "Drag & Layout Utilities"
Cohesion: 0.11
Nodes (22): COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, DataSource, ScannerCache, CacheEntry, FrontmatterScanner, FONT_OPTIONS (+14 more)

### Community 2 - "View Lifecycle"
Cohesion: 0.09
Nodes (21): getContrastColor(), addDays(), computeSegmentPlacement(), findFreeRow(), GhostSeg, mDays(), newDatesFromDelta(), RowOccupancy (+13 more)

### Community 3 - "Grid Rendering & Interactions"
Cohesion: 0.16
Nodes (10): AlignMode, DailyNoteStyle, computeSolidColor(), computeTint(), GridRenderCallbacks, GridRenderer, GridRenderOptions, MONTH_NAMES (+2 more)

### Community 4 - "lucide-icons.ts"
Cohesion: 0.20
Nodes (8): IconSuggest, allLucideIconNames(), gapNames, getLucideIconTags(), nativeNames, registerLucideIcons(), scaleToCustomIconViewport(), rankIconSuggestions()

### Community 5 - "Bar Rendering & Temporal Segmentation"
Cohesion: 0.16
Nodes (11): CreateEventModal, pad(), parseInputDate(), toInputDate(), AppWithPlugins, CreateEventOptions, NoteCreator, ObsidianNoteCreator (+3 more)

### Community 6 - "Settings Interface"
Cohesion: 0.06
Nodes (35): builtin-modules, esbuild, eslint, eslint-plugin-obsidianmd, lucide-static, obsidian, description, devDependencies (+27 more)

### Community 8 - "Daily Notes Integration"
Cohesion: 0.23
Nodes (3): resolveLucideIconId(), LinearCalendarPlugin, LinearCalendarSettingTab

### Community 9 - "Main Plugin Lifecycle"
Cohesion: 0.18
Nodes (8): dayOfYear(), daysInYear(), formatDateRange(), isLeapYear(), monthBoundaries(), formatTagLabel(), BarInfo, Tooltip

### Community 10 - "Tooltip Feedback"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2018, ES2021.String, src/**/*.ts, compilerOptions, allowJs, importHelpers (+11 more)

### Community 11 - "sync-lucide-icons.mjs"
Cohesion: 0.33
Nodes (4): allTags, files, svgs, tags

### Community 12 - "Calendar Component Coordinator"
Cohesion: 0.40
Nodes (3): OPTIONAL, REQUIRED, targets

### Community 14 - "Test Configuration"
Cohesion: 0.29
Nodes (6): Category toggle re-render scope, Reading CSS-driven visibility in event handlers, ResizeObserver — LinearCalendarView vs mountMonthStrip, Tracking a CSS grid column with a positioned overlay, Verifying drag behavior (ADR-0002: untestable in vitest), View layer

### Community 15 - "Settings Tab (Semantic)"
Cohesion: 0.29
Nodes (6): Cache lifecycle (ScannerCache interface), Category = tags[0], Data layer, metadataCache.on("changed") callback shape, Obsidian tag format (API gotcha), Stale cache when rapidly recreating a test note

### Community 16 - "Plugin Settings (Semantic)"
Cohesion: 0.33
Nodes (5): Daily note plugin priority, Frontmatter tag format (API gotcha), Moment, Testing, Utils

### Community 19 - "manifest.json"
Cohesion: 0.25
Nodes (7): author, description, id, isDesktopOnly, minAppVersion, name, version

### Community 21 - "obsidian-linear-calendar"
Cohesion: 0.17
Nodes (10): obsidian-linear-calendar, Public API, Rendering, Testing, Development, Features, Installation, License (+2 more)

## Knowledge Gaps
- **98 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Core Data & Constants` to `Drag & Layout Utilities`, `Bar Rendering & Temporal Segmentation`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `CalendarRenderer` connect `Drag & Layout Utilities` to `Core Data & Constants`, `Main Plugin Lifecycle`, `View Lifecycle`, `Grid Rendering & Interactions`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `GridRenderer` connect `Grid Rendering & Interactions` to `Drag & Layout Utilities`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Data & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
- **Should `Drag & Layout Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.11139455782312925 - nodes in this community are weakly interconnected._
- **Should `View Lifecycle` be split into smaller, more focused modules?**
  _Cohesion score 0.08941176470588236 - nodes in this community are weakly interconnected._