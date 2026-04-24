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
}

interface GhostSeg {
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

function segmentDates(start: Date, end: Date, year: number): GhostSeg[] {
	const segs: GhostSeg[] = [];
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

/** Pre-parsed row occupancy for a month's bars container */
type RowOccupancy = Map<number, [number, number][]>;

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

function findFreeRow(occ: RowOccupancy, startDay: number, endDay: number): number {
	for (let r = 0; r < 20; r++) {
		const spans = occ.get(r);
		if (!spans || !spans.some(([s, e]) => startDay <= e && endDay >= s)) return r;
	}
	return occ.size;
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
					document.removeEventListener("mousemove", onMove);
					document.removeEventListener("mouseup", onUp);
					e.preventDefault();
					this.startDrag(e, barEl, filePath, month, startDay, endDay, daysInMonth, originalStart, originalEnd, "move");
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
		};
		this.prevDayDelta = null;

		// Pre-build occupancy maps for all months (once per drag)
		this.occupancyCache.clear();
		for (const row of this.monthRows) {
			this.occupancyCache.set(row.month, buildOccupancy(row.barsContainer));
		}

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
		const homeSeg = allSegs.find((s) => s.month === segMonth);
		if (homeSeg) {
			barEl.style.gridColumn = `${homeSeg.startDay} / span ${homeSeg.endDay - homeSeg.startDay + 1}`;
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

			let ghost: HTMLElement;
			if (gi < this.ghostPool.length) {
				ghost = this.ghostPool[gi];
				ghost.style.display = "";
			} else {
				ghost = document.createElement("div");
				ghost.className = "calendar-bar lc-drag-ghost";
				const label = document.createElement("span");
				label.className = "calendar-bar-label";
				ghost.appendChild(label);
				this.ghostPool.push(ghost);
			}

			ghost.style.gridColumn = `${seg.startDay} / span ${span}`;
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
		document.removeEventListener("mousemove", this.boundMouseMove);
		document.removeEventListener("mouseup", this.boundMouseUp);
		document.body.style.cursor = "";

		if (!this.ctx) return;

		const dayDelta = this.prevDayDelta ?? 0;
		const { newStart, newEnd } = this.newDatesFromDelta(dayDelta);
		const { barEl, filePath } = this.ctx;

		this.clearGhosts();
		this.occupancyCache.clear();

		barEl.style.display = "";
		barEl.removeClass("lc-dragging");
		barEl.dataset.justDragged = "true";
		requestAnimationFrame(() => { delete barEl.dataset.justDragged; });

		this.ctx = null;
		this.prevDayDelta = null;

		if (dayDelta === 0) return;

		// Write new dates — don't re-render immediately.
		// metadataCache.on('changed') will trigger re-render
		// once the cache has actually re-indexed the file.
		const mapping = this.getMapping();
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
		if (!file) return;

		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm[mapping.startDateProp] = formatDate(newStart);
			if (formatDate(newStart) !== formatDate(newEnd) || fm[mapping.endDateProp]) {
				fm[mapping.endDateProp] = formatDate(newEnd);
			}
		});
	}

	cleanup(): void {
		document.removeEventListener("mousemove", this.boundMouseMove);
		document.removeEventListener("mouseup", this.boundMouseUp);
		this.clearGhosts();
		this.occupancyCache.clear();
		this.ctx = null;
	}
}
