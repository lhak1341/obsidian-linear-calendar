import type { CalendarItem, ColumnMapping } from "../types";
import { parseDateString } from "./dateUtils";

export interface MappedDisplayFields {
	/** All linear-calendar/ subtags present, in frontmatter order. Excludes the bare gate tag. */
	tags: string[];
	icon: string | undefined;
	anniversary: boolean;
	description: string | undefined;
}

/** Coerces a raw frontmatter.tags value (array, single string, or absent) into a string[]. */
function coerceTagsField(raw: unknown): string[] {
	if (!raw) return [];
	return Array.isArray(raw)
		? raw.map(String)
		: typeof raw === "string"
			? [raw]
			: [];
}

/**
 * Whether a note is gated into the calendar: tagged #linear-calendar (or a subtag) either
 * in frontmatter (`rawFmTags`, no "#" prefix) or inline in the note body (`inlineTags`, "#"
 * prefix required — that's how Obsidian's metadataCache reports inline tags).
 */
export function hasGateTag(rawFmTags: unknown, inlineTags: string[]): boolean {
	const fmTags = coerceTagsField(rawFmTags);
	return (
		fmTags.some((t) => t === "linear-calendar" || t.startsWith("linear-calendar/")) ||
		inlineTags.some((t) => t === "#linear-calendar" || t.startsWith("#linear-calendar/"))
	);
}

/**
 * Reads the fields shared by mapFrontmatterToItem, CreateEventModal.prefillFromFile, and
 * NoteCreator.promoteReminder off a note's frontmatter via ColumnMapping. Returns raw
 * matches only — title resolution (the "__filename__" sentinel + its basename fallback)
 * and tag/fallback selection (e.g. promoteReminder alone also matches the bare gate tag)
 * are intentionally caller-specific; don't fold them in here.
 */
export function extractDisplayFields(
	frontmatter: Record<string, unknown>,
	mapping: ColumnMapping,
): MappedDisplayFields {
	const tags = coerceTagsField(frontmatter.tags).filter((t) => t.startsWith("linear-calendar/"));

	const iconRaw = frontmatter[mapping.iconProp];
	const icon =
		mapping.iconProp && typeof iconRaw === "string"
			? iconRaw
			: undefined;

	const anniversary =
		mapping.anniversaryProp ? frontmatter[mapping.anniversaryProp] === true : false;

	const descRaw = mapping.descriptionProp ? frontmatter[mapping.descriptionProp] : undefined;
	const description = typeof descRaw === "string" && descRaw.trim() ? descRaw.trim() : undefined;

	return { tags, icon, anniversary, description };
}

/**
 * Maps a note's frontmatter into a CalendarItem, or null if the note isn't a
 * calendar entry. Gate: only notes tagged #linear-calendar (or a subtag) are
 * mapped — frontmatter.tags carries no "#" prefix, inlineTags does.
 */
export function mapFrontmatterToItem(
	frontmatter: Record<string, unknown> | undefined,
	inlineTags: string[],
	filePath: string,
	basename: string,
	mapping: ColumnMapping,
): CalendarItem | null {
	if (!frontmatter) return null;
	if (!hasGateTag(frontmatter.tags, inlineTags)) return null;

	const startRaw = frontmatter[mapping.startDateProp];
	if (startRaw === undefined) return null;

	const dateStart = parseDateString(startRaw);
	if (!dateStart) return null;

	const endRaw = frontmatter[mapping.endDateProp];
	const parsedEnd = endRaw !== undefined ? parseDateString(endRaw) : null;
	const dateEnd = parsedEnd ?? new Date(dateStart);

	const titleRaw = frontmatter[mapping.titleProp];
	const title =
		mapping.titleProp === "__filename__"
			? basename
			: typeof titleRaw === "string"
				? titleRaw
				: basename;

	const { tags, icon, anniversary, description } = extractDisplayFields(frontmatter, mapping);

	return {
		filePath,
		title,
		dateStart,
		dateEnd,
		tags,
		icon,
		anniversary: anniversary || undefined,
		description,
	};
}

/**
 * Derives a synthetic ghost item from a real item's note when that note also
 * carries a remindProp date — e.g. a note dated today can additionally ghost
 * itself onto a future date as a reminder. Returns null when remindProp is
 * unset or unparseable. The ghost has no independent existence: it shares the
 * source note's filePath, title, tags, and icon, just a different single-day
 * dateStart/dateEnd and isReminder: true.
 */
export function deriveReminderItem(
	item: CalendarItem,
	frontmatter: Record<string, unknown>,
	mapping: ColumnMapping,
): CalendarItem | null {
	if (!mapping.remindProp) return null;

	const remindRaw = frontmatter[mapping.remindProp];
	if (remindRaw === undefined) return null;

	const remindOn = parseDateString(remindRaw);
	if (!remindOn) return null;

	return {
		...item,
		dateStart: remindOn,
		dateEnd: remindOn,
		anniversary: undefined,
		isReminder: true,
	};
}
