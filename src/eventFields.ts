import type { ColumnMapping } from "./types";
import { parseDateString, formatISODate } from "./utils/dateUtils";
import { extractDisplayFields } from "./utils/frontmatterMapper";
import { coerceTags, resolveCalendarTags } from "./utils/frontmatterUtils";

export type Frontmatter = Record<string, unknown>;

/** The user-editable fields of an event note. */
export interface EventFields {
	title?: string;
	/** Full subtag, e.g. "linear-calendar/work". Omit for the bare "linear-calendar" gate tag. */
	tag?: string;
	anniversary?: boolean;
	icon?: string;
	dateEnd?: Date;
	description?: string;
	/** Date the note's reminder ghost appears on; written to the mapping's `remindProp`. */
	remindOn?: Date;
}

/**
 * Writes `fields` into `fm` through the column mapping. `merge` (create) leaves omitted
 * fields as they were, since a template may already have set them; `replace` (update)
 * clears them, since the caller submits the note's full state.
 */
export function applyFields(fm: Frontmatter, mapping: ColumnMapping, date: Date, fields: EventFields, mode: "merge" | "replace"): void {
	const set = (prop: string, value: string | undefined): void => {
		if (!prop) return;
		if (value) fm[prop] = value;
		else if (mode === "replace") delete fm[prop];
	};

	fm[mapping.startDateProp] = formatISODate(date);
	set(mapping.endDateProp, fields.dateEnd ? formatISODate(fields.dateEnd) : undefined);
	if (mapping.titleProp !== "__filename__") set(mapping.titleProp, fields.title?.trim());
	set(mapping.iconProp, fields.icon?.trim());
	set(mapping.descriptionProp, fields.description?.trim());
	set(mapping.remindProp, fields.remindOn ? formatISODate(fields.remindOn) : undefined);
	if (mapping.anniversaryProp && (fields.anniversary || mode === "replace")) {
		fm[mapping.anniversaryProp] = !!fields.anniversary;
	}

	const resolved = resolveCalendarTags(fm.tags, fields.tag);
	if (mode === "merge") {
		fm.tags = resolved;
		return;
	}
	// The modal edits one category; keep any further calendar subtags the note carries.
	const extraSubtags = coerceTags(fm.tags)
		.filter((t) => t.startsWith("linear-calendar/"))
		.slice(1);
	fm.tags = [...resolved, ...extraSubtags.filter((t) => !resolved.includes(t))];
}

/**
 * The inverse of `applyFields`: a note's start date (null if absent or unparseable) and its
 * `EventFields`, read through the column mapping. `title` is the raw frontmatter value, or
 * undefined when it is not a string (always so for `titleProp` `"__filename__"`, which is no
 * frontmatter key) — the caller picks its own fallback (a filename, a date-prefix-stripped
 * filename, or blank).
 * `tag` is the first `linear-calendar/*` subtag; a note with only the bare gate tag has none.
 */
export function readEventFields(fm: Frontmatter, mapping: ColumnMapping): { date: Date | null; fields: EventFields } {
	const { tags, icon, anniversary, description } = extractDisplayFields(fm, mapping);
	const titleRaw = fm[mapping.titleProp];
	const dateEnd = mapping.endDateProp ? parseDateString(fm[mapping.endDateProp]) : null;
	const remindOn = mapping.remindProp ? parseDateString(fm[mapping.remindProp]) : null;
	return {
		date: parseDateString(fm[mapping.startDateProp]),
		fields: {
			title: typeof titleRaw === "string" ? titleRaw : undefined,
			tag: tags[0],
			anniversary,
			icon,
			dateEnd: dateEnd ?? undefined,
			description,
			remindOn: remindOn ?? undefined,
		},
	};
}
