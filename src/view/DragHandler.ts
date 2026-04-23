import type { App, TFile } from "obsidian";
import type { ColumnMapping } from "../types";
import type { MonthRowRef } from "./GridRenderer";

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
	onComplete: () => void;
}

interface GhostInfo {
	month: number;
	startDay: number;
	endDay: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function formatDate(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mDays(month: number, year: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function segmentDates(start: Date, end: Date, year: number): GhostInfo[] {
	const segs: GhostInfo[] = [];
	const yStart = new Date(year, 0, 1);
	const yEnd = new Date(year, 11, 31);
	const s = start < yStart ? yStart : start;
	const e = end > yEnd ? yEnd : end;
	if (s > e) return segs;

	const sM = s.getMonth();
	const eM = e.getMonth();

	if (sM === eM) {
		segs.push({ month: sM, startDay: s.getDate(), endDay: e.getDate() });
	} else {
		segs.push({ month: sM, startDay: s.getDate(), endDay: mDays(sM, year) });
		for (let m = sM + 1; m < eM; m++) {
			segs.push({ month: m, startDay: 1, endDay: mDays(m, year) });
		}
		segs.push({ month: eM, startDay: 1, endDay: e.getDate() });
	}
	return segs;
}

export class DragHandler {
	private ctx: DragContext | null = null;
	private monthRows: MonthRowRef[] = [];
	private ghostEls: HTMLElement[] = [];
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;
	private prevDayDelta: number | null = null;

	constructor(
		private app: App,
		private getMapping: () => ColumnMapping,
		private getYear: () => number,
	) {
		this.boundMouseMove = this.onMouseMove.bind(this);
		this.boundMouseUp = this.onMouseUp.bind(this);
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
		onComplete: () => void,
	): void {
		const leftHandle = document.createElement("div");
		leftHandle.className = "lc-drag-handle lc-drag-handle-left";
		barEl.appendChild(leftHandle);

		const rightHandle = document.createElement("div");
		rightHandle.className = "lc-drag-handle lc-drag-handle-right";
		barEl.appendChild(rightHandle);

		const initDrag = (e: MouseEvent, mode: DragContext["mode"]) => {
			e.stopPropagation();
			e.preventDefault();
			this.startDrag(e, barEl, filePath, month, startDay, endDay, daysInMonth, originalStart, originalEnd, mode, onComplete);
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
					document.removeEventListener("mousemove", onMove);
					document.removeEventListener("mouseup", onUp);
					e.preventDefault();
					this.startDrag(e, barEl, filePath, month, startDay, endDay, daysInMonth, originalStart, originalEnd, "move", onComplete);
					this.onMouseMove(me);
				}
			};
			const onUp = () => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
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
		onComplete: () => void,
	): void {
		const daysGrid = barEl.closest(".lc-days-grid") as HTMLElement | null;
		if (!daysGrid) return;
		const dayWidth = daysGrid.clientWidth / 31;

		const labelEl = barEl.querySelector(".calendar-bar-label") as HTMLElement | null;

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
			onComplete,
		};
		this.prevDayDelta = null;

		barEl.addClass("lc-dragging");
		document.body.style.cursor = mode === "move" ? "grabbing" : "col-resize";

		document.addEventListener("mousemove", this.boundMouseMove);
		document.addEventListener("mouseup", this.boundMouseUp);
	}

	private newDatesFromDelta(dayDelta: number): { newStart: Date; newEnd: Date } {
		const { originalStart, originalEnd, mode } = this.ctx!;

		if (mode === "resize-end") {
			const newEnd = addDays(originalEnd, dayDelta);
			return {
				newStart: new Date(originalStart),
				newEnd: newEnd < originalStart ? new Date(originalStart) : newEnd,
			};
		}
		if (mode === "resize-start") {
			const newStart = addDays(originalStart, dayDelta);
			return {
				newStart: newStart > originalEnd ? new Date(originalEnd) : newStart,
				newEnd: new Date(originalEnd),
			};
		}
		return {
			newStart: addDays(originalStart, dayDelta),
			newEnd: addDays(originalEnd, dayDelta),
		};
	}

	private onMouseMove(e: MouseEvent): void {
		if (!this.ctx) return;
		const { startX, dayWidth } = this.ctx;

		const dx = e.clientX - startX;
		const dayDelta = Math.round(dx / dayWidth);

		// Skip if nothing changed
		if (dayDelta === this.prevDayDelta) return;
		this.prevDayDelta = dayDelta;

		this.updateVisuals(dayDelta);
	}

	private updateVisuals(dayDelta: number): void {
		if (!this.ctx) return;
		const { barEl, barColor, barLabel, segMonth, year } = this.ctx;

		const { newStart, newEnd } = this.newDatesFromDelta(dayDelta);
		const allSegs = segmentDates(newStart, newEnd, year);

		// Find segment for the original month (where the real bar lives)
		const homeSeg = allSegs.find((s) => s.month === segMonth);

		if (homeSeg) {
			// Bar still overlaps its home month — update its grid position
			barEl.style.gridColumn = `${homeSeg.startDay} / span ${homeSeg.endDay - homeSeg.startDay + 1}`;
			barEl.style.display = "";
		} else {
			// Bar has fully left its home month — hide it
			barEl.style.display = "none";
		}

		// Update ghost bars in other months
		this.clearGhosts();
		for (const seg of allSegs) {
			if (seg.month === segMonth) continue;

			const rowRef = this.monthRows.find((r) => r.month === seg.month);
			if (!rowRef) continue;

			const ghostRow = this.findFreeRow(rowRef.barsContainer, seg.startDay, seg.endDay);

			const ghost = document.createElement("div");
			ghost.className = "calendar-bar lc-drag-ghost";
			const span = seg.endDay - seg.startDay + 1;
			ghost.style.gridColumn = `${seg.startDay} / span ${span}`;
			ghost.style.gridRow = `${ghostRow + 2}`;
			ghost.style.backgroundColor = barColor;

			const label = document.createElement("span");
			label.className = "calendar-bar-label";
			label.textContent = barLabel;
			ghost.appendChild(label);

			rowRef.barsContainer.appendChild(ghost);
			this.ghostEls.push(ghost);
		}
	}

	/**
	 * Find first grid row (0-indexed) in a barsContainer where
	 * no existing bar overlaps the given day range.
	 */
	private findFreeRow(container: HTMLElement, startDay: number, endDay: number): number {
		const bars = container.querySelectorAll(".calendar-bar:not(.lc-drag-ghost)");
		// Build map: row → list of [colStart, colEnd]
		const rowOccupied = new Map<number, [number, number][]>();

		for (const bar of bars) {
			const el = bar as HTMLElement;
			if (el.style.display === "none") continue;
			const col = el.style.gridColumn;
			const rowStr = el.style.gridRow;
			// gridRow is like "2" or "3" — row index = parseInt - 2
			const row = parseInt(rowStr) - 2;
			if (isNaN(row) || row < 0) continue;

			// Parse gridColumn: "5 / span 3" or "5 / 8"
			const match = col.match(/(\d+)\s*\/\s*span\s*(\d+)/);
			if (!match) continue;
			const cStart = parseInt(match[1]);
			const cEnd = cStart + parseInt(match[2]) - 1;

			if (!rowOccupied.has(row)) rowOccupied.set(row, []);
			rowOccupied.get(row)!.push([cStart, cEnd]);
		}

		// Find first row with no overlap
		for (let r = 0; r < 20; r++) {
			const spans = rowOccupied.get(r);
			if (!spans) return r;
			const overlaps = spans.some(([s, e]) => startDay <= e && endDay >= s);
			if (!overlaps) return r;
		}
		return rowOccupied.size;
	}

	private clearGhosts(): void {
		for (const el of this.ghostEls) el.remove();
		this.ghostEls = [];
	}

	private async onMouseUp(): Promise<void> {
		document.removeEventListener("mousemove", this.boundMouseMove);
		document.removeEventListener("mouseup", this.boundMouseUp);
		document.body.style.cursor = "";

		this.clearGhosts();

		if (!this.ctx) return;

		const dayDelta = this.prevDayDelta ?? 0;
		const { newStart, newEnd } = this.newDatesFromDelta(dayDelta);
		const { barEl, filePath, onComplete } = this.ctx;

		// Restore bar visibility
		barEl.style.display = "";
		barEl.removeClass("lc-dragging");
		barEl.dataset.justDragged = "true";
		requestAnimationFrame(() => { delete barEl.dataset.justDragged; });

		this.ctx = null;
		this.prevDayDelta = null;

		if (dayDelta === 0) return;

		const mapping = this.getMapping();
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
		if (!file) return;

		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm[mapping.startDateProp] = formatDate(newStart);
			if (formatDate(newStart) !== formatDate(newEnd) || fm[mapping.endDateProp]) {
				fm[mapping.endDateProp] = formatDate(newEnd);
			}
		});

		onComplete();
	}

	cleanup(): void {
		document.removeEventListener("mousemove", this.boundMouseMove);
		document.removeEventListener("mouseup", this.boundMouseUp);
		this.clearGhosts();
		this.ctx = null;
	}
}
