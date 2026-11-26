import type { CalendarItem, RawCalendarItem } from "../types";
import { dayNumber, formatDateRange, projectAnniversaryDates } from "./dateUtils";
import { formatTagLabel } from "./tagUtils";

/**
 * Turns the notes' raw items into the items touching the calendar days `first`..`last`
 * (inclusive; time of day ignored), each with its own span, never cut to the requested one.
 * An anniversary note yields one copy per year whose copy touches the span: its origin year
 * as an `event`, later years as `recurrence`s with `originYear`. So a note across New
 * Year shows its tail in January as well as its next start in December. Reminder ghosts and
 * plain events pass through when they touch the span.
 */
export function expandForSpan(rawItems: RawCalendarItem[], first: Date, last: Date): CalendarItem[] {
	const from = dayNumber(first);
	const to = dayNumber(last);
	const touches = (start: Date, end: Date) => dayNumber(end) >= from && dayNumber(start) <= to;
	const items: CalendarItem[] = [];

	for (const raw of rawItems) {
		const { anniversary, ...base } = raw;
		if (raw.kind !== "event" || anniversary !== true) {
			if (touches(raw.dateStart, raw.dateEnd)) items.push(base);
			continue;
		}

		const originYear = raw.dateStart.getFullYear();
		// A copy started up to the note's own year spread earlier can still reach `first`; one more
		// year covers a Feb 29 start projecting to Mar 1. Copies that miss the span are dropped below.
		const spread = raw.dateEnd.getFullYear() - originYear + 1;
		for (let year = Math.max(originYear, first.getFullYear() - spread); year <= last.getFullYear(); year++) {
			if (year === originYear) {
				if (touches(raw.dateStart, raw.dateEnd)) items.push(base);
				continue;
			}
			const { dateStart, dateEnd } = projectAnniversaryDates(raw.dateStart, raw.dateEnd, year);
			if (touches(dateStart, dateEnd)) items.push({ ...base, dateStart, dateEnd, kind: "recurrence", originYear });
		}
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
	/** The item's own span (whatever a view shows of it), one date or `start → end`. */
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
		dates: formatDateRange(item.dateStart, item.dateEnd),
		tagLabels: (item.tags ?? []).map(formatTagLabel),
		ageLabel: age !== undefined && item.tags?.includes(BIRTHDAY_TAG) ? `Turns ${age}` : undefined,
		description: item.description,
	};
}
