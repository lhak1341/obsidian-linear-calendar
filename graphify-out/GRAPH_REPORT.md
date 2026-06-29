# Graph Report - obsidian-linear-calendar  (2026-06-29)

## Corpus Check
- 30 files · ~11,548 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 239 nodes · 422 edges · 24 communities (14 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c81a3da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Data & Constants|Core Data & Constants]]
- [[_COMMUNITY_Drag & Layout Utilities|Drag & Layout Utilities]]
- [[_COMMUNITY_View Lifecycle|View Lifecycle]]
- [[_COMMUNITY_Grid Rendering & Interactions|Grid Rendering & Interactions]]
- [[_COMMUNITY_Semantic Architecture|Semantic Architecture]]
- [[_COMMUNITY_Bar Rendering & Temporal Segmentation|Bar Rendering & Temporal Segmentation]]
- [[_COMMUNITY_Settings Interface|Settings Interface]]
- [[_COMMUNITY_Date Utilities & Scanning|Date Utilities & Scanning]]
- [[_COMMUNITY_Daily Notes Integration|Daily Notes Integration]]
- [[_COMMUNITY_Main Plugin Lifecycle|Main Plugin Lifecycle]]
- [[_COMMUNITY_Tooltip Feedback|Tooltip Feedback]]
- [[_COMMUNITY_Temporal Markers|Temporal Markers]]
- [[_COMMUNITY_Calendar Component Coordinator|Calendar Component Coordinator]]
- [[_COMMUNITY_Build Configuration|Build Configuration]]
- [[_COMMUNITY_Test Configuration|Test Configuration]]
- [[_COMMUNITY_Settings Tab (Semantic)|Settings Tab (Semantic)]]
- [[_COMMUNITY_Plugin Settings (Semantic)|Plugin Settings (Semantic)]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 22 edges
2. `GridRenderer` - 15 edges
3. `LinearCalendarSettingTab` - 14 edges
4. `DragHandler` - 12 edges
5. `ColumnMapping` - 9 edges
6. `CalendarRenderer` - 9 edges
7. `Tooltip` - 9 edges
8. `BarRenderer` - 9 edges
9. `FrontmatterScanner` - 9 edges
10. `LinearCalendarPlugin` - 8 edges

## Surprising Connections (you probably didn't know these)
- `GridRenderer` --semantically_similar_to--> `BarRenderer`  [INFERRED] [semantically similar]
  src/view/GridRenderer.ts → src/view/BarRenderer.ts
- `CalendarRenderer` --calls--> `GridRenderer`  [EXTRACTED]
  src/view/CalendarRenderer.ts → src/view/GridRenderer.ts
- `CalendarRenderer` --calls--> `NowIndicator`  [EXTRACTED]
  src/view/CalendarRenderer.ts → src/view/NowIndicator.ts
- `CalendarRenderer` --calls--> `Tooltip`  [EXTRACTED]
  src/view/CalendarRenderer.ts → src/view/Tooltip.ts
- `CalendarRenderer` --references--> `DataSource`  [EXTRACTED]
  src/view/CalendarRenderer.ts → src/data/DataSource.ts

## Hyperedges (group relationships)
- **Rendering Pipeline** — calendarrenderer_calendarrenderer, gridrenderer_gridrenderer, barrenderer_barrenderer, nowindicator_nowindicator, tooltip_tooltip [EXTRACTED 1.00]
- **Data Scanning Flow** — frontmatterscanner_frontmatterscanner, datasource_datasource, main_linearcalendarplugin [EXTRACTED 1.00]

## Communities (24 total, 10 thin omitted)

### Community 0 - "Core Data & Constants"
Cohesion: 0.19
Nodes (20): DataSource, CacheEntry, COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, AppWithPlugins, NoteCreator, TemplaterPlugin (+12 more)

### Community 1 - "Drag & Layout Utilities"
Cohesion: 0.13
Nodes (16): addDays(), findFreeRow(), GhostSeg, mDays(), newDatesFromDelta(), RowOccupancy, segmentDates(), addDays() (+8 more)

### Community 2 - "View Lifecycle"
Cohesion: 0.15
Nodes (6): computeSolidColor(), computeTint(), GridRenderer, MONTH_NAMES, MonthRowRef, WEEKDAY_ABBR

### Community 4 - "Semantic Architecture"
Cohesion: 0.19
Nodes (9): getContrastColor(), assignRowsForMonth(), RowAssignment, daysInMonth(), groupSegmentsByMonth(), MonthSegment, segmentByMonth(), BarRenderer (+1 more)

### Community 5 - "Bar Rendering & Temporal Segmentation"
Cohesion: 0.16
Nodes (8): FrontmatterScanner, dayOfYear(), daysInYear(), formatDateRange(), isLeapYear(), monthBoundaries(), parseDateString(), projectAnniversaryDates()

### Community 6 - "Settings Interface"
Cohesion: 0.15
Nodes (10): ObsidianNoteCreator, AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins (+2 more)

### Community 7 - "Date Utilities & Scanning"
Cohesion: 0.15
Nodes (14): BarRenderer, CalendarRenderer, buildTagColorMap, getContrastColor, getDailyNoteMap, DataSource, DragHandler, FrontmatterScanner (+6 more)

### Community 13 - "Build Configuration"
Cohesion: 0.33
Nodes (5): Build & Test, Conventions, graphify, obsidian-linear-calendar, Public API

### Community 14 - "Test Configuration"
Cohesion: 0.33
Nodes (5): Category toggle re-render scope, Reading CSS-driven visibility in event handlers, ResizeObserver — LinearCalendarView vs mountMonthStrip, Tracking a CSS grid column with a positioned overlay, View layer

### Community 15 - "Settings Tab (Semantic)"
Cohesion: 0.4
Nodes (4): Daily note plugin priority, Moment, Testing, Utils

### Community 16 - "Plugin Settings (Semantic)"
Cohesion: 0.4
Nodes (4): Data layer, FrontmatterScanner cache management (concrete type only), metadataCache.on("changed") callback shape, Obsidian tag format (API gotcha)

## Knowledge Gaps
- **44 isolated node(s):** `TemplaterPlugin`, `AppWithPlugins`, `FONT_OPTIONS`, `DEFAULT_MAPPING`, `DailyPluginSettings` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Grid Rendering & Interactions` to `Core Data & Constants`, `Settings Interface`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `GridRenderer` connect `View Lifecycle` to `Core Data & Constants`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `LinearCalendarSettingTab` connect `Daily Notes Integration` to `Core Data & Constants`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `TemplaterPlugin`, `AppWithPlugins`, `FONT_OPTIONS` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Drag & Layout Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._