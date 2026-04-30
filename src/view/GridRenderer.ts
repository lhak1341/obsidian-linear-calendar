import type { AlignMode, DailyNoteStyle } from "../types";

function computeTint(color: string | null, hover: boolean): string {
	const pct = hover ? 22 : 12;
	if (!color) return `color-mix(in srgb, var(--color-accent) ${pct}%, transparent)`;
	const r = parseInt(color.slice(1, 3), 16);
	const g = parseInt(color.slice(3, 5), 16);
	const b = parseInt(color.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${hover ? 0.25 : 0.15})`;
}

function computeSolidColor(color: string | null): string {
	return color ?? "var(--color-accent)";
}

const MONTH_NAMES = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DATE_TOTAL_COLS = 31;

export interface MonthRowRef {
	month: number;
	barsContainer: HTMLElement;
	daysInMonth: number;
	weekdayOffset: number;
	totalCols: number;
}

export class GridRenderer {
	private containerEl: HTMLElement;
	private monthRows: MonthRowRef[] = [];
	private onDayClick?: (year: number, month: number, day: number) => void;
	private onDayDblClick?: (year: number, month: number, day: number) => void;

	constructor(parentEl: HTMLElement) {
		this.containerEl = parentEl.createDiv({ cls: "linear-calendar-grid" });
	}

	setDayClickHandler(handler: (year: number, month: number, day: number) => void): void {
		this.onDayClick = handler;
	}

	setDayDblClickHandler(handler: (year: number, month: number, day: number) => void): void {
		this.onDayDblClick = handler;
	}

	/**
	 * @param colMinWidth - 0 = fit to screen (pure 1fr), >0 = minmax(Npx, 1fr)
	 */
	render(year: number, colMinWidth = 0, alignMode: AlignMode = "date", dailyNoteDates: Set<string> = new Set(), dailyNoteColor: string | null = null, dailyNoteStyle: DailyNoteStyle = "tint"): MonthRowRef[] {
		this.containerEl.empty();
		this.monthRows = [];

		let totalCols = DATE_TOTAL_COLS;
		if (alignMode === "weekday") {
			for (let m = 0; m < 12; m++) {
				const offset = new Date(year, m, 1).getDay();
				const days = new Date(year, m + 1, 0).getDate();
				totalCols = Math.max(totalCols, offset + days);
			}
		}

		const colTemplate =
			colMinWidth > 0
				? `repeat(${totalCols}, minmax(${colMinWidth}px, 1fr))`
				: `repeat(${totalCols}, 1fr)`;

		this.containerEl.style.minWidth = colMinWidth > 0 ? "max-content" : "";

		for (let m = 0; m < 12; m++) {
			const days = new Date(year, m + 1, 0).getDate();
			const rowRef = this.renderMonthRow(year, m, days, colTemplate, alignMode, totalCols, dailyNoteDates, dailyNoteColor, dailyNoteStyle);
			this.monthRows.push(rowRef);
		}

		return this.monthRows;
	}

	private renderMonthRow(
		year: number,
		month: number,
		daysInMonth: number,
		colTemplate: string,
		alignMode: AlignMode,
		totalCols: number,
		dailyNoteDates: Set<string>,
		dailyNoteColor: string | null,
		dailyNoteStyle: DailyNoteStyle,
	): MonthRowRef {
		const row = this.containerEl.createDiv({ cls: "lc-month-row" });

		row.createDiv({
			cls: "lc-month-label",
			text: MONTH_NAMES[month],
		});

		const daysGrid = row.createDiv({ cls: "lc-days-grid" });
		daysGrid.style.gridTemplateColumns = colTemplate;

		const weekdayOffset = alignMode === "weekday"
			? new Date(year, month, 1).getDay()
			: 0;

		if (alignMode === "date") {
			for (let d = 1; d <= 31; d++) {
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${d}`;
				cellEl.style.gridRow = "1";

				if (d > daysInMonth) {
					cellEl.addClass("lc-day-empty");
					continue;
				}

				const date = new Date(year, month, d);
				const dow = date.getDay();
				if (dow === 0 || dow === 6) cellEl.addClass("lc-day-weekend");

				const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
				const hasDailyNote = dailyNoteDates.has(dateKey);
				if (hasDailyNote) cellEl.addClass("lc-has-daily-note");

				cellEl.createSpan({ cls: "lc-day-num", text: String(d) });
				cellEl.createSpan({ cls: "lc-day-weekday", text: WEEKDAY_ABBR[dow] });

				this.attachCellHandlers(cellEl, year, month, d, hasDailyNote, dailyNoteColor, dailyNoteStyle);
			}
		} else {
			for (let d = 1; d <= daysInMonth; d++) {
				const col = weekdayOffset + d;
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${col}`;
				cellEl.style.gridRow = "1";

				const date = new Date(year, month, d);
				const dow = date.getDay();
				if (dow === 0 || dow === 6) cellEl.addClass("lc-day-weekend");

				const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
				const hasDailyNote = dailyNoteDates.has(dateKey);
				if (hasDailyNote) cellEl.addClass("lc-has-daily-note");

				cellEl.createSpan({ cls: "lc-day-num", text: String(d) });
				cellEl.createSpan({ cls: "lc-day-weekday", text: WEEKDAY_ABBR[dow] });

				this.attachCellHandlers(cellEl, year, month, d, hasDailyNote, dailyNoteColor, dailyNoteStyle);
			}
		}

		const barsContainer = daysGrid.createDiv({
			cls: "lc-bars-container",
		});

		return { month, barsContainer, daysInMonth, weekdayOffset, totalCols };
	}

	private attachCellHandlers(
		cellEl: HTMLElement,
		year: number,
		month: number,
		day: number,
		hasDailyNote: boolean,
		dailyNoteColor: string | null,
		dailyNoteStyle: DailyNoteStyle,
	): void {
		if (hasDailyNote) {
			if (dailyNoteStyle === "tint") {
				cellEl.addClass("lc-daily-tint");
				cellEl.style.setProperty("--lc-daily-tint", computeTint(dailyNoteColor, false));
				cellEl.style.setProperty("--lc-daily-tint-hover", computeTint(dailyNoteColor, true));
			} else {
				cellEl.addClass("lc-daily-border-top");
				cellEl.style.setProperty("--lc-daily-color", computeSolidColor(dailyNoteColor));
			}

			let singleClickTimer: ReturnType<typeof setTimeout> | null = null;
			cellEl.addEventListener("click", () => {
				singleClickTimer = setTimeout(() => {
					this.onDayClick?.(year, month, day);
					singleClickTimer = null;
				}, 220);
			});
			cellEl.addEventListener("dblclick", () => {
				if (singleClickTimer) {
					clearTimeout(singleClickTimer);
					singleClickTimer = null;
				}
				this.onDayDblClick?.(year, month, day);
			});
		} else {
			cellEl.addEventListener("dblclick", () => {
				this.onDayDblClick?.(year, month, day);
			});
		}
	}

	getContainer(): HTMLElement {
		return this.containerEl;
	}

	getMonthRows(): MonthRowRef[] {
		return this.monthRows;
	}
}
