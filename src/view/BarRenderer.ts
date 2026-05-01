import { type App, Menu, setIcon } from "obsidian";
import type { CalendarItem, ColumnMapping, PluginSettings } from "../types";
import { COLOR_PALETTE, MAX_WATERFALL_ROWS, MAX_WATERFALL_COLS_VERT } from "../constants";
import { formatDateRange } from "../utils/dateUtils";
import { getContrastColor } from "../utils/colorUtils";
import type { MonthRowRef } from "./GridRenderer";
import type { MonthSegment } from "../utils/segmentByMonth";
import { groupSegmentsByMonth } from "../utils/segmentByMonth";
import { DragHandler } from "./DragHandler";

interface RowAssignment {
	segment: MonthSegment;
	row: number;
}

/**
 * Build a stable tag→color map from ALL items.
 * User-defined colorMap takes priority, then palette assignment
 * in order of first appearance. Uncategorized items get "__uncategorized__".
 */
export function buildTagColorMap(
	items: CalendarItem[],
	settings: PluginSettings,
): Map<string, string> {
	const map = new Map<string, string>();
	let paletteIdx = 0;

	for (const item of items) {
		const tag = item.tags?.[0] ?? "__uncategorized__";
		if (map.has(tag)) continue;

		const userColor = settings.colorMap[tag];
		if (userColor) {
			map.set(tag, userColor);
		} else {
			map.set(tag, COLOR_PALETTE[paletteIdx % COLOR_PALETTE.length]);
			paletteIdx++;
		}
	}

	return map;
}

export class BarRenderer {
	private dragHandler: DragHandler;

	constructor(
		private app: App,
		getMapping: () => ColumnMapping,
		getYear: () => number,
	) {
		this.dragHandler = new DragHandler(app, getMapping, getYear);
	}

	render(
		monthRows: MonthRowRef[],
		items: CalendarItem[],
		tagColorMap: Map<string, string>,
	): void {
		const isVertical = monthRows[0]?.layout === "vertical";

		this.dragHandler.cleanup();
		if (!isVertical) this.dragHandler.setMonthRows(monthRows);
		const grouped = groupSegmentsByMonth(items);

		for (const rowRef of monthRows) {
			const segments = grouped.get(rowRef.month) ?? [];
			if (segments.length === 0) continue;

			const maxRows = isVertical ? MAX_WATERFALL_COLS_VERT : MAX_WATERFALL_ROWS;
			const assignments = this.assignRowsForMonth(segments, maxRows);

			for (const { segment, row } of assignments) {
				const barEl = this.createBarEl(rowRef, segment, row, isVertical);
				this.decorateBar(barEl, segment, tagColorMap);

				barEl.addEventListener("click", (evt) => {
					if (barEl.dataset.justDragged) return;
					this.app.workspace.openLinkText(segment.item.filePath, "", evt.metaKey || evt.ctrlKey);
				});

				this.attachContextMenu(barEl, segment.item.filePath);

				if (!isVertical) {
					this.dragHandler.attach(
						barEl,
						segment.item.filePath,
						segment.month,
						segment.startDay,
						segment.endDay,
						rowRef.daysInMonth,
						segment.item.dateStart,
						segment.item.dateEnd,
					);
				}
			}
		}
	}

	private createBarEl(
		rowRef: MonthRowRef,
		segment: MonthSegment,
		row: number,
		isVertical: boolean,
	): HTMLElement {
		const span = segment.endDay - segment.startDay + 1;
		const isSingleDay = isVertical && span === 1;
		const barEl = rowRef.barsContainer.createDiv({
			cls: isVertical
				? `calendar-bar calendar-bar-vert${isSingleDay ? " calendar-bar-vert-single" : ""}`
				: "calendar-bar",
			attr: { tabindex: "0" },
		});

		if (isVertical) {
			barEl.style.gridRow = `${rowRef.weekdayOffset + segment.startDay} / span ${span}`;
			barEl.style.gridColumn = `${row + 2}`;  // col 1 = date header
			barEl.style.height = "100%";
			barEl.style.pointerEvents = "auto";
		} else {
			barEl.style.gridColumn = `${rowRef.weekdayOffset + segment.startDay} / span ${span}`;
			barEl.style.gridRow = `${row + 2}`;
		}
		return barEl;
	}

	private decorateBar(
		barEl: HTMLElement,
		segment: MonthSegment,
		tagColorMap: Map<string, string>,
	): void {
		if (segment.item.icon) {
			const iconEl = barEl.createSpan({ cls: "calendar-bar-icon" });
			setIcon(iconEl, segment.item.icon);
		}
		barEl.createSpan({ cls: "calendar-bar-label", text: segment.item.title });

		const tag = segment.item.tags?.[0] ?? "__uncategorized__";
		const bgColor = tagColorMap.get(tag) ?? COLOR_PALETTE[0];
		barEl.style.backgroundColor = bgColor;
		barEl.style.color = getContrastColor(bgColor);

		barEl.dataset.title = segment.item.title;
		barEl.dataset.dateRange = formatDateRange(segment.item.dateStart, segment.item.dateEnd);
		barEl.dataset.tags = segment.item.tags?.join(", ") ?? "";
		barEl.dataset.tagColor = tagColorMap.get(tag) ?? COLOR_PALETTE[0];
		barEl.dataset.filePath = segment.item.filePath;
	}

	private attachContextMenu(barEl: HTMLElement, filePath: string): void {
		barEl.addEventListener("contextmenu", (evt) => {
			evt.preventDefault();
			const menu = new Menu();
			menu.addItem((item) =>
				item.setTitle("Open note").setIcon("file-text").onClick(() => {
					this.app.workspace.openLinkText(filePath, "", false);
				}),
			);
			menu.addItem((item) =>
				item.setTitle("Open in new tab").setIcon("file-plus").onClick(() => {
					this.app.workspace.openLinkText(filePath, "", true);
				}),
			);
			menu.addSeparator();
			menu.addItem((item) =>
				item.setTitle("Copy link").setIcon("link").onClick(() => {
					navigator.clipboard.writeText(`[[${filePath}]]`);
				}),
			);
			menu.showAtMouseEvent(evt);
		});
	}

	private assignRowsForMonth(segments: MonthSegment[], maxRows = MAX_WATERFALL_ROWS): RowAssignment[] {
		const sorted = [...segments].sort(
			(a, b) => a.startDay - b.startDay,
		);

		const rowEnds: number[] = [];
		const assignments: RowAssignment[] = [];

		for (const segment of sorted) {
			let placed = false;

			for (let r = 0; r < rowEnds.length && r < maxRows; r++) {
				if (rowEnds[r] < segment.startDay) {
					rowEnds[r] = segment.endDay;
					assignments.push({ segment, row: r });
					placed = true;
					break;
				}
			}

			if (!placed && rowEnds.length < maxRows) {
				const row = rowEnds.length;
				rowEnds.push(segment.endDay);
				assignments.push({ segment, row });
			}
		}

		return assignments;
	}
}
