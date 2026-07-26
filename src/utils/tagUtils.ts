/** Strip the `linear-calendar/` category prefix for display (chips, tooltips). */
export function formatTagLabel(tag: string): string {
	return tag.replace(/^linear-calendar\//, "");
}
