import { describe, it, expect } from "vitest";
import { addDays, newDatesFromDelta, canDrag } from "./dragUtils";
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

describe("addDays", () => {
	it("returns same date for delta 0", () => {
		const d = new Date(2024, 2, 15);
		expect(addDays(d, 0)).toEqual(new Date(2024, 2, 15));
	});

	it("advances by positive days", () => {
		expect(addDays(new Date(2024, 0, 28), 5)).toEqual(new Date(2024, 1, 2));
	});

	it("retreats by negative days", () => {
		expect(addDays(new Date(2024, 2, 1), -1)).toEqual(new Date(2024, 1, 29));
	});

	it("crosses year boundary forward", () => {
		expect(addDays(new Date(2024, 11, 30), 3)).toEqual(new Date(2025, 0, 2));
	});

	it("crosses year boundary backward", () => {
		expect(addDays(new Date(2025, 0, 1), -1)).toEqual(new Date(2024, 11, 31));
	});

	it("does not mutate the input date", () => {
		const original = new Date(2024, 5, 10);
		addDays(original, 7);
		expect(original).toEqual(new Date(2024, 5, 10));
	});
});

describe("newDatesFromDelta", () => {
	const start = new Date(2024, 2, 10); // Mar 10
	const end   = new Date(2024, 2, 20); // Mar 20

	describe("mode: move", () => {
		it("shifts both start and end by delta", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "move", 5);
			expect(newStart).toEqual(new Date(2024, 2, 15));
			expect(newEnd).toEqual(new Date(2024, 2, 25));
		});

		it("shifts backwards with negative delta", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "move", -3);
			expect(newStart).toEqual(new Date(2024, 2, 7));
			expect(newEnd).toEqual(new Date(2024, 2, 17));
		});

		it("returns unchanged dates for delta 0", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "move", 0);
			expect(newStart).toEqual(start);
			expect(newEnd).toEqual(end);
		});
	});

	describe("mode: resize-end", () => {
		it("extends end, keeps start", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-end", 5);
			expect(newStart).toEqual(start);
			expect(newEnd).toEqual(new Date(2024, 2, 25));
		});

		it("shrinks end, keeps start", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-end", -3);
			expect(newStart).toEqual(start);
			expect(newEnd).toEqual(new Date(2024, 2, 17));
		});

		it("clamps end to start when delta would push end before start", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-end", -100);
			expect(newEnd).toEqual(start);
			expect(newStart).toEqual(start);
		});
	});

	describe("mode: resize-start", () => {
		it("moves start earlier, keeps end", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-start", -5);
			expect(newStart).toEqual(new Date(2024, 2, 5));
			expect(newEnd).toEqual(end);
		});

		it("moves start later, keeps end", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-start", 3);
			expect(newStart).toEqual(new Date(2024, 2, 13));
			expect(newEnd).toEqual(end);
		});

		it("clamps start to end when delta would push start past end", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-start", 100);
			expect(newStart).toEqual(end);
			expect(newEnd).toEqual(end);
		});
	});

	it("does not mutate input dates", () => {
		const s = new Date(2024, 2, 10);
		const e = new Date(2024, 2, 20);
		newDatesFromDelta(s, e, "move", 7);
		expect(s).toEqual(new Date(2024, 2, 10));
		expect(e).toEqual(new Date(2024, 2, 20));
	});
});

describe("canDrag", () => {
	it("normal item is draggable", () => expect(canDrag(makeItem())).toBe(true));
	it("recurrence projection is not draggable", () =>
		expect(canDrag({ ...makeItem(), kind: "recurrence", originYear: 2020 })).toBe(false));
	it("reminder ghost is not draggable", () => expect(canDrag({ ...makeItem(), kind: "reminder" })).toBe(false));
});
