# Graph Report - obsidian-linear-calendar  (2026-06-29)

## Corpus Check
- 29 files · ~11,323 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 235 nodes · 418 edges · 21 communities (12 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `859ec9e9`
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 22 edges
2. `GridRenderer` - 15 edges
3. `LinearCalendarSettingTab` - 13 edges
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

## Communities (21 total, 9 thin omitted)

### Community 0 - "Core Data & Constants"
Cohesion: 0.13
Nodes (22): DataSource, CacheEntry, FrontmatterScanner, COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, NoteCreator, ObsidianNoteCreator (+14 more)

### Community 1 - "Drag & Layout Utilities"
Cohesion: 0.09
Nodes (10): AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins, ObsidianPlugins (+2 more)

### Community 2 - "View Lifecycle"
Cohesion: 0.13
Nodes (16): addDays(), findFreeRow(), GhostSeg, mDays(), newDatesFromDelta(), RowOccupancy, segmentDates(), addDays() (+8 more)

### Community 3 - "Grid Rendering & Interactions"
Cohesion: 0.14
Nodes (14): getContrastColor(), dayOfYear(), daysInYear(), formatDateRange(), isLeapYear(), monthBoundaries(), assignRowsForMonth(), RowAssignment (+6 more)

### Community 4 - "Semantic Architecture"
Cohesion: 0.15
Nodes (6): computeSolidColor(), computeTint(), GridRenderer, MONTH_NAMES, MonthRowRef, WEEKDAY_ABBR

### Community 5 - "Bar Rendering & Temporal Segmentation"
Cohesion: 0.15
Nodes (14): BarRenderer, CalendarRenderer, buildTagColorMap, getContrastColor, getDailyNoteMap, DataSource, DragHandler, FrontmatterScanner (+6 more)

### Community 11 - "Temporal Markers"
Cohesion: 0.33
Nodes (5): Build & Test, Conventions, graphify, obsidian-linear-calendar, Public API

### Community 12 - "Calendar Component Coordinator"
Cohesion: 0.33
Nodes (5): Category toggle re-render scope, Reading CSS-driven visibility in event handlers, ResizeObserver — LinearCalendarView vs mountMonthStrip, Tracking a CSS grid column with a positioned overlay, View layer

### Community 13 - "Build Configuration"
Cohesion: 0.4
Nodes (4): Daily note plugin priority, Moment, Testing, Utils

### Community 14 - "Test Configuration"
Cohesion: 0.4
Nodes (4): Data layer, FrontmatterScanner cache management (concrete type only), metadataCache.on("changed") callback shape, Obsidian tag format (API gotcha)

## Knowledge Gaps
- **42 isolated node(s):** `FONT_OPTIONS`, `DEFAULT_MAPPING`, `DailyPluginSettings`, `ObsidianPlugins`, `CoreDailyNoteOptions` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Drag & Layout Utilities` to `Core Data & Constants`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `GridRenderer` connect `Semantic Architecture` to `Core Data & Constants`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `LinearCalendarSettingTab` connect `Settings Interface` to `Core Data & Constants`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `FONT_OPTIONS`, `DEFAULT_MAPPING`, `DailyPluginSettings` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Data & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Drag & Layout Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `View Lifecycle` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._