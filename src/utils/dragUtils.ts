import type { CalendarItem } from "../types";

/** Recurrence projections and reminder ghosts have no independent frontmatter to drag-write to. */
export function canDrag(item: CalendarItem): boolean {
	return item.kind === "event";
}

export function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

export function newDatesFromDelta(
	originalStart: Date,
	originalEnd: Date,
	mode: "resize-start" | "resize-end" | "move",
	dayDelta: number,
): { newStart: Date; newEnd: Date } {
	if (mode === "resize-end") {
		const newEnd = addDays(originalEnd, dayDelta);
		return {
			newStart: new Date(originalStart),
			newEnd: newEnd < originalStart ? new Date(originalStart) : newEnd,
		};
	}
	if (mode === "resize-start") {
		const newStart = addDays(originalStart, dayDelta);
		return {
			newStart: newStart > originalEnd ? new Date(originalEnd) : newStart,
			newEnd: new Date(originalEnd),
		};
	}
	return {
		newStart: addDays(originalStart, dayDelta),
		newEnd: addDays(originalEnd, dayDelta),
	};
}
