import type { MonthRowRef } from "./GridRenderer";
import { gridArea, type BarLayout, type MonthSegment } from "../utils/barLayout";
import { newDatesFromDelta } from "../utils/dragUtils";
import type { DropCommitFn } from "../types";

/** Minimum pointer movement before an ambiguous mousedown (bar body) commits to a drag. */
const DRAG_THRESHOLD_PX = 4;

/** What one `BarRenderer.render` pass hands every bar it attaches: the month rows and the bar layout drags are previewed against. */
export interface DragScene {
	monthRows: MonthRowRef[];
	layout: BarLayout;
}

interface DragContext {
	barEl: HTMLElement;
	barColor: string;
	barLabel: string;
	filePath: string;
	originalStart: Date;
	originalEnd: Date;
	segMonth: number;
	scene: DragScene;
	mode: "resize-start" | "resize-end" | "move";
	startX: number;
	dayWidth: number;
}

export class DragHandler {
	private ctx: DragContext | null = null;
	/** Reusable ghost pool — update in place, hide extras */
	private ghostPool: HTMLElement[] = [];
	private activeGhostCount = 0;
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;
	private prevDayDelta: number | null = null;

	constructor(private onDropCommit: DropCommitFn) {
		this.boundMouseMove = this.onMouseMove.bind(this);
		this.boundMouseUp = () => { void this.onMouseUp(); };
	}

	attach(barEl: HTMLElement, segment: MonthSegment, scene: DragScene): void {
		const leftHandle = barEl.createDiv({ cls: "lc-drag-handle lc-drag-handle-left" });
		const rightHandle = barEl.createDiv({ cls: "lc-drag-handle lc-drag-handle-right" });

		const initDrag = (e: MouseEvent, mode: DragContext["mode"]) => {
			e.stopPropagation();
			e.preventDefault();
			this.startDrag(e, barEl, segment, scene, mode);
		};

		leftHandle.addEventListener("mousedown", (e) => initDrag(e, "resize-start"));
		rightHandle.addEventListener("mousedown", (e) => initDrag(e, "resize-end"));

		barEl.addEventListener("mousedown", (e) => {
			if (e.button !== 0) return;
			if ((e.target as HTMLElement).classList.contains("lc-drag-handle")) return;
			this.watchForDragThreshold(e, (me) => {
				e.preventDefault();
				this.startDrag(e, barEl, segment, scene, "move");
				this.onMouseMove(me);
			});
		});
	}

	/**
	 * Bar-body mousedown is ambiguous with a plain click (which opens the note,
	 * see BarRenderer's click listener) — wait for real pointer movement before
	 * committing to a drag. Drag handles have no such ambiguity and call
	 * startDrag() directly from attach().
	 */
	private watchForDragThreshold(e: MouseEvent, onExceeded: (me: MouseEvent) => void): void {
		const sx = e.clientX;
		const sy = e.clientY;
		const onMove = (me: MouseEvent) => {
			if (Math.abs(me.clientX - sx) > DRAG_THRESHOLD_PX || Math.abs(me.clientY - sy) > DRAG_THRESHOLD_PX) {
				activeDocument.removeEventListener("mousemove", onMove);
				activeDocument.removeEventListener("mouseup", onUp);
				onExceeded(me);
			}
		};
		const onUp = () => {
			activeDocument.removeEventListener("mousemove", onMove);
			activeDocument.removeEventListener("mouseup", onUp);
		};
		activeDocument.addEventListener("mousemove", onMove);
		activeDocument.addEventListener("mouseup", onUp);
	}

	private startDrag(
		e: MouseEvent,
		barEl: HTMLElement,
		segment: MonthSegment,
		scene: DragScene,
		mode: DragContext["mode"],
	): void {
		const daysGrid = barEl.closest(".lc-days-grid");
		if (!daysGrid) return;
		const totalCols = scene.monthRows.find((r) => r.month === segment.month)?.totalCols ?? 31;
		const dayWidth = daysGrid.clientWidth / totalCols;

		this.ctx = {
			barEl,
			barColor: barEl.style.backgroundColor,
			barLabel: segment.item.title,
			filePath: segment.item.filePath,
			// Unclamped span: dateStart/dateEnd are cut to the viewed year and would be written back.
			originalStart: new Date(segment.item.fullStart ?? segment.item.dateStart),
			originalEnd: new Date(segment.item.fullEnd ?? segment.item.dateEnd),
			segMonth: segment.month,
			scene,
			mode,
			startX: e.clientX,
			dayWidth,
		};
		this.prevDayDelta = null;

		barEl.addClass("lc-dragging");
		activeDocument.body.addClass(mode === "move" ? "lc-drag-cursor-grabbing" : "lc-drag-cursor-resize");

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
		const { barEl, barColor, barLabel, segMonth, scene } = this.ctx;

		const { newStart, newEnd } = this.newDatesFromDelta(dayDelta);
		const { home, ghosts } = scene.layout.previewMove(segMonth, newStart, newEnd);

		// Update real bar in home month
		const homeOffset = scene.monthRows.find((r) => r.month === segMonth)?.weekdayOffset ?? 0;
		if (home) {
			barEl.style.gridColumn = gridArea(home, 0, homeOffset, "horizontal").gridColumn;
			barEl.removeClass("lc-hidden");
		} else {
			barEl.addClass("lc-hidden");
		}

		// Update ghosts — reuse pooled elements
		let gi = 0;

		for (const ghostSpan of ghosts) {
			const rowRef = scene.monthRows.find((r) => r.month === ghostSpan.month);
			if (!rowRef) continue;

			const { gridColumn, gridRow } = gridArea(ghostSpan, ghostSpan.row, rowRef.weekdayOffset, "horizontal");

			let ghost: HTMLElement;
			if (gi < this.ghostPool.length) {
				ghost = this.ghostPool[gi];
				ghost.removeClass("lc-hidden");
			} else {
				ghost = createDiv({ cls: "calendar-bar lc-drag-ghost" });
				ghost.createSpan({ cls: "calendar-bar-label" });
				this.ghostPool.push(ghost);
			}

			ghost.style.gridColumn = gridColumn;
			ghost.style.gridRow = gridRow;
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
			this.ghostPool[i].addClass("lc-hidden");
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
		activeDocument.body.removeClass("lc-drag-cursor-grabbing", "lc-drag-cursor-resize");

		if (!this.ctx) return;

		const dayDelta = this.prevDayDelta ?? 0;
		const { newStart, newEnd } = this.newDatesFromDelta(dayDelta);
		const { barEl, filePath, originalStart } = this.ctx;

		this.clearGhosts();

		barEl.removeClass("lc-hidden");
		barEl.removeClass("lc-dragging");
		barEl.dataset.justDragged = "true";
		window.requestAnimationFrame(() => { delete barEl.dataset.justDragged; });

		this.ctx = null;
		this.prevDayDelta = null;

		if (dayDelta === 0) return;

		// Delegate write to caller; EventNotes.move resolves once the metadata cache is fresh.
		await this.onDropCommit(filePath, originalStart, newStart, newEnd);
	}

	cleanup(): void {
		activeDocument.removeEventListener("mousemove", this.boundMouseMove);
		activeDocument.removeEventListener("mouseup", this.boundMouseUp);
		this.clearGhosts();
		this.ctx = null;
	}
}
