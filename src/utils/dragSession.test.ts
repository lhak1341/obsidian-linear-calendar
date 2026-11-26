import { describe, it, expect } from "vitest";
import { canDrag, startDragSession, type DragMode, type DragSession } from "./dragSession";
import type { CalendarItem, CalendarItemBase } from "../types";

function makeItem(overrides: Partial<CalendarItemBase> = {}): CalendarItem {
	return {
		kind: "event",
		filePath: "note.md",
		title: "Note",
		dateStart: new Date(2026, 7, 21),
		dateEnd: new Date(2026, 7, 21),
		...overrides,
	};
}

const DAY = 10; // px per day column
const mar10to20 = { start: new Date(2024, 2, 10), end: new Date(2024, 2, 20) };

function session(mode: DragMode, span = mar10to20, armed = true): DragSession {
	const s = startDragSession(span, mode, DAY, armed);
	if (!s) throw new Error("expected a session");
	return s;
}

/** Drags `days` day columns from the press and releases. */
function dragBy(mode: DragMode, days: number, span = mar10to20) {
	const s = session(mode, span);
	s.pointer(days * DAY, 0);
	return s.release();
}

describe("startDragSession", () => {
	it("starts no session for a width that is zero, negative or not a number", () => {
		for (const width of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(startDragSession(mar10to20, "move", width, true)).toBeNull();
		}
	});

	it("does not mutate the span it was given", () => {
		const span = { start: new Date(2024, 2, 10), end: new Date(2024, 2, 20) };
		dragBy("move", 7, span);
		expect(span).toEqual(mar10to20);
	});
});

describe("body press: click or drag", () => {
	it("stays a click until the pointer passes 4px on either axis", () => {
		const s = session("move", mar10to20, false);
		expect(s.pointer(4, -4)).toBeNull();
		expect(s.armed).toBe(false);
		s.pointer(0, 5);
		expect(s.armed).toBe(true);
	});

	it("arms on a horizontal move past 4px too, and answers that move's span", () => {
		const s = session("move", mar10to20, false);
		expect(s.pointer(-5, 0)).toBeNull(); // armed, still day 0
		expect(s.armed).toBe(true);
		expect(s.pointer(-12, 0)).toEqual({ start: new Date(2024, 2, 9), end: new Date(2024, 2, 19) });
	});

	it("releases nothing when it never armed", () => {
		const s = session("move", mar10to20, false);
		s.pointer(3, 3);
		expect(s.release()).toBeNull();
	});

	it("a handle press is armed from the start", () => {
		expect(session("resize-end").armed).toBe(true);
	});
});

describe("pointer", () => {
	it("answers only when the day changes", () => {
		const s = session("move");
		expect(s.pointer(4, 0)).toBeNull(); // rounds to day 0
		expect(s.pointer(6, 0)).toEqual({ start: new Date(2024, 2, 11), end: new Date(2024, 2, 21) });
		expect(s.pointer(14, 0)).toBeNull(); // still day 1
		expect(s.pointer(4, 0)).toEqual(mar10to20); // back to day 0
	});
});

describe("release", () => {
	it("move: shifts both ends", () => {
		expect(dragBy("move", 5)).toEqual({ start: new Date(2024, 2, 15), end: new Date(2024, 2, 25) });
		expect(dragBy("move", -3)).toEqual({ start: new Date(2024, 2, 7), end: new Date(2024, 2, 17) });
	});

	it("move: crosses New Year both ways", () => {
		const nye = { start: new Date(2024, 11, 30), end: new Date(2024, 11, 31) };
		expect(dragBy("move", 3, nye)).toEqual({ start: new Date(2025, 0, 2), end: new Date(2025, 0, 3) });
		expect(dragBy("move", -365, { start: new Date(2025, 0, 1), end: new Date(2025, 0, 1) }))
			.toEqual({ start: new Date(2024, 0, 2), end: new Date(2024, 0, 2) });
	});

	it("resize-end: moves the end, keeps the start", () => {
		expect(dragBy("resize-end", 5)).toEqual({ start: mar10to20.start, end: new Date(2024, 2, 25) });
		expect(dragBy("resize-end", -3)).toEqual({ start: mar10to20.start, end: new Date(2024, 2, 17) });
	});

	it("resize-end: stops at the start", () => {
		expect(dragBy("resize-end", -100)).toEqual({ start: mar10to20.start, end: mar10to20.start });
	});

	it("resize-start: moves the start, keeps the end", () => {
		expect(dragBy("resize-start", -5)).toEqual({ start: new Date(2024, 2, 5), end: mar10to20.end });
		expect(dragBy("resize-start", 3)).toEqual({ start: new Date(2024, 2, 13), end: mar10to20.end });
	});

	it("resize-start: stops at the end", () => {
		expect(dragBy("resize-start", 100)).toEqual({ start: mar10to20.end, end: mar10to20.end });
	});

	it("releases nothing when dragged back to where it started", () => {
		const s = session("move");
		s.pointer(30, 0);
		s.pointer(0, 0);
		expect(s.release()).toBeNull();
	});

	it("releases nothing for a resize stopped at an edge it already sat on", () => {
		const oneDay = { start: new Date(2024, 2, 10), end: new Date(2024, 2, 10) };
		expect(dragBy("resize-end", -3, oneDay)).toBeNull();
		expect(dragBy("resize-start", 3, oneDay)).toBeNull();
	});
});

describe("canDrag", () => {
	it("normal item is draggable", () => expect(canDrag(makeItem())).toBe(true));
	it("recurrence projection is not draggable", () =>
		expect(canDrag({ ...makeItem(), kind: "recurrence", originYear: 2020 })).toBe(false));
	it("reminder ghost is not draggable", () => expect(canDrag({ ...makeItem(), kind: "reminder" })).toBe(false));
});
