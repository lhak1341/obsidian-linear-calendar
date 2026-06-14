# Graph Report - obsidian-linear-calendar  (2026-06-14)

## Corpus Check
- 26 files · ~9,890 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 211 nodes · 378 edges · 20 communities (10 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c89dd525`
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
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 20 edges
2. `GridRenderer` - 15 edges
3. `LinearCalendarSettingTab` - 12 edges
4. `DragHandler` - 12 edges
5. `ColumnMapping` - 9 edges
6. `BarRenderer` - 9 edges
7. `LinearCalendarPlugin` - 8 edges
8. `CalendarItem` - 8 edges
9. `NowIndicator` - 8 edges
10. `CalendarRenderer` - 8 edges

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

## Communities (20 total, 10 thin omitted)

### Community 0 - "Core Data & Constants"
Cohesion: 0.15
Nodes (20): DataSource, CacheEntry, FrontmatterScanner, COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, NoteCreator, ObsidianNoteCreator (+12 more)

### Community 1 - "Drag & Layout Utilities"
Cohesion: 0.13
Nodes (16): addDays(), findFreeRow(), GhostSeg, mDays(), newDatesFromDelta(), RowOccupancy, segmentDates(), addDays() (+8 more)

### Community 2 - "View Lifecycle"
Cohesion: 0.15
Nodes (12): getContrastColor(), dayOfYear(), daysInYear(), formatDateRange(), isLeapYear(), monthBoundaries(), daysInMonth(), groupSegmentsByMonth() (+4 more)

### Community 3 - "Grid Rendering & Interactions"
Cohesion: 0.15
Nodes (6): computeSolidColor(), computeTint(), GridRenderer, MONTH_NAMES, MonthRowRef, WEEKDAY_ABBR

### Community 5 - "Bar Rendering & Temporal Segmentation"
Cohesion: 0.15
Nodes (14): BarRenderer, CalendarRenderer, buildTagColorMap, getContrastColor, getDailyNoteMap, DataSource, DragHandler, FrontmatterScanner (+6 more)

### Community 7 - "Date Utilities & Scanning"
Cohesion: 0.24
Nodes (8): AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins, ObsidianPlugins

### Community 12 - "Calendar Component Coordinator"
Cohesion: 0.33
Nodes (5): Build & Test, Conventions, graphify, obsidian-linear-calendar, Public API

### Community 13 - "Build Configuration"
Cohesion: 0.4
Nodes (4): Daily note plugin priority, Moment, Testing, Utils

## Knowledge Gaps
- **33 isolated node(s):** `DEFAULT_MAPPING`, `DailyPluginSettings`, `ObsidianPlugins`, `CoreDailyNoteOptions`, `ObsidianInternalPlugins` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Semantic Architecture` to `Core Data & Constants`, `Date Utilities & Scanning`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `GridRenderer` connect `Grid Rendering & Interactions` to `Core Data & Constants`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `DragHandler` connect `Drag & Layout Utilities` to `View Lifecycle`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `DEFAULT_MAPPING`, `DailyPluginSettings`, `ObsidianPlugins` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Drag & Layout Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._