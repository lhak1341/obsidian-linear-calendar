# Graph Report - obsidian-linear-calendar  (2026-10-20)

## Corpus Check
- 57 files · ~126,275 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 507 nodes · 1004 edges · 57 communities (36 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a72964a`
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
- obsidian-stub.ts
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
- src root (main.ts, settings.ts, NoteCreator.ts, icon files)
- CalendarRenderer
- dateUtils.ts

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 28 edges
2. `CalendarItem` - 22 edges
3. `LinearCalendarSettingTab` - 17 edges
4. `DragHandler` - 17 edges
5. `CalendarRenderer` - 16 edges
6. `GridRenderer` - 16 edges
7. `LinearCalendarPlugin` - 15 edges
8. `PluginSettings` - 15 edges
9. `MonthRowRef` - 15 edges
10. `View layer` - 15 edges

## Surprising Connections (you probably didn't know these)
- `LinearCalendarPlugin` --references--> `DailyNotes`  [EXTRACTED]
  src/main.ts → src/DailyNotes.ts
- `LinearCalendarView` --references--> `DailyNotes`  [EXTRACTED]
  src/view/LinearCalendarView.ts → src/DailyNotes.ts
- `CreateOptions` --inherits--> `EventFields`  [EXTRACTED]
  src/EventNotes.ts → src/eventFields.ts
- `LinearCalendarView` --references--> `EventNotes`  [EXTRACTED]
  src/view/LinearCalendarView.ts → src/EventNotes.ts
- `LinearCalendarPlugin` --references--> `ObsidianEventNotes`  [EXTRACTED]
  src/main.ts → src/EventNotes.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CalendarRenderer constructed directly by both callers (no shared factory)** — src_main_mountmonthstrip, src_view_linearcalendarview_linearcalendarview, src_view_calendarrenderer_calendarrenderer, docs_adr_0001_no_calendar_widget_factory_createcalendarwidget [INFERRED 0.85]
- **onDropCommit callback signature threaded through 4 files** — src_view_draghandler_ondropcommit, src_view_barrenderer_barrenderer, src_view_calendarrenderer_rendercallbacks, src_main_mountmonthstrip, src_view_linearcalendarview_linearcalendarview [EXTRACTED 1.00]

## Communities (57 total, 21 thin omitted)

### Community 0 - "Drag Interaction Logic"
Cohesion: 0.08
Nodes (19): DropCommitFn, BarLayout, DaySpan, GhostPlacement, gridArea(), layoutBars(), MonthSegment, MovePreview (+11 more)

### Community 1 - "Data Scanning Layer"
Cohesion: 0.10
Nodes (29): COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, DailyNotes, DataSource, FONT_OPTIONS, AlignMode, CalendarItem (+21 more)

### Community 2 - "Repo Overview & Icon Field"
Cohesion: 0.17
Nodes (11): IconField, IconFieldOptions, IconSuggest, allLucideIconNames(), gapNames, getLucideIconTags(), nativeNames, registerLucideIcons() (+3 more)

### Community 3 - "Build Toolchain Dependencies"
Cohesion: 0.05
Nodes (40): builtin-modules, esbuild, eslint, eslint-plugin-obsidianmd, lucide-static, moment, obsidian, description (+32 more)

### Community 5 - "Settings & Constants"
Cohesion: 0.26
Nodes (4): daysInMonth(), computeSolidColor(), computeTint(), GridRenderer

### Community 6 - "Month Strip & Tag Utils"
Cohesion: 0.18
Nodes (16): CacheEntry, FrontmatterScanner, applyFields(), Frontmatter, readEventFields(), ColumnMapping, RawCalendarItem, formatISODate() (+8 more)

### Community 7 - "obsidian-stub.ts"
Cohesion: 0.08
Nodes (14): AppInternal, CoreDailyNoteOptions, DailyPluginSettings, getDailyNoteSettings(), MomentAt, MomentLike, ObsidianInternalPlugins, ObsidianPlugins (+6 more)

### Community 8 - "Plugin Entry Point"
Cohesion: 0.23
Nodes (3): LinearCalendarPlugin, LinearCalendarSettingTab, FontChoice

### Community 9 - "TypeScript Config"
Cohesion: 0.09
Nodes (21): DOM, DOM.Iterable, ES2018, ES2021.String, src/**/*.ts, test/**/*.ts, compilerOptions, allowJs (+13 more)

### Community 10 - "Now Indicator"
Cohesion: 0.11
Nodes (22): ADR-0001, CreateEventModal, pad(), parseInputDate(), toInputDate(), EventFields, AppWithPlugins, CreateOptions (+14 more)

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
Cohesion: 0.22
Nodes (7): obsidian-linear-calendar, Development, Features, Installation, License, Linear Calendar, Usage

### Community 19 - "Reminder feature — spec"
Cohesion: 0.22
Nodes (8): Click / promote behavior, Data model, Motivation, Open implementation details (not decisions, just need care during build), Out of scope, Reminder feature — spec, Rendering, UI scope

### Community 20 - "Data layer"
Cohesion: 0.25
Nodes (7): Cache lifecycle, Category = tags[0], Change detection (DataSource.onChange), Data layer, Obsidian tag format (API gotcha), One note, multiple items, processFrontMatter() write/read race

### Community 21 - "View layer"
Cohesion: 0.12
Nodes (15): Bar/chip colors, Bar placement lives in `utils/barLayout.ts`, Category toggle re-render scope, Filling a cell with a dynamic background, Live-testing the view via `obsidian eval`, Note-mutating callbacks, Reading CSS-driven visibility in event handlers, ResizeObserver — LinearCalendarView vs mountMonthStrip (+7 more)

### Community 22 - "Issue tracker: GitHub"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 23 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 24 - "Utils"
Cohesion: 0.29
Nodes (6): Daily note plugin priority, Frontmatter tag format (API gotcha), Moment, Reuse existing frontmatter/date helpers, Testing, Utils

### Community 54 - "src root (main.ts, settings.ts, NoteCreator.ts, icon files)"
Cohesion: 0.29
Nodes (6): Daily notes, Icons, Note creation, Public API — coordinated with obsidian-lhak-dashboard, Settings modal, src root (main.ts, settings.ts, EventNotes.ts, icon files)

### Community 56 - "dateUtils.ts"
Cohesion: 0.13
Nodes (15): ageOn(), expandForYear(), addMonthsClamped(), carryDateForward(), dayOfYear(), daysBetween(), daysInYear(), formatDateRange() (+7 more)

## Knowledge Gaps
- **148 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Daily Notes Integration` to `Data Scanning Layer`, `Now Indicator`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `DailyNotes` connect `Data Scanning Layer` to `Plugin Entry Point`, `Daily Notes Integration`, `obsidian-stub.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _148 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Drag Interaction Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.07918367346938776 - nodes in this community are weakly interconnected._
- **Should `Data Scanning Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.103424178895877 - nodes in this community are weakly interconnected._
- **Should `Build Toolchain Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `obsidian-stub.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07881773399014778 - nodes in this community are weakly interconnected._