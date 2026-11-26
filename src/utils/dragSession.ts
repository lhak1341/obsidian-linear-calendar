import type { CalendarItem } from "../types";
import { dayNumber } from "./dateUtils";

/** Which part of a bar the pointer holds: an edge handle (resize) or the body (move). */
export type DragMode = "resize-start" | "resize-end" | "move";

export interface DragSpan {
	start: Date;
	end: Date;
}

/**
 * One press on a bar, from mousedown to mouseup: every decision a drag makes, with no DOM.
 * `DragHandler` feeds it pointer offsets and paints what it answers.
 */
export interface DragSession {
	/** True once dragging: from the start for a handle, past the threshold on either axis for a body press. */
	readonly armed: boolean;
	/** Pointer offset from the press, in px. The new span when the day delta changed since the last answer, else null. */
	pointer(dx: number, dy: number): DragSpan | null;
	/** The span to write, or null: never armed (the press was a click), or the dates equal the original by calendar day. */
	release(): DragSpan | null;
}

/** Pointer travel, in px on either axis, before a body press stops being a click and becomes a drag. */
const DRAG_THRESHOLD_PX = 4;

/** Recurrence projections and reminder ghosts have no independent frontmatter to drag-write to. */
export function canDrag(item: CalendarItem): boolean {
	return item.kind === "event";
}

/**
 * Starts a session for a bar spanning `span`. `armed` is true for a handle press, false for a
 * body press, which a plain click must not turn into a drag. Returns null when `dayWidth` is not a
 * finite number above 0 (a hidden grid measures 0): no drag starts and the press stays a click,
 * where dividing by it would write "Invalid date".
 */
export function startDragSession(span: DragSpan, mode: DragMode, dayWidth: number, armed: boolean): DragSession | null {
	if (!Number.isFinite(dayWidth) || dayWidth <= 0) return null;
	const original: DragSpan = { start: new Date(span.start), end: new Date(span.end) };
	let isArmed = armed;
	let dayDelta = 0;

	return {
		get armed() {
			return isArmed;
		},
		pointer(dx, dy) {
			if (!isArmed) {
				if (Math.abs(dx) <= DRAG_THRESHOLD_PX && Math.abs(dy) <= DRAG_THRESHOLD_PX) return null;
				isArmed = true;
			}
			const next = Math.round(dx / dayWidth);
			if (next === dayDelta) return null;
			dayDelta = next;
			return spanAfter(original, mode, dayDelta);
		},
		release() {
			// An unarmed press never moved its day delta off 0, so a click releases unchanged dates too.
			const next = spanAfter(original, mode, dayDelta);
			const unchanged =
				dayNumber(next.start) === dayNumber(original.start) && dayNumber(next.end) === dayNumber(original.end);
			return unchanged ? null : next;
		},
	};
}

/** The span after `dayDelta` days in `mode`; a resize never crosses the other edge (it stops there). */
function spanAfter({ start, end }: DragSpan, mode: DragMode, dayDelta: number): DragSpan {
	if (mode === "resize-end") {
		const newEnd = addDays(end, dayDelta);
		return { start: new Date(start), end: newEnd < start ? new Date(start) : newEnd };
	}
	if (mode === "resize-start") {
		const newStart = addDays(start, dayDelta);
		return { start: newStart > end ? new Date(end) : newStart, end: new Date(end) };
	}
	return { start: addDays(start, dayDelta), end: addDays(end, dayDelta) };
}

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}
