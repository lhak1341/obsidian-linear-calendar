import type { RowRef } from "./GridRenderer";
import type { ResolvedRange } from "../utils/viewRange";

/** Marks today's cell. Where today sits is the range's answer (`locate`); this only paints it. */
export class NowIndicator {
	private markedElements: HTMLElement[] = [];
	private createdElements: HTMLElement[] = [];
	private intervalId: number | null = null;
	private rafId: number | null = null;
	private rowRefs: RowRef[] = [];
	private range: ResolvedRange | null = null;

	render(rowRefs: RowRef[], range: ResolvedRange): void {
		this.rowRefs = rowRefs;
		this.range = range;

		// The DOM was rebuilt: drop marks on orphaned nodes and any paint still pending.
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.clearMarks();

		const showsToday = range.locate(new Date()) !== null;
		if (!showsToday) {
			this.stopInterval();
			return;
		}

		// Hourly re-mark, so an open view follows the date. Reads this.rowRefs/this.range, which
		// always hold the latest render's, so it survives a rebuild between ticks.
		this.intervalId ??= window.setInterval(() => {
			this.clearMarks();
			this.markToday(new Date());
		}, 3600_000);

		this.rafId = window.requestAnimationFrame(() => {
			this.rafId = null;
			this.markToday(new Date());
		});
	}

	private markToday(date: Date): void {
		const position = this.range?.locate(date);
		if (!position) return;
		const rowRef = this.rowRefs[position.row];
		if (!rowRef) return;

		if (rowRef.layout === "vertical") {
			this.markTodayVertical(rowRef, position.column);
		} else {
			this.markTodayHorizontal(rowRef, position.column);
		}
	}

	private markTodayHorizontal(rowRef: RowRef, column: number): void {
		const daysGrid = rowRef.barsContainer.parentElement;
		if (!daysGrid) return;

		const cell = [...daysGrid.querySelectorAll<HTMLElement>(".lc-day-cell")]
			.find((el) => el.style.gridColumn === String(column + 1));
		if (!cell) return;

		const numSpan = cell.querySelector<HTMLElement>(".lc-day-num");
		if (numSpan) {
			numSpan.addClass("lc-today-circle");
			this.markedElements.push(numSpan);
		}

		const outline = daysGrid.createDiv({ cls: "lc-today-column" });
		// Percentage-based left/width reflows with the grid on container resize.
		// Grid uses repeat(totalCols, 1fr) so each column is exactly 100%/totalCols wide.
		outline.style.left = `${(column / rowRef.totalCols) * 100}%`;
		outline.style.width = `${100 / rowRef.totalCols}%`;
		this.createdElements.push(outline);
	}

	private markTodayVertical(rowRef: RowRef, column: number): void {
		// Rectangle highlight on today's day-number span only
		const cell = [...rowRef.barsContainer.querySelectorAll<HTMLElement>(".lc-vert-day-cell")]
			.find((el) => el.style.gridRow === String(column + 1));
		const numSpan = cell?.querySelector<HTMLElement>(".lc-day-num");
		if (numSpan) {
			numSpan.addClass("lc-today-vert-cell");
			this.markedElements.push(numSpan);
		}
	}

	private clearMarks(): void {
		for (const el of this.markedElements) {
			el.removeClass("lc-today-circle");
			el.removeClass("lc-today-vert-col");
			el.removeClass("lc-today-vert-cell");
		}
		this.markedElements = [];

		for (const el of this.createdElements) {
			el.remove();
		}
		this.createdElements = [];
	}

	private stopInterval(): void {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	cleanup(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.stopInterval();
		this.clearMarks();
		this.range = null;
	}
}
