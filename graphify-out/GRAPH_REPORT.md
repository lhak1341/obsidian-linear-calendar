# Graph Report - obsidian-linear-calendar  (2026-06-13)

## Corpus Check
- 25 files · ~10,701 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 250 nodes · 412 edges · 48 communities (12 shown, 36 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f7229bdd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Data & Constants|Core Data & Constants]]
- [[_COMMUNITY_Drag & Layout Utilities|Drag & Layout Utilities]]
- [[_COMMUNITY_Data Scanning & Metadata|Data Scanning & Metadata]]
- [[_COMMUNITY_View & Note Integration|View & Note Integration]]
- [[_COMMUNITY_Rendering & Visual Styles|Rendering & Visual Styles]]
- [[_COMMUNITY_Temporal Logic|Temporal Logic]]
- [[_COMMUNITY_Notes & Bar Display|Notes & Bar Display]]
- [[_COMMUNITY_Configuration Interface|Configuration Interface]]
- [[_COMMUNITY_User Feedback (Tooltips)|User Feedback (Tooltips)]]
- [[_COMMUNITY_Temporal Markers|Temporal Markers]]
- [[_COMMUNITY_Build & Environment|Build & Environment]]
- [[_COMMUNITY_Main Entry Point|Main Entry Point]]
- [[_COMMUNITY_Fragment 12|Fragment 12]]
- [[_COMMUNITY_Fragment 13|Fragment 13]]
- [[_COMMUNITY_Fragment 14|Fragment 14]]
- [[_COMMUNITY_Fragment 15|Fragment 15]]
- [[_COMMUNITY_Fragment 16|Fragment 16]]
- [[_COMMUNITY_Fragment 17|Fragment 17]]
- [[_COMMUNITY_Fragment 20|Fragment 20]]
- [[_COMMUNITY_Fragment 21|Fragment 21]]
- [[_COMMUNITY_Fragment 22|Fragment 22]]
- [[_COMMUNITY_Fragment 23|Fragment 23]]
- [[_COMMUNITY_Fragment 24|Fragment 24]]
- [[_COMMUNITY_Fragment 25|Fragment 25]]
- [[_COMMUNITY_Fragment 26|Fragment 26]]
- [[_COMMUNITY_Fragment 27|Fragment 27]]
- [[_COMMUNITY_Fragment 28|Fragment 28]]
- [[_COMMUNITY_Fragment 29|Fragment 29]]
- [[_COMMUNITY_Fragment 30|Fragment 30]]
- [[_COMMUNITY_Fragment 31|Fragment 31]]
- [[_COMMUNITY_Fragment 32|Fragment 32]]
- [[_COMMUNITY_Fragment 33|Fragment 33]]
- [[_COMMUNITY_Fragment 34|Fragment 34]]
- [[_COMMUNITY_Fragment 35|Fragment 35]]
- [[_COMMUNITY_Fragment 36|Fragment 36]]
- [[_COMMUNITY_Fragment 37|Fragment 37]]
- [[_COMMUNITY_Fragment 38|Fragment 38]]
- [[_COMMUNITY_Fragment 39|Fragment 39]]
- [[_COMMUNITY_Fragment 40|Fragment 40]]
- [[_COMMUNITY_Fragment 41|Fragment 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `LinearCalendarView` - 22 edges
2. `GridRenderer` - 17 edges
3. `LinearCalendarSettingTab` - 12 edges
4. `DragHandler` - 12 edges
5. `CalendarItem` - 11 edges
6. `buildTagColorMap()` - 10 edges
7. `NowIndicator` - 10 edges
8. `Tooltip` - 10 edges
9. `BarRenderer` - 10 edges
10. `ColumnMapping` - 9 edges

## Surprising Connections (you probably didn't know these)
- `FrontmatterScanner` --references--> `Move Apartments`  [INFERRED]
  src/data/FrontmatterScanner.ts → test-vault/notes/move-apartments.md
- `FrontmatterScanner` --references--> `Client Project A`  [INFERRED]
  src/data/FrontmatterScanner.ts → test-vault/notes/client-project-a.md
- `FrontmatterScanner` --references--> `Birthday Party`  [INFERRED]
  src/data/FrontmatterScanner.ts → test-vault/notes/birthday.md
- `LinearCalendarPlugin` --references--> `LinearCalendarView`  [EXTRACTED]
  src/main.ts → src/view/LinearCalendarView.ts
- `FrontmatterScanner` --calls--> `parseDateString`  [EXTRACTED]
  src/data/FrontmatterScanner.ts → src/utils/dateUtils.ts

## Hyperedges (group relationships)
- **Work Project Lifecycle** — project_alpha_note, client_project_b_note, product_launch_note, quarterly_review_note [INFERRED 0.85]
- **Daily Note Plugin Integrations** — daily_note_priority, periodic_notes_plugin, core_daily_notes_plugin [INFERRED 0.95]

## Communities (48 total, 36 thin omitted)

### Community 0 - "Core Data & Constants"
Cohesion: 0.15
Nodes (23): DataSource, CacheEntry, FrontmatterScanner, COLOR_PALETTE, DEFAULT_MAPPING, DEFAULT_SETTINGS, AlignMode, CalendarItem (+15 more)

### Community 1 - "Drag & Layout Utilities"
Cohesion: 0.13
Nodes (11): addDays(), buildOccupancy(), DragContext, DragHandler, findFreeRow(), formatDate(), GhostSeg, mDays() (+3 more)

### Community 3 - "View & Note Integration"
Cohesion: 0.17
Nodes (15): dateFromDayOfYear(), dayOfYear(), daysInYear(), formatDateRange(), isLeapYear(), monthBoundaries(), parseDateString(), projectAnniversaryDates() (+7 more)

### Community 4 - "Rendering & Visual Styles"
Cohesion: 0.12
Nodes (17): BarRenderer, Birthday Party, Client Project A, buildTagColorMap, getDailyNoteMap, parseDateString, projectAnniversaryDates, DragHandler (+9 more)

### Community 5 - "Temporal Logic"
Cohesion: 0.19
Nodes (3): computeSolidColor(), computeTint(), GridRenderer

### Community 7 - "Configuration Interface"
Cohesion: 0.25
Nodes (8): daysInMonth(), groupSegmentsByMonth(), MonthSegment, segmentByMonth(), items, map, segs, src

### Community 8 - "User Feedback (Tooltips)"
Cohesion: 0.28
Nodes (8): AppInternal, CoreDailyNoteOptions, createDailyNote(), DailyPluginSettings, getDailyNoteMap(), getDailyNoteSettings(), ObsidianInternalPlugins, ObsidianPlugins

### Community 14 - "Fragment 14"
Cohesion: 0.33
Nodes (5): Build & Test, Conventions, graphify, obsidian-linear-calendar, Public API

### Community 15 - "Fragment 15"
Cohesion: 0.4
Nodes (5): Client Project B Note, Project Alpha Note, Quarterly Review Note, Sprint Q2 Note, Tax Deadline Note

### Community 16 - "Fragment 16"
Cohesion: 0.5
Nodes (3): Daily note plugin priority, Moment, Utils

## Knowledge Gaps
- **77 isolated node(s):** `DEFAULT_MAPPING`, `DailyPluginSettings`, `ObsidianPlugins`, `CoreDailyNoteOptions`, `ObsidianInternalPlugins` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LinearCalendarView` connect `Data Scanning & Metadata` to `Core Data & Constants`, `Drag & Layout Utilities`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `GridRenderer` connect `Temporal Logic` to `Core Data & Constants`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `DragHandler` connect `Drag & Layout Utilities` to `Core Data & Constants`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `DEFAULT_MAPPING`, `DailyPluginSettings`, `ObsidianPlugins` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Drag & Layout Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Rendering & Visual Styles` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._