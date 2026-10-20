import type { EventFields } from "./eventFields";
import { addMonthsClamped, formatISODate, parseDateString } from "./utils/dateUtils";

export type RemindUnit = "days" | "weeks" | "months" | "years";

/** What the create/edit form holds: raw widget values, dates as `YYYY-MM-DD` or "". */
export interface EventFormState {
	title: string;
	tag: string;
	icon: string;
	anniversary: boolean;
	description: string;
	dateStr: string;
	dateEndStr: string;
	remindEnabled: boolean;
	remindMode: "relative" | "exact";
	remindStr: string;
	remindAmount: string;
	remindUnit: RemindUnit;
}

export type BuiltEventFields =
	| { ok: true; date: Date; fields: EventFields }
	/** `error` is a message to show; absent when the form is simply not submittable yet (no date). */
	| { ok: false; error?: string };

/** A blank form dated `date`. */
export function emptyFormState(date: Date): EventFormState {
	return {
		title: "",
		tag: "",
		icon: "",
		anniversary: false,
		description: "",
		dateStr: formatISODate(date),
		dateEndStr: "",
		remindEnabled: false,
		remindMode: "relative",
		remindStr: "",
		remindAmount: "",
		remindUnit: "days",
	};
}

function parseInput(value: string): Date | undefined {
	return parseDateString(value) ?? undefined;
}

function addToDate(date: Date, amount: number, unit: RemindUnit): Date {
	switch (unit) {
		case "days": return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
		case "weeks": return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount * 7);
		case "months": return addMonthsClamped(date, amount);
		case "years": return addMonthsClamped(date, amount * 12);
	}
}

function remindDate(state: EventFormState, eventDate: Date): Date | undefined {
	if (state.remindMode === "exact") return parseInput(state.remindStr);
	const amount = Number(state.remindAmount);
	if (!Number.isFinite(amount) || amount <= 0) return undefined;
	return addToDate(eventDate, amount, state.remindUnit);
}

/**
 * Form → note fields. `remindProp` is the mapping's reminder property; when it is empty
 * the reminder is dropped whatever the form says.
 */
export function buildEventFields(state: EventFormState, { remindProp }: { remindProp: string }): BuiltEventFields {
	const date = parseInput(state.dateStr);
	if (!date) return { ok: false };
	const dateEnd = parseInput(state.dateEndStr);
	if (dateEnd && dateEnd < date) return { ok: false, error: "End date is before the start date." };
	return {
		ok: true,
		date,
		fields: {
			title: state.title,
			tag: state.tag || undefined,
			icon: state.icon || undefined,
			anniversary: state.anniversary,
			dateEnd,
			description: state.description || undefined,
			remindOn: remindProp && state.remindEnabled ? remindDate(state, date) : undefined,
		},
	};
}

/**
 * Note fields → form, laid over `base` (what the form shows for anything the note lacks).
 * A stored reminder is always shown as an exact date.
 */
export function formStateFromFields(date: Date | null | undefined, fields: EventFields, base: EventFormState): EventFormState {
	return {
		...base,
		title: fields.title ?? "",
		tag: fields.tag ?? "",
		icon: fields.icon || base.icon,
		anniversary: fields.anniversary ?? false,
		description: fields.description || base.description,
		dateStr: date ? formatISODate(date) : base.dateStr,
		dateEndStr: fields.dateEnd ? formatISODate(fields.dateEnd) : base.dateEndStr,
		...(fields.remindOn
			? { remindEnabled: true, remindMode: "exact" as const, remindStr: formatISODate(fields.remindOn) }
			: {}),
	};
}
