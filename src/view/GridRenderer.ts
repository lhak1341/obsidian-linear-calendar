import type { AlignMode, DailyNoteStyle } from "../types";
import { MAX_WATERFALL_COLS_VERT } from "../constants";

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


export interface MonthRowRef {
	month: number;
	barsContainer: HTMLElement;
	daysInMonth: number;
	weekdayOffset: number;
	totalCols: number;
	layout: "horizontal" | "vertical";
}

export class GridRenderer {
	private containerEl: HTMLElement;
	private monthRows: MonthRowRef[] = [];
	private onDayClick?: (year: number, month: number, day: number) => void;
	private onDayDblClick?: (year: number, month: number, day: number) => void;
	private onDayContextMenu?: (year: number, month: number, day: number, event: MouseEvent) => void;

	constructor(parentEl: HTMLElement) {
		this.containerEl = parentEl.createDiv({ cls: "linear-calendar-grid" });
	}

	setDayClickHandler(handler: (year: number, month: number, day: number) => void): void {
		this.onDayClick = handler;
	}

	setDayDblClickHandler(handler: (year: number, month: number, day: number) => void): void {
		this.onDayDblClick = handler;
	}

	setDayContextMenuHandler(handler: (year: number, month: number, day: number, event: MouseEvent) => void): void {
		this.onDayContextMenu = handler;
	}

	render(year: number, colMinWidth = 0, alignMode: AlignMode = "date", dailyNoteDates: Set<string> = new Set(), dailyNoteColor: string | null = null, dailyNoteStyle: DailyNoteStyle = "tint"): MonthRowRef[] {
		this.containerEl.empty();
		this.monthRows = [];

		this.containerEl.removeClass("lc-vert-grid");
		this.containerEl.addClass("linear-calendar-grid");
		this.containerEl.style.removeProperty("grid-template-columns");
		this.containerEl.style.removeProperty("grid-template-rows");

		const totalCols = this.computeAlignedSize(year, alignMode);

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

	renderVertical(year: number, dailyNoteDates: Set<string> = new Set(), dailyNoteColor: string | null = null, dailyNoteStyle: DailyNoteStyle = "tint", alignMode: AlignMode = "date"): MonthRowRef[] {
		this.containerEl.empty();
		this.monthRows = [];

		this.containerEl.removeClass("linear-calendar-grid");
		this.containerEl.addClass("lc-vert-grid");
		this.containerEl.style.gridTemplateColumns = "repeat(12, 1fr)";
		this.containerEl.style.gridTemplateRows = "auto 1fr";
		this.containerEl.style.minWidth = "";

		const totalRows = this.computeAlignedSize(year, alignMode);

		// Month headers (row 1)
		for (let m = 0; m < 12; m++) {
			const header = this.containerEl.createDiv({ cls: "lc-vert-month-header" });
			header.textContent = MONTH_NAMES[m];
			header.style.gridColumn = `${m + 1}`;
			header.style.gridRow = "1";
		}

		// Per-month containers — each holds day cells (col 1) + bars (cols 2+)
		for (let m = 0; m < 12; m++) {
			const daysInMonth = new Date(year, m + 1, 0).getDate();
			const firstDow = new Date(year, m, 1).getDay();
			const weekdayOffset = alignMode === "weekday" ? firstDow : 0;

			const monthCol = this.containerEl.createDiv({ cls: "lc-vert-month-col" });
			monthCol.style.gridColumn = `${m + 1}`;
			monthCol.style.gridRow = "2";
			monthCol.style.gridTemplateRows = `repeat(${totalRows}, var(--lc-vert-row-h, 20px))`;
			monthCol.style.gridTemplateColumns = `22px repeat(${MAX_WATERFALL_COLS_VERT}, 16px)`;

			for (let d = 1; d <= daysInMonth; d++) {
				const cellEl = monthCol.createDiv({ cls: "lc-vert-day-cell" });
				cellEl.style.gridColumn = "1";
				cellEl.style.gridRow = `${weekdayOffset + d}`;
				cellEl.dataset.day = String(d);
				this.populateDayCell(cellEl, year, m, d, firstDow, dailyNoteDates, dailyNoteColor, dailyNoteStyle);
			}

			this.monthRows.push({
				month: m,
				barsContainer: monthCol,
				daysInMonth,
				weekdayOffset,
				totalCols: MAX_WATERFALL_COLS_VERT,
				layout: "vertical",
			});
		}

		return this.monthRows;
	}

	/** Render a single month into the container — for embedding in other views. */
	renderMonth(
		year: number,
		month: number,
		alignMode: AlignMode = "date",
		dailyNoteDates: Set<string> = new Set(),
		dailyNoteColor: string | null = null,
		dailyNoteStyle: DailyNoteStyle = "tint",
	): MonthRowRef {
		this.containerEl.empty();
		this.monthRows = [];
		this.containerEl.removeClass("lc-vert-grid");
		this.containerEl.addClass("linear-calendar-grid");
		this.containerEl.style.removeProperty("grid-template-columns");
		this.containerEl.style.removeProperty("grid-template-rows");
		this.containerEl.style.minWidth = "";

		const totalCols = this.computeAlignedSize(year, alignMode);
		const colTemplate = `repeat(${totalCols}, 1fr)`;
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		const rowRef = this.renderMonthRow(
			year, month, daysInMonth, colTemplate, alignMode, totalCols,
			dailyNoteDates, dailyNoteColor, dailyNoteStyle,
		);
		this.monthRows.push(rowRef);
		return rowRef;
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

		// Compute first-of-month DOW once; derive per-day DOW by modular arithmetic.
		const firstDow = new Date(year, month, 1).getDay();
		const weekdayOffset = alignMode === "weekday" ? firstDow : 0;

		if (alignMode === "date") {
			for (let d = 1; d <= 31; d++) {
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${d}`;
				cellEl.style.gridRow = "1";
				if (d > daysInMonth) { cellEl.addClass("lc-day-empty"); continue; }
				this.populateDayCell(cellEl, year, month, d, firstDow, dailyNoteDates, dailyNoteColor, dailyNoteStyle);
			}
		} else {
			for (let d = 1; d <= daysInMonth; d++) {
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${weekdayOffset + d}`;
				cellEl.style.gridRow = "1";
				this.populateDayCell(cellEl, year, month, d, firstDow, dailyNoteDates, dailyNoteColor, dailyNoteStyle);
			}
		}

		const barsContainer = daysGrid.createDiv({
			cls: "lc-bars-container",
		});

		return { month, barsContainer, daysInMonth, weekdayOffset, totalCols, layout: "horizontal" };
	}

	private computeAlignedSize(year: number, alignMode: AlignMode): number {
		if (alignMode !== "weekday") return 31;
		let max = 31;
		for (let m = 0; m < 12; m++) {
			const offset = new Date(year, m, 1).getDay();
			const days = new Date(year, m + 1, 0).getDate();
			max = Math.max(max, offset + days);
		}
		return max;
	}

	private populateDayCell(
		cellEl: HTMLElement,
		year: number,
		month: number,
		day: number,
		firstDow: number,
		dailyNoteDates: Set<string>,
		dailyNoteColor: string | null,
		dailyNoteStyle: DailyNoteStyle,
	): void {
		const dow = (firstDow + day - 1) % 7;
		if (dow === 0 || dow === 6) cellEl.addClass("lc-day-weekend");

		const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const hasDailyNote = dailyNoteDates.has(dateKey);
		if (hasDailyNote) cellEl.addClass("lc-has-daily-note");

		cellEl.createSpan({ cls: "lc-day-num", text: String(day) });
		cellEl.createSpan({ cls: "lc-day-weekday", text: WEEKDAY_ABBR[dow] });

		this.attachCellHandlers(cellEl, year, month, day, hasDailyNote, dailyNoteColor, dailyNoteStyle);
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

		cellEl.addEventListener("contextmenu", (event: MouseEvent) => {
			event.preventDefault();
			this.onDayContextMenu?.(year, month, day, event);
		});
	}

	getContainer(): HTMLElement {
		return this.containerEl;
	}

	getMonthRows(): MonthRowRef[] {
		return this.monthRows;
	}
}
