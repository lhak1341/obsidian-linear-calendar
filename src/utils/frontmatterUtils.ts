/**
 * Resolves the tags array to write for a note: strips any existing bare `linear-calendar`
 * gate tag or subtag, then puts the resolved calendar tag (trimmed `tag`, or the bare gate
 * tag when blank/omitted) at the front. `existingTags` accepts whatever shape frontmatter.tags
 * comes in as (array, single string/number, or absent).
 */
export function resolveCalendarTags(existingTags: unknown, tag: string | undefined): string[] {
	const calendarTag = tag?.trim() || "linear-calendar";
	const existing = Array.isArray(existingTags)
		? (existingTags as unknown[]).map(String)
		: (typeof existingTags === "string" || typeof existingTags === "number") ? [String(existingTags)] : [];
	const withoutGateTag = existing.filter(
		(t) => t !== "linear-calendar" && !t.startsWith("linear-calendar/"),
	);
	withoutGateTag.unshift(calendarTag);
	return withoutGateTag;
}
