# Graph Report - obsidian-linear-calendar  (2026-07-27)

## Corpus Check
- 39 files · ~13,983 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 347 nodes · 656 edges · 41 communities (33 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ccea87d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Core Data & Constants
- Drag & Layout Utilities
- View Lifecycle
- Grid Rendering & Interactions
- Bar Rendering & Temporal Segmentation
- Settings Interface
- Daily Notes Integration
- Main Plugin Lifecycle
- Tooltip Feedback
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

## Communities (41 total, 8 thin omitted)

### Community 0 - "Core Data & Constants"
Cohesion: 0.12
Nodes (9): AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins, ObsidianPlugins (+1 more)

### Community 1 - "Drag & Layout Utilities"
Cohesion: 0.13
Nodes (20): COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, DataSource, ScannerCache, CacheEntry, FrontmatterScanner, FONT_OPTIONS (+12 more)

### Community 2 - "View Lifecycle"
Cohesion: 0.10
Nodes (19): getContrastColor(), addDays(), computeSegmentPlacement(), findFreeRow(), GhostSeg, mDays(), newDatesFromDelta(), RowOccupancy (+11 more)

### Community 3 - "Grid Rendering & Interactions"
Cohesion: 0.12
Nodes (12): AlignMode, DailyNoteStyle, computeSolidColor(), computeTint(), GridRenderCallbacks, GridRenderer, GridRenderOptions, MONTH_NAMES (+4 more)

### Community 5 - "Bar Rendering & Temporal Segmentation"
Cohesion: 0.12
Nodes (12): CreateEventModal, pad(), parseInputDate(), toInputDate(), IconSuggest, stripLucidePrefix(), AppWithPlugins, CreateEventOptions (+4 more)

### Community 6 - "Settings Interface"
Cohesion: 0.06
Nodes (31): builtin-modules, esbuild, eslint, eslint-plugin-obsidianmd, obsidian, description, devDependencies, builtin-modules (+23 more)

### Community 9 - "Main Plugin Lifecycle"
Cohesion: 0.18
Nodes (8): dayOfYear(), daysInYear(), formatDateRange(), isLeapYear(), monthBoundaries(), formatTagLabel(), BarInfo, Tooltip

### Community 10 - "Tooltip Feedback"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2018, ES2021.String, src/**/*.ts, compilerOptions, allowJs, importHelpers (+10 more)

### Community 12 - "Calendar Component Coordinator"
Cohesion: 0.33
Nodes (3): CalendarRenderer, CalendarRendererCallbacks, pad()

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
Cohesion: 0.15
Nodes (11): Build & Test, Conventions, graphify, obsidian-linear-calendar, Public API, Development, Features, Installation (+3 more)

## Knowledge Gaps
- **86 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Core Data & Constants` to `Drag & Layout Utilities`, `Calendar Component Coordinator`, `Bar Rendering & Temporal Segmentation`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `CalendarRenderer` connect `Calendar Component Coordinator` to `Core Data & Constants`, `Drag & Layout Utilities`, `View Lifecycle`, `Grid Rendering & Interactions`, `Main Plugin Lifecycle`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `GridRenderer` connect `Grid Rendering & Interactions` to `Drag & Layout Utilities`, `Calendar Component Coordinator`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Data & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.11612903225806452 - nodes in this community are weakly interconnected._
- **Should `Drag & Layout Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.13067552602436322 - nodes in this community are weakly interconnected._
- **Should `View Lifecycle` be split into smaller, more focused modules?**
  _Cohesion score 0.10452961672473868 - nodes in this community are weakly interconnected._