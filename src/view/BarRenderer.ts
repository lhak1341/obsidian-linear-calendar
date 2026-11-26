import { type App, Menu, setIcon } from "obsidian";
import type { CalendarItem, TagHue } from "../types";
import type { CalendarInteractions } from "./calendarInteractions";
import { resolveLucideIconId } from "../lucide-icons";
import { HUE_ORDER, hueColour } from "../constants";
import type { RowRef } from "./GridRenderer";
import { gridArea, type BarLayout, type RowSegment } from "../utils/barLayout";
import { categoryOf } from "../utils/category";
import { canDrag } from "../utils/dragUtils";
import { DragHandler } from "./DragHandler";

/** Data a bar carries for consumers (e.g. Tooltip) that need it without touching the DOM. */
export interface BarInfo {
	item: CalendarItem;
	hue: TagHue;
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
		rowRefs: RowRef[],
		layout: BarLayout,
		tagColorMap: Map<string, TagHue>,
		tagIconMap: Map<string, string>,
	): void {
		const isVertical = rowRefs[0]?.layout === "vertical";

		this.dragHandler.cleanup();
		const dragScene = { rowRefs, layout };

		for (const rowRef of rowRefs) {
			for (const { segment, lane } of layout.placementsFor(rowRef.row)) {
				const barEl = this.createBarEl(rowRef, segment, lane, isVertical);
				this.decorateBar(barEl, segment, tagColorMap, tagIconMap);

				barEl.addEventListener("click", (evt) => {
					if (barEl.dataset.justDragged) return;
					if (segment.item.kind === "reminder") {
						// Marked from click until the scanner's repaint replaces this element (a running
						// promotion is also deduped in EventNotes); a failed promotion unmarks it.
						if (barEl.dataset.promoting) return;
						barEl.dataset.promoting = "true";
						void this.interactions.onReminderClick(segment.item).then((ok) => {
							if (!ok) delete barEl.dataset.promoting;
						});
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
		rowRef: RowRef,
		segment: RowSegment,
		lane: number,
		isVertical: boolean,
	): HTMLElement {
		const isSingleDay = isVertical && segment.endDay === segment.startDay;
		const barEl = rowRef.barsContainer.createDiv({
			cls: isVertical
				? `calendar-bar calendar-bar-vert${isSingleDay ? " calendar-bar-vert-single" : ""}`
				: "calendar-bar",
			attr: { tabindex: "0" },
		});

		const area = gridArea(segment, lane, rowRef.weekdayOffset, rowRef.layout);
		barEl.style.gridColumn = area.gridColumn;
		barEl.style.gridRow = area.gridRow;
		return barEl;
	}

	private decorateBar(
		barEl: HTMLElement,
		segment: RowSegment,
		tagColorMap: Map<string, TagHue>,
		tagIconMap: Map<string, string>,
	): void {
		const tag = categoryOf(segment.item);
		const resolvedIcon = segment.item.icon ?? tagIconMap.get(tag);
		if (resolvedIcon) {
			const iconEl = barEl.createSpan({ cls: "calendar-bar-icon" });
			setIcon(iconEl, resolveLucideIconId(resolvedIcon));
		}
		barEl.createSpan({ cls: "calendar-bar-label", text: segment.item.title });

		// The fill and its contrasting text come from --lc-hue in CSS, so they follow flavor and mode.
		const hue = tagColorMap.get(tag) ?? HUE_ORDER[0];
		barEl.style.setProperty("--lc-hue", hueColour(hue));

		if (segment.item.kind === "recurrence") barEl.addClass("calendar-bar-anniversary");
		if (segment.item.kind === "reminder") barEl.addClass("calendar-bar-reminder");

		this.barInfo.set(barEl, { item: segment.item, hue });
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
