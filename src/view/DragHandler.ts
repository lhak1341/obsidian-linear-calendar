import type { RowRef } from "./GridRenderer";
import { gridArea, type BarLayout, type RowSegment } from "../utils/barLayout";
import { startDragSession, type DragMode, type DragSession, type DragSpan } from "../utils/dragSession";
import type { DropCommitFn } from "../types";

/** What one `BarRenderer.render` pass hands every bar it attaches: the rendered rows and the bar layout drags are previewed against. */
export interface DragScene {
	rowRefs: RowRef[];
	layout: BarLayout;
}

interface DragContext {
	session: DragSession;
	barEl: HTMLElement;
	/** The bar's `--lc-hue`, copied onto its ghosts. */
	barHue: string;
	barLabel: string;
	filePath: string;
	originalStart: Date;
	/** The range row the dragged bar's own slice is in. */
	homeRow: number;
	scene: DragScene;
	mode: DragMode;
	startX: number;
	startY: number;
}

/**
 * The DOM side of a drag: listeners, cursor and dragging classes, the ghost pool, grid styling.
 * It decides nothing: whether a press is a click, which day the pointer is on, and whether a
 * release writes are the `DragSession`'s (`utils/dragSession.ts`, tested).
 */
export class DragHandler {
	private ctx: DragContext | null = null;
	/** Reusable ghost pool — update in place, hide extras */
	private ghostPool: HTMLElement[] = [];
	private activeGhostCount = 0;
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;

	constructor(private onDropCommit: DropCommitFn) {
		this.boundMouseMove = this.onMouseMove.bind(this);
		this.boundMouseUp = () => { void this.onMouseUp(); };
	}

	attach(barEl: HTMLElement, segment: RowSegment, scene: DragScene): void {
		const leftHandle = barEl.createDiv({ cls: "lc-drag-handle lc-drag-handle-left" });
		const rightHandle = barEl.createDiv({ cls: "lc-drag-handle lc-drag-handle-right" });

		const onHandle = (e: MouseEvent, mode: DragMode) => {
			e.stopPropagation();
			e.preventDefault();
			this.press(e, barEl, segment, scene, mode, true);
		};
		leftHandle.addEventListener("mousedown", (e) => onHandle(e, "resize-start"));
		rightHandle.addEventListener("mousedown", (e) => onHandle(e, "resize-end"));

		// A body press is ambiguous with a plain click (which opens the note, see BarRenderer's
		// click listener): the session arms only once the pointer has really moved.
		barEl.addEventListener("mousedown", (e) => {
			if (e.button !== 0) return;
			if ((e.target as HTMLElement).classList.contains("lc-drag-handle")) return;
			this.press(e, barEl, segment, scene, "move", false);
		});
	}

	private press(e: MouseEvent, barEl: HTMLElement, segment: RowSegment, scene: DragScene, mode: DragMode, armed: boolean): void {
		const daysGrid = barEl.closest(".lc-days-grid");
		if (!daysGrid) return;
		const totalCols = scene.rowRefs.find((r) => r.row === segment.row)?.totalCols ?? 31;
		const { dateStart, dateEnd } = segment.item;
		const session = startDragSession({ start: dateStart, end: dateEnd }, mode, daysGrid.clientWidth / totalCols, armed);
		if (!session) return;

		this.ctx = {
			session,
			barEl,
			barHue: barEl.style.getPropertyValue("--lc-hue"),
			barLabel: segment.item.title,
			filePath: segment.item.filePath,
			originalStart: new Date(dateStart),
			homeRow: segment.row,
			scene,
			mode,
			startX: e.clientX,
			startY: e.clientY,
		};
		if (session.armed) this.showDragging();

		activeDocument.addEventListener("mousemove", this.boundMouseMove);
		activeDocument.addEventListener("mouseup", this.boundMouseUp);
	}

	private showDragging(): void {
		if (!this.ctx) return;
		this.ctx.barEl.addClass("lc-dragging");
		activeDocument.body.addClass(this.ctx.mode === "move" ? "lc-drag-cursor-grabbing" : "lc-drag-cursor-resize");
	}

	private onMouseMove(e: MouseEvent): void {
		if (!this.ctx) return;
		const { session } = this.ctx;
		const wasArmed = session.armed;
		const span = session.pointer(e.clientX - this.ctx.startX, e.clientY - this.ctx.startY);
		if (!wasArmed && session.armed) this.showDragging();
		if (span) this.updateVisuals(span);
	}

	private updateVisuals(span: DragSpan): void {
		if (!this.ctx) return;
		const { barEl, barHue, barLabel, homeRow, scene } = this.ctx;

		const { home, ghosts } = scene.layout.previewMove(homeRow, span.start, span.end);

		// Update real bar in its home row
		const homeOffset = scene.rowRefs.find((r) => r.row === homeRow)?.weekdayOffset ?? 0;
		if (home) {
			barEl.style.gridColumn = gridArea(home, 0, homeOffset, "horizontal").gridColumn;
			barEl.removeClass("lc-hidden");
		} else {
			barEl.addClass("lc-hidden");
		}

		// Update ghosts — reuse pooled elements
		let gi = 0;

		for (const ghostSpan of ghosts) {
			const rowRef = scene.rowRefs.find((r) => r.row === ghostSpan.row);
			if (!rowRef) continue;

			const { gridColumn, gridRow } = gridArea(ghostSpan, ghostSpan.lane, rowRef.weekdayOffset, "horizontal");

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
			ghost.style.setProperty("--lc-hue", barHue);
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

		const ctx = this.ctx;
		if (!ctx) return;
		this.ctx = null;
		const commit = ctx.session.release();

		// An unarmed press was a click: leave the bar alone so its click listener opens the note.
		if (ctx.session.armed) {
			const { barEl } = ctx;
			this.clearGhosts();
			barEl.removeClass("lc-hidden");
			barEl.removeClass("lc-dragging");
			barEl.dataset.justDragged = "true";
			window.requestAnimationFrame(() => { delete barEl.dataset.justDragged; });
		}

		if (!commit) return;
		// Delegate the write; the scanner's onChange repaints the moved bar.
		await this.onDropCommit(ctx.filePath, ctx.originalStart, commit.start, commit.end);
	}

	cleanup(): void {
		activeDocument.removeEventListener("mousemove", this.boundMouseMove);
		activeDocument.removeEventListener("mouseup", this.boundMouseUp);
		this.clearGhosts();
		this.ctx = null;
	}
}
