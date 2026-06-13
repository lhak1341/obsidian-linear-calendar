# Graph Report - .  (2026-06-13)

## Corpus Check
- Corpus is ~9,569 words - fits in a single context window. You may not need a graph.

## Summary
- 179 nodes · 323 edges · 17 communities (9 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 12,431 input · 1,852 output

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
- [[_COMMUNITY_Settings Tab (Semantic)|Settings Tab (Semantic)]]
- [[_COMMUNITY_Plugin Settings (Semantic)|Plugin Settings (Semantic)]]

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 20 edges
2. `GridRenderer` - 15 edges
3. `LinearCalendarSettingTab` - 12 edges
4. `DragHandler` - 12 edges
5. `LinearCalendarPlugin` - 8 edges
6. `CalendarItem` - 8 edges
7. `NowIndicator` - 8 edges
8. `CalendarRenderer` - 8 edges
9. `Tooltip` - 8 edges
10. `BarRenderer` - 8 edges

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

## Communities (17 total, 8 thin omitted)

### Community 0 - "Core Data & Constants"
Cohesion: 0.17
Nodes (20): DataSource, CacheEntry, FrontmatterScanner, COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, AlignMode, CalendarItem (+12 more)

### Community 1 - "Drag & Layout Utilities"
Cohesion: 0.15
Nodes (9): addDays(), buildOccupancy(), DragContext, DragHandler, findFreeRow(), GhostSeg, mDays(), RowOccupancy (+1 more)

### Community 3 - "Grid Rendering & Interactions"
Cohesion: 0.19
Nodes (3): computeSolidColor(), computeTint(), GridRenderer

### Community 4 - "Semantic Architecture"
Cohesion: 0.15
Nodes (14): BarRenderer, CalendarRenderer, buildTagColorMap, getContrastColor, getDailyNoteMap, DataSource, DragHandler, FrontmatterScanner (+6 more)

### Community 5 - "Bar Rendering & Temporal Segmentation"
Cohesion: 0.26
Nodes (5): daysInMonth(), groupSegmentsByMonth(), MonthSegment, segmentByMonth(), BarRenderer

### Community 7 - "Date Utilities & Scanning"
Cohesion: 0.24
Nodes (7): dayOfYear(), daysInYear(), formatDateRange(), isLeapYear(), monthBoundaries(), parseDateString(), projectAnniversaryDates()

### Community 8 - "Daily Notes Integration"
Cohesion: 0.28
Nodes (8): AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins, ObsidianPlugins

## Knowledge Gaps
- **24 isolated node(s):** `DEFAULT_MAPPING`, `DailyPluginSettings`, `ObsidianPlugins`, `CoreDailyNoteOptions`, `ObsidianInternalPlugins` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `View Lifecycle` to `Core Data & Constants`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `GridRenderer` connect `Grid Rendering & Interactions` to `Core Data & Constants`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `DragHandler` connect `Drag & Layout Utilities` to `Core Data & Constants`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **What connects `DEFAULT_MAPPING`, `DailyPluginSettings`, `ObsidianPlugins` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._