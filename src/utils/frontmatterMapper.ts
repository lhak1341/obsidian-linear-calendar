import type { CalendarItem, ColumnMapping } from "../types";
import { parseDateString } from "./dateUtils";

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

	const fmTags = Array.isArray(frontmatter.tags)
		? frontmatter.tags.map(String)
		: typeof frontmatter.tags === "string"
			? [frontmatter.tags]
			: [];
	const hasGateTag =
		fmTags.some((t) => t === "linear-calendar" || t.startsWith("linear-calendar/")) ||
		inlineTags.some((t) => t === "#linear-calendar" || t.startsWith("#linear-calendar/"));
	if (!hasGateTag) return null;

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

	const tags: string[] = [];
	const rawTags = frontmatter.tags;
	if (rawTags) {
		const tagList = Array.isArray(rawTags)
			? rawTags.map(String)
			: typeof rawTags === "string"
				? [rawTags]
				: [];
		for (const t of tagList) {
			if (t.startsWith("linear-calendar/")) {
				tags.push(t);
			}
		}
	}

	const iconRaw = frontmatter[mapping.iconProp];
	const icon =
		mapping.iconProp && typeof iconRaw === "string"
			? iconRaw
			: undefined;

	const anniversary =
		mapping.anniversaryProp ? frontmatter[mapping.anniversaryProp] === true : false;

	const descRaw = mapping.descriptionProp ? frontmatter[mapping.descriptionProp] : undefined;
	const description = typeof descRaw === "string" && descRaw.trim() ? descRaw.trim() : undefined;

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
