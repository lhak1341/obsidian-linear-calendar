/* eslint-disable obsidianmd/no-static-styles-assignment -- style.display/cursor on drag elements are imperative show/hide; cannot use CSS classes without extra state tracking */
import type { MonthRowRef } from "./GridRenderer";
import {
	segmentDates, findFreeRow, newDatesFromDelta,
	type RowOccupancy,
} from "../utils/dragUtils";

interface DragContext {
	barEl: HTMLElement;
	barColor: string;
	barLabel: string;
	filePath: string;
	originalStart: Date;
	originalEnd: Date;
	segMonth: number;
	segStartDay: number;
	segEndDay: number;
	daysInMonth: number;
	year: number;
	mode: "resize-start" | "resize-end" | "move";
	startX: number;
	dayWidth: number;
}

function buildOccupancy(container: HTMLElement): RowOccupancy {
	const occ: RowOccupancy = new Map();
	const bars = container.querySelectorAll(".calendar-bar:not(.lc-drag-ghost)");
	for (const bar of bars) {
		const el = bar as HTMLElement;
		if (el.style.display === "none") continue;
		const row = parseInt(el.style.gridRow) - 2;
		if (isNaN(row) || row < 0) continue;
		const match = el.style.gridColumn.match(/(\d+)\s*\/\s*span\s*(\d+)/);
		if (!match) continue;
		const s = parseInt(match[1]);
		const e = s + parseInt(match[2]) - 1;
		if (!occ.has(row)) occ.set(row, []);
		occ.get(row)!.push([s, e]);
	}
	return occ;
}

export class DragHandler {
	private ctx: DragContext | null = null;
	private monthRows: MonthRowRef[] = [];
	/** Pre-built occupancy maps per month, computed once at drag start */
	private occupancyCache = new Map<number, RowOccupancy>();
	/** Reusable ghost pool — update in place, hide extras */
	private ghostPool: HTMLElement[] = [];
	private activeGhostCount = 0;
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;
	private prevDayDelta: number | null = null;

	constructor(
		private getYear: () => number,
		private onDropCommit: (filePath: string, newStart: Date, newEnd: Date) => Promise<void>,
	) {
		this.boundMouseMove = this.onMouseMove.bind(this);
		this.boundMouseUp = () => { void this.onMouseUp(); };
	}

	setMonthRows(rows: MonthRowRef[]): void {
		this.monthRows = rows;
	}

	attach(
		barEl: HTMLElement,
		filePath: string,
		month: number,
		startDay: number,
		endDay: number,
		daysInMonth: number,
		originalStart: Date,
		originalEnd: Date,
	): void {
		const leftHandle = activeDocument.createElement("div");
		leftHandle.className = "lc-drag-handle lc-drag-handle-left";
		barEl.appendChild(leftHandle);

		const rightHandle = activeDocument.createElement("div");
		rightHandle.className = "lc-drag-handle lc-drag-handle-right";
		barEl.appendChild(rightHandle);

		const initDrag = (e: MouseEvent, mode: DragContext["mode"]) => {
			e.stopPropagation();
			e.preventDefault();
			this.startDrag(e, barEl, filePath, month, startDay, endDay, daysInMonth, originalStart, originalEnd, mode);
		};

		leftHandle.addEventListener("mousedown", (e) => initDrag(e, "resize-start"));
		rightHandle.addEventListener("mousedown", (e) => initDrag(e, "resize-end"));

		barEl.addEventListener("mousedown", (e) => {
			if (e.button !== 0) return;
			if ((e.target as HTMLElement).classList.contains("lc-drag-handle")) return;
			const sx = e.clientX;
			const sy = e.clientY;
			const onMove = (me: MouseEvent) => {
				if (Math.abs(me.clientX - sx) > 4 || Math.abs(me.clientY - sy) > 4) {
					activeDocument.removeEventListener("mousemove", onMove);
					activeDocument.removeEventListener("mouseup", onUp);
					e.preventDefault();
					this.startDrag(e, barEl, filePath, month, startDay, endDay, daysInMonth, originalStart, originalEnd, "move");
					this.onMouseMove(me);
				}
			};
			const onUp = () => {
				activeDocument.removeEventListener("mousemove", onMove);
				activeDocument.removeEventListener("mouseup", onUp);
			};
			activeDocument.addEventListener("mousemove", onMove);
			activeDocument.addEventListener("mouseup", onUp);
		});
	}

	private startDrag(
		e: MouseEvent,
		barEl: HTMLElement,
		filePath: string,
		month: number,
		startDay: number,
		endDay: number,
		dim: number,
		originalStart: Date,
		originalEnd: Date,
		mode: DragContext["mode"],
	): void {
		const daysGrid = barEl.closest(".lc-days-grid");
		if (!daysGrid) return;
		const totalCols = this.monthRows.find((r) => r.month === month)?.totalCols ?? 31;
		const dayWidth = daysGrid.clientWidth / totalCols;

		const labelEl = barEl.querySelector(".calendar-bar-label");

		this.ctx = {
			barEl,
			barColor: barEl.style.backgroundColor,
			barLabel: labelEl?.textContent ?? "",
			filePath,
			originalStart: new Date(originalStart),
			originalEnd: new Date(originalEnd),
			segMonth: month,
			segStartDay: startDay,
			segEndDay: endDay,
			daysInMonth: dim,
			year: this.getYear(),
			mode,
			startX: e.clientX,
			dayWidth,
		};
		this.prevDayDelta = null;

		// Pre-build occupancy maps for all months (once per drag)
		this.occupancyCache.clear();
		for (const row of this.monthRows) {
			this.occupancyCache.set(row.month, buildOccupancy(row.barsContainer));
		}

		barEl.addClass("lc-dragging");
		activeDocument.body.style.cursor = mode === "move" ? "grabbing" : "col-resize";

		activeDocument.addEventListener("mousemove", this.boundMouseMove);
		activeDocument.addEventListener("mouseup", this.boundMouseUp);
	}

	private newDatesFromDelta(dayDelta: number): { newStart: Date; newEnd: Date } {
		const { originalStart, originalEnd, mode } = this.ctx!;
		return newDatesFromDelta(originalStart, originalEnd, mode, dayDelta);
	}

	private onMouseMove(e: MouseEvent): void {
		if (!this.ctx) return;

		const dx = e.clientX - this.ctx.startX;
		const dayDelta = Math.round(dx / this.ctx.dayWidth);

		if (dayDelta === this.prevDayDelta) return;
		this.prevDayDelta = dayDelta;

		this.updateVisuals(dayDelta);
	}

	private updateVisuals(dayDelta: number): void {
		if (!this.ctx) return;
		const { barEl, barColor, barLabel, segMonth, year } = this.ctx;

		const { newStart, newEnd } = this.newDatesFromDelta(dayDelta);
		const allSegs = segmentDates(newStart, newEnd, year);

		// Update real bar in home month
		const homeRowRef = this.monthRows.find((r) => r.month === segMonth);
		const homeOffset = homeRowRef?.weekdayOffset ?? 0;
		const homeSeg = allSegs.find((s) => s.month === segMonth);
		if (homeSeg) {
			const span = homeSeg.endDay - homeSeg.startDay + 1;
			barEl.style.gridColumn = `${homeOffset + homeSeg.startDay} / span ${span}`;
			barEl.style.display = "";
		} else {
			barEl.style.display = "none";
		}

		// Update ghosts — reuse pooled elements
		const otherSegs = allSegs.filter((s) => s.month !== segMonth);
		let gi = 0;

		for (const seg of otherSegs) {
			const rowRef = this.monthRows.find((r) => r.month === seg.month);
			if (!rowRef) continue;

			const occ = this.occupancyCache.get(seg.month);
			const row = occ ? findFreeRow(occ, seg.startDay, seg.endDay) : 0;
			const span = seg.endDay - seg.startDay + 1;
			const offset = rowRef.weekdayOffset;

			let ghost: HTMLElement;
			if (gi < this.ghostPool.length) {
				ghost = this.ghostPool[gi];
				ghost.style.display = "";
			} else {
				ghost = activeDocument.createElement("div");
				ghost.className = "calendar-bar lc-drag-ghost";
				const label = activeDocument.createElement("span");
				label.className = "calendar-bar-label";
				ghost.appendChild(label);
				this.ghostPool.push(ghost);
			}

			ghost.style.gridColumn = `${offset + seg.startDay} / span ${span}`;
			ghost.style.gridRow = `${row + 2}`;
			ghost.style.backgroundColor = barColor;
			(ghost.firstChild as HTMLElement).textContent = barLabel;

			// Move ghost to correct container if needed
			if (ghost.parentElement !== rowRef.barsContainer) {
				rowRef.barsContainer.appendChild(ghost);
			}

			gi++;
		}

		// Hide unused ghosts
		for (let i = gi; i < this.activeGhostCount; i++) {
			this.ghostPool[i].style.display = "none";
		}
		this.activeGhostCount = gi;
	}

	private clearGhosts(): void {
		for (let i = 0; i < this.ghostPool.length; i++) {
			this.ghostPool[i].remove();
		}
		this.ghostPool = [];
		this.activeGhostCount = 0;
	}

	private async onMouseUp(): Promise<void> {
		activeDocument.removeEventListener("mousemove", this.boundMouseMove);
		activeDocument.removeEventListener("mouseup", this.boundMouseUp);
		activeDocument.body.style.cursor = "";

		if (!this.ctx) return;

		const dayDelta = this.prevDayDelta ?? 0;
		const { newStart, newEnd } = this.newDatesFromDelta(dayDelta);
		const { barEl, filePath } = this.ctx;

		this.clearGhosts();
		this.occupancyCache.clear();

		barEl.style.display = "";
		barEl.removeClass("lc-dragging");
		barEl.dataset.justDragged = "true";
		window.requestAnimationFrame(() => { delete barEl.dataset.justDragged; });

		this.ctx = null;
		this.prevDayDelta = null;

		if (dayDelta === 0) return;

		// Delegate write to caller — metadataCache.on('changed') triggers re-render
		await this.onDropCommit(filePath, newStart, newEnd);
	}

	cleanup(): void {
		activeDocument.removeEventListener("mousemove", this.boundMouseMove);
		activeDocument.removeEventListener("mouseup", this.boundMouseUp);
		this.clearGhosts();
		this.occupancyCache.clear();
		this.ctx = null;
	}
}
