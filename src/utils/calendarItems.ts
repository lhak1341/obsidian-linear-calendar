import type { CalendarItem, RawCalendarItem } from "../types";
import { projectAnniversaryDates } from "./dateUtils";

/**
 * Turns the notes' raw items into the items shown for `year`: projects anniversary notes
 * from earlier years into `year` as `recurrence` items, drops anything outside the year,
 * and clamps spans to the year's edges. Origin-year anniversaries and reminder ghosts pass
 * through with their own kind.
 */
export function expandForYear(rawItems: RawCalendarItem[], year: number): CalendarItem[] {
	const yearStart = new Date(year, 0, 1);
	const yearEnd = new Date(year, 11, 31);
	const items: CalendarItem[] = [];

	for (const raw of rawItems) {
		const { anniversary, ...base } = raw;
		let { dateStart, dateEnd } = raw;

		const isProjected = raw.kind === "event" && anniversary === true && dateStart.getFullYear() < year;
		if (isProjected) {
			({ dateStart, dateEnd } = projectAnniversaryDates(dateStart, dateEnd, year));
		}

		if (dateStart > yearEnd || dateEnd < yearStart) continue;

		const clamped = {
			...base,
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
