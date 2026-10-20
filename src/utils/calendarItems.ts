import type { CalendarItem, RawCalendarItem } from "../types";
import { formatDateRange, projectAnniversaryDates } from "./dateUtils";
import { formatTagLabel } from "./tagUtils";

/**
 * Turns the notes' raw items into the items shown for `year`: projects anniversary notes
 * from earlier years into `year` as `recurrence` items, drops anything outside the year,
 * and clamps spans to the year's edges. Origin-year anniversaries and reminder ghosts pass
 * through with their own kind.
 */
export function expandForYear(rawItems: RawCalendarItem[], year: number): CalendarItem[] {
	const yearStart = new Date(year, 0, 1);
	const yearEnd = new Date(year, 11, 31);
	// Exclusive bound: a start at Dec 31 with a time-of-day is still inside the year.
	const nextYearStart = new Date(year + 1, 0, 1);
	const items: CalendarItem[] = [];

	for (const raw of rawItems) {
		const { anniversary, ...base } = raw;
		let { dateStart, dateEnd } = raw;

		const isProjected = raw.kind === "event" && anniversary === true && dateStart.getFullYear() < year;
		if (isProjected) {
			({ dateStart, dateEnd } = projectAnniversaryDates(dateStart, dateEnd, year));
		}

		if (dateStart >= nextYearStart || dateEnd < yearStart) continue;

		const clamped = {
			...base,
			fullStart: dateStart,
			fullEnd: dateEnd,
			dateStart: dateStart < yearStart ? yearStart : dateStart,
			dateEnd: dateEnd > yearEnd ? yearEnd : dateEnd,
		};
		items.push(
			isProjected
				? { ...clamped, kind: "recurrence", originYear: raw.dateStart.getFullYear() }
				: clamped,
		);
	}

	return items;
}

/** Years elapsed since the note's own date, for a projected `recurrence`; undefined for other kinds. */
export function ageOn(item: CalendarItem): number | undefined {
	return item.kind === "recurrence" ? item.dateStart.getFullYear() - item.originYear : undefined;
}

/** Tag of the notes whose recurrences show their age ("Turns N"). */
const BIRTHDAY_TAG = "linear-calendar/birthday";

/** What a bar's tooltip says about an item, as text; `Tooltip` only paints it. */
export interface ItemDescription {
	title: string;
	/** The note's own span (not clamped to the viewed year), one date or `start → end`. */
	dates: string;
	tagLabels: string[];
	/** "Turns N" for a birthday recurrence; undefined otherwise (including a birthday in its origin year). */
	ageLabel?: string;
	description?: string;
}

export function describeItem(item: CalendarItem): ItemDescription {
	const age = ageOn(item);
	return {
		title: item.title,
		dates: formatDateRange(item.fullStart ?? item.dateStart, item.fullEnd ?? item.dateEnd),
		tagLabels: (item.tags ?? []).map(formatTagLabel),
		ageLabel: age !== undefined && item.tags?.includes(BIRTHDAY_TAG) ? `Turns ${age}` : undefined,
		description: item.description,
	};
}
