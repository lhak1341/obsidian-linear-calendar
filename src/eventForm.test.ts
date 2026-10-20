import { describe, it, expect } from "vitest";
import { buildEventFields, emptyFormState, formStateFromFields, type EventFormState } from "./eventForm";
import type { EventFields } from "./eventFields";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const withRemind = { remindProp: "remindOn" };

function form(over: Partial<EventFormState> = {}): EventFormState {
	return { ...emptyFormState(d(2026, 1, 31)), ...over };
}

function built(over: Partial<EventFormState>, opts = withRemind) {
	const out = buildEventFields(form(over), opts);
	if (!out.ok) throw new Error("expected ok");
	return out;
}

describe("buildEventFields", () => {
	it("is not submittable without a date, and says nothing", () => {
		expect(buildEventFields(form({ dateStr: "" }), withRemind)).toEqual({ ok: false });
	});
	it("rejects an end before the start with a message", () => {
		const out = buildEventFields(form({ dateEndStr: "2026-01-30" }), withRemind);
		expect(out).toEqual({ ok: false, error: "End date is before the start date." });
	});
	it("accepts an end equal to the start", () => {
		expect(built({ dateEndStr: "2026-01-31" }).fields.dateEnd).toEqual(d(2026, 1, 31));
	});
	it("treats an empty end as none", () => expect(built({}).fields.dateEnd).toBeUndefined());
	it("turns empty tag, icon and description into undefined but keeps title as is", () => {
		const { fields } = built({ title: "" });
		expect(fields).toMatchObject({ title: "", tag: undefined, icon: undefined, description: undefined, anniversary: false });
	});
	it("passes filled text fields through", () => {
		const { fields } = built({ title: "Talk", tag: "linear-calendar/work", icon: "mic", description: "hi", anniversary: true });
		expect(fields).toMatchObject({ title: "Talk", tag: "linear-calendar/work", icon: "mic", description: "hi", anniversary: true });
	});

	describe("reminder", () => {
		const on = { remindEnabled: true };
		it("is dropped when disabled", () => expect(built({ remindAmount: "3" }).fields.remindOn).toBeUndefined());
		it("is dropped when the mapping has no remindProp", () => {
			expect(built({ ...on, remindAmount: "3" }, { remindProp: "" }).fields.remindOn).toBeUndefined();
		});
		it("adds days", () => expect(built({ ...on, remindAmount: "3" }).fields.remindOn).toEqual(d(2026, 2, 3)));
		it("adds weeks", () => expect(built({ ...on, remindAmount: "2", remindUnit: "weeks" }).fields.remindOn).toEqual(d(2026, 2, 14)));
		it("clamps months to the target month's last day", () => {
			expect(built({ ...on, remindAmount: "1", remindUnit: "months" }).fields.remindOn).toEqual(d(2026, 2, 28));
		});
		it("clamps Feb 29 plus a year", () => {
			const out = built({ ...on, dateStr: "2028-02-29", remindAmount: "1", remindUnit: "years" });
			expect(out.fields.remindOn).toEqual(d(2029, 2, 28));
		});
		it("ignores a non-positive or non-numeric amount", () => {
			for (const remindAmount of ["", "0", "-2", "abc"]) {
				expect(built({ ...on, remindAmount }).fields.remindOn).toBeUndefined();
			}
		});
		it("uses the exact date in exact mode", () => {
			expect(built({ ...on, remindMode: "exact", remindStr: "2026-03-05", remindAmount: "9" }).fields.remindOn).toEqual(d(2026, 3, 5));
		});
		it("is undefined for an empty exact date", () => {
			expect(built({ ...on, remindMode: "exact" }).fields.remindOn).toBeUndefined();
		});
	});
});

describe("formStateFromFields", () => {
	const base = form({ dateStr: "2026-05-05" });

	it("keeps the base for a note with nothing set", () => {
		expect(formStateFromFields(undefined, {}, base)).toEqual({ ...base, title: "", tag: "", anniversary: false });
	});
	it("shows a stored reminder as an exact date", () => {
		const out = formStateFromFields(d(2026, 1, 1), { remindOn: d(2026, 1, 8) }, base);
		expect(out).toMatchObject({ remindEnabled: true, remindMode: "exact", remindStr: "2026-01-08", dateStr: "2026-01-01" });
	});
	it("round-trips fields through the form", () => {
		const fields: EventFields = {
			title: "Talk", tag: "linear-calendar/work", icon: "mic", anniversary: true,
			dateEnd: d(2026, 1, 3), description: "hi", remindOn: d(2025, 12, 25),
		};
		const date = d(2026, 1, 1);
		const out = buildEventFields(formStateFromFields(date, fields, base), withRemind);
		expect(out).toEqual({ ok: true, date, fields });
	});
});
