import { type App, Menu, setIcon } from "obsidian";
import type { CalendarItem } from "../types";
import type { CalendarInteractions } from "./calendarInteractions";
import { resolveLucideIconId } from "../lucide-icons";
import { COLOR_PALETTE } from "../constants";
import { getContrastColor } from "../utils/colorUtils";
import type { MonthRowRef } from "./GridRenderer";
import { gridArea, type BarLayout, type MonthSegment } from "../utils/barLayout";
import { categoryOf } from "../utils/category";
import { canDrag } from "../utils/dragUtils";
import { DragHandler } from "./DragHandler";

/** Data a bar carries for consumers (e.g. Tooltip) that need it without touching the DOM. */
export interface BarInfo {
	item: CalendarItem;
	tagColor: string;
}

export class BarRenderer {
	private dragHandler: DragHandler;
	private barInfo = new WeakMap<HTMLElement, BarInfo>();

	constructor(
		private app: App,
		private interactions: CalendarInteractions,
	) {
		this.dragHandler = new DragHandler(interactions.onDropCommit);
	}

	cleanup(): void {
		this.dragHandler.cleanup();
	}

	render(
		monthRows: MonthRowRef[],
		layout: BarLayout,
		tagColorMap: Map<string, string>,
		tagIconMap: Map<string, string>,
	): void {
		const isVertical = monthRows[0]?.layout === "vertical";

		this.dragHandler.cleanup();
		const dragScene = { monthRows, layout };

		for (const rowRef of monthRows) {
			for (const { segment, row } of layout.placementsFor(rowRef.month)) {
				const barEl = this.createBarEl(rowRef, segment, row, isVertical);
				this.decorateBar(barEl, segment, tagColorMap, tagIconMap);

				barEl.addEventListener("click", (evt) => {
					if (barEl.dataset.justDragged) return;
					if (segment.item.kind === "reminder") {
						this.interactions.onReminderClick(segment.item);
						return;
					}
					void this.app.workspace.openLinkText(segment.item.filePath, "", evt.metaKey || evt.ctrlKey);
				});

				this.attachContextMenu(barEl, segment.item.filePath);

				if (!isVertical && canDrag(segment.item)) {
					this.dragHandler.attach(barEl, segment, dragScene);
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
		const isSingleDay = isVertical && segment.endDay === segment.startDay;
		const barEl = rowRef.barsContainer.createDiv({
			cls: isVertical
				? `calendar-bar calendar-bar-vert${isSingleDay ? " calendar-bar-vert-single" : ""}`
				: "calendar-bar",
			attr: { tabindex: "0" },
		});

		const area = gridArea(segment, row, rowRef.weekdayOffset, rowRef.layout);
		barEl.style.gridColumn = area.gridColumn;
		barEl.style.gridRow = area.gridRow;
		return barEl;
	}

	private decorateBar(
		barEl: HTMLElement,
		segment: MonthSegment,
		tagColorMap: Map<string, string>,
		tagIconMap: Map<string, string>,
	): void {
		const tag = categoryOf(segment.item);
		const resolvedIcon = segment.item.icon ?? tagIconMap.get(tag);
		if (resolvedIcon) {
			const iconEl = barEl.createSpan({ cls: "calendar-bar-icon" });
			setIcon(iconEl, resolveLucideIconId(resolvedIcon));
		}
		barEl.createSpan({ cls: "calendar-bar-label", text: segment.item.title });

		const bgColor = tagColorMap.get(tag) ?? COLOR_PALETTE[0];
		barEl.style.backgroundColor = bgColor;
		barEl.style.color = getContrastColor(bgColor);

		if (segment.item.kind === "recurrence") barEl.addClass("calendar-bar-anniversary");
		if (segment.item.kind === "reminder") barEl.addClass("calendar-bar-reminder");

		this.barInfo.set(barEl, { item: segment.item, tagColor: bgColor });
	}

	getBarInfo(barEl: HTMLElement): BarInfo | undefined {
		return this.barInfo.get(barEl);
	}

	private attachContextMenu(barEl: HTMLElement, filePath: string): void {
		barEl.addEventListener("contextmenu", (evt) => {
			evt.preventDefault();
			const menu = new Menu();
			menu.addItem((item) =>
				item.setTitle("Open note").setIcon("file-text").onClick(() => {
					void this.app.workspace.openLinkText(filePath, "", false);
				}),
			);
			menu.addItem((item) =>
				item.setTitle("Open in new tab").setIcon("file-plus").onClick(() => {
					void this.app.workspace.openLinkText(filePath, "", true);
				}),
			);
			if (this.interactions.canEditNote(filePath)) {
				menu.addItem((item) =>
					item.setTitle("Edit event").setIcon("pencil").onClick(() => {
						this.interactions.onEditNote(filePath);
					}),
				);
			}
			menu.addSeparator();
			menu.addItem((item) =>
				item.setTitle("Copy link").setIcon("link").onClick(() => {
					void navigator.clipboard.writeText(`[[${filePath}]]`);
				}),
			);
			menu.showAtMouseEvent(evt);
		});
	}
}
