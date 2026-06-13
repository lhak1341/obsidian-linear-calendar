import type { MonthRowRef } from "./GridRenderer";

export class NowIndicator {
	private markedElements: HTMLElement[] = [];
	private createdElements: HTMLElement[] = [];
	private intervalId: number | null = null;
	private rafId: number | null = null;

	render(monthRows: MonthRowRef[], year: number): void {
		this.cleanup();

		const today = new Date();
		if (today.getFullYear() !== year) return;

		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;
			this.markToday(monthRows, today);
		});

		this.intervalId = window.setInterval(() => {
			this.clearMarks();
			this.markToday(monthRows, new Date());
		}, 3600_000);
	}

	private markToday(monthRows: MonthRowRef[], date: Date): void {
		if (monthRows[0]?.layout === "vertical") {
			this.markTodayVertical(monthRows, date);
		} else {
			this.markTodayHorizontal(monthRows, date);
		}
	}

	private markTodayHorizontal(monthRows: MonthRowRef[], date: Date): void {
		const month = date.getMonth();
		const day = date.getDate();

		const row = monthRows.find((r) => r.month === month);
		if (!row) return;

		const daysGrid = row.barsContainer.parentElement;
		if (!daysGrid) return;

		const cells = daysGrid.querySelectorAll(".lc-day-cell");
		const cell = cells[day - 1] as HTMLElement | undefined;
		if (!cell) return;

		const numSpan = cell.querySelector(".lc-day-num");
		if (numSpan) {
			(numSpan as HTMLElement).addClass("lc-today-circle");
			this.markedElements.push(numSpan as HTMLElement);
		}

		daysGrid.style.position = "relative";

		const outline = document.createElement("div");
		outline.className = "lc-today-column";
		outline.style.left = `${cell.offsetLeft}px`;
		outline.style.width = `${cell.offsetWidth}px`;
		daysGrid.appendChild(outline);
		this.createdElements.push(outline);
	}

	private markTodayVertical(monthRows: MonthRowRef[], date: Date): void {
		const month = date.getMonth();
		const day = date.getDate();

		const rowRef = monthRows.find((r) => r.month === month);
		if (!rowRef) return;

		const grid = rowRef.barsContainer.parentElement;
		if (!grid) return;

		// Rectangle highlight on today's day-number span only
		const cell = rowRef.barsContainer.querySelector<HTMLElement>(
			`.lc-vert-day-cell[data-day="${day}"]`,
		);
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

	cleanup(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.clearMarks();
	}
}
