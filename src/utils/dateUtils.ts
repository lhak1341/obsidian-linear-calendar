/**
 * 1-indexed day of year. Jan 1 = 1, Dec 31 = 365 (or 366).
 */
export function dayOfYear(date: Date): number {
	const start = new Date(date.getFullYear(), 0, 0);
	const diff = date.getTime() - start.getTime();
	return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function daysInYear(year: number): number {
	return isLeapYear(year) ? 366 : 365;
}

export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function dateFromDayOfYear(day: number, year: number): Date {
	const date = new Date(year, 0);
	date.setDate(day);
	return date;
}

export function formatDateRange(start: Date, end: Date): string {
	const fmt = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

	if (start.getTime() === end.getTime()) {
		return fmt(start);
	}
	return `${fmt(start)} → ${fmt(end)}`;
}

/**
 * Parse a frontmatter value into a Date. Handles:
 * - Date objects (Obsidian sometimes returns these)
 * - YYYY-MM-DD strings
 * - ISO 8601 strings
 * Returns null if unparseable.
 */
export function parseDateString(value: unknown): Date | null {
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;
		// YYYY-MM-DD: parse in local time to avoid UTC-midnight off-by-one in negative-offset timezones
		const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
		if (dateOnly) {
			const [y, m, d] = trimmed.split("-").map(Number);
			const local = new Date(y, m - 1, d);
			return isNaN(local.getTime()) ? null : local;
		}
		const parsed = new Date(trimmed);
		if (!isNaN(parsed.getTime())) {
			return parsed;
		}
	}
	if (typeof value === "number") {
		const parsed = new Date(value);
		if (!isNaN(parsed.getTime())) {
			return parsed;
		}
	}
	return null;
}

/**
 * Month boundaries for a given year.
 * Returns array of { name, startDay, days } for each month.
 */
export function monthBoundaries(
	year: number,
): { name: string; startDay: number; days: number }[] {
	const names = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const result: { name: string; startDay: number; days: number }[] = [];
	for (let m = 0; m < 12; m++) {
		const firstOfMonth = new Date(year, m, 1);
		const daysInMonth = new Date(year, m + 1, 0).getDate();
		result.push({
			name: names[m],
			startDay: dayOfYear(firstOfMonth),
			days: daysInMonth,
		});
	}
	return result;
}
