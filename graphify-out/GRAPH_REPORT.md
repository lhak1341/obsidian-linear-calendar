# Graph Report - .  (2026-08-14)

## Corpus Check
- 47 files · ~117,986 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 357 nodes · 749 edges · 18 communities (16 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 85,205 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 30 edges
2. `CalendarItem` - 20 edges
3. `ColumnMapping` - 20 edges
4. `CalendarRenderer` - 19 edges
5. `DragHandler` - 18 edges
6. `LinearCalendarPlugin` - 17 edges
7. `LinearCalendarSettingTab` - 16 edges
8. `GridRenderer` - 16 edges
9. `DataSource` - 14 edges
10. `BarRenderer` - 14 edges

## Surprising Connections (you probably didn't know these)
- `getCalendarData(year)` --references--> `LinearCalendarPlugin`  [EXTRACTED]
  CLAUDE.md → src/main.ts
- `DragAttacher (rejected seam interface)` --references--> `BarRenderer`  [INFERRED]
  docs/adr/0002-no-dragattacher-seam.md → src/view/BarRenderer.ts
- `createCalendarWidget() (rejected factory)` --references--> `CalendarRenderer`  [INFERRED]
  docs/adr/0001-no-calendar-widget-factory.md → src/view/CalendarRenderer.ts
- `obsidian-linear-calendar CLAUDE.md` --references--> `LinearCalendarPlugin`  [EXTRACTED]
  CLAUDE.md → src/main.ts
- `mountMonthStrip()` --calls--> `CalendarRenderer`  [EXTRACTED]
  CLAUDE.md → src/view/CalendarRenderer.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CalendarRenderer constructed directly by both callers (no shared factory)** — src_main_mountmonthstrip, src_view_linearcalendarview_linearcalendarview, src_view_calendarrenderer_calendarrenderer, docs_adr_0001_no_calendar_widget_factory_createcalendarwidget [INFERRED 0.85]
- **onDropCommit callback signature threaded through 4 files** — src_view_draghandler_ondropcommit, src_view_barrenderer_barrenderer, src_view_calendarrenderer_rendercallbacks, src_main_mountmonthstrip, src_view_linearcalendarview_linearcalendarview [EXTRACTED 1.00]
- **Pure-logic extraction to src/utils/ for testability outside Obsidian coupling** — src_utils_dragutils, src_utils_rowassignment_assignrowsformonth, src_utils_frontmattermapper_mapfrontmattertoitem, src_utils_iconsearch_rankiconsuggestions [INFERRED 0.85]

## Communities (18 total, 2 thin omitted)

### Community 0 - "Drag Interaction Logic"
Cohesion: 0.10
Nodes (22): No DragAttacher Seam (ADR-0002 decision), DragAttacher (rejected seam interface), One-Adapter Rule, addDays(), computeSegmentPlacement(), findFreeRow(), GhostSeg, mDays() (+14 more)

### Community 1 - "Data Scanning Layer"
Cohesion: 0.09
Nodes (23): src/data CLAUDE.md, DataSource, ScannerCache.evictFile(path), source.hasCalendarEntry(file.path), ScannerCache.invalidateMapping(), ScannerCache, CacheEntry, FrontmatterScanner (+15 more)

### Community 2 - "Repo Overview & Icon Field"
Cohesion: 0.08
Nodes (24): obsidian-linear-calendar CLAUDE.md, bun (build/runtime tool), vitest (test framework), Release GitHub Actions Workflow, obsidian-lhak-dashboard (consuming plugin), Linear Calendar README, IconField, IconFieldOptions (+16 more)

### Community 3 - "Build Toolchain Dependencies"
Cohesion: 0.06
Nodes (35): builtin-modules, esbuild, eslint, eslint-plugin-obsidianmd, lucide-static, obsidian, description, devDependencies (+27 more)

### Community 4 - "Daily Notes Integration"
Cohesion: 0.12
Nodes (10): addLegacySettingsCompat(), AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins (+2 more)

### Community 5 - "Settings & Constants"
Cohesion: 0.12
Nodes (16): COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, FONT_OPTIONS, AlignMode, DailyNoteStyle, FontChoice, getContrastColor() (+8 more)

### Community 6 - "Month Strip & Tag Utils"
Cohesion: 0.13
Nodes (10): createCalendarWidget() (rejected factory), No Shared CalendarWidget Factory (ADR-0001 decision), formatDateRange(), formatTagLabel(), BarInfo, CalendarRenderer, CalendarRendererCallbacks, pad() (+2 more)

### Community 7 - "Create Event Modal"
Cohesion: 0.15
Nodes (12): CreateEventModal, pad(), parseInputDate(), toInputDate(), AppWithPlugins, CreateEventOptions, NoteCreator, ObsidianNoteCreator (+4 more)

### Community 8 - "Plugin Entry Point"
Cohesion: 0.21
Nodes (4): LinearCalendarPlugin, LinearCalendarSettingTab, ColumnMapping, buildTagColorMap()

### Community 9 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2018, ES2021.String, src/**/*.ts, compilerOptions, allowJs, importHelpers (+11 more)

### Community 11 - "Plugin Manifest"
Cohesion: 0.25
Nodes (7): author, description, id, isDesktopOnly, minAppVersion, name, version

### Community 12 - "Lucide Icon Sync Script"
Cohesion: 0.33
Nodes (4): allTags, files, svgs, tags

### Community 13 - "Deploy Script"
Cohesion: 0.40
Nodes (3): OPTIONAL, REQUIRED, targets

## Ambiguous Edges - Review These
- `CalendarRenderer.renderCalendar()` → `onCategoryToggle handler`  [AMBIGUOUS]
  src/view/CLAUDE.md · relation: references

## Knowledge Gaps
- **73 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CalendarRenderer.renderCalendar()` and `onCategoryToggle handler`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `LinearCalendarView` connect `Daily Notes Integration` to `Data Scanning Layer`, `Repo Overview & Icon Field`, `Month Strip & Tag Utils`, `Create Event Modal`, `Plugin Entry Point`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `CalendarRenderer` connect `Month Strip & Tag Utils` to `Drag Interaction Logic`, `Data Scanning Layer`, `Repo Overview & Icon Field`, `Daily Notes Integration`, `Settings & Constants`, `Create Event Modal`, `Now Indicator`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `BarRenderer` connect `Drag Interaction Logic` to `Month Strip & Tag Utils`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Drag Interaction Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.09898989898989899 - nodes in this community are weakly interconnected._
- **Should `Data Scanning Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.09291521486643438 - nodes in this community are weakly interconnected._