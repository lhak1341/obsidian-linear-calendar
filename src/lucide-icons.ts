import { addIcon, getIconIds } from "obsidian";
import lucideIconSvgsJson from "./lucide-icon-svgs.json";
import lucideIconTagsJson from "./lucide-icon-tags.json";

// Full offline snapshot of Lucide's icon set (lucide-icons/lucide), refreshed
// via `bun run sync:lucide` — bundled at build time so every Lucide icon is
// available with zero network calls, regardless of which (older) subset the
// running Obsidian version bundles natively.
const LUCIDE_ICON_SVGS: Readonly<Record<string, string>> = lucideIconSvgsJson;

// Per-icon search synonyms lucide-static ships (e.g. "flask-conical" ->
// ["lab", "chemistry", "experiment", ...]) — same data lucide.dev's own icon
// search runs on. Applies uniformly regardless of native-vs-gap-filled
// source, since it's keyed by bare icon name either way.
const LUCIDE_ICON_TAGS: Readonly<Record<string, readonly string[]>> = lucideIconTagsJson;

// Obsidian's getIcon()/setIcon() special-case ids starting with "lucide-" to
// resolve only against Obsidian's native, compiled-in Lucide set.
// addIcon()-registered entries under that same prefix get enumerated by
// getIconIds() but silently fail to resolve at render time (see the sister
// plugin obsidian-icon-shortcodes' src/icon-lookup.ts, confirmed live).
// Gap-fill icons (real Lucide icons this Obsidian version doesn't bundle
// natively) are therefore registered under this separate namespace instead.
const GAP_ICON_PREFIX = "linear-calendar-lucide-";

// Obsidian wraps addIcon()-registered content in its own
// <svg viewBox="0 0 100 100" class="svg-icon ..."> template. Lucide's raw
// source is authored in a 24x24 viewBox, so passing it through unscaled
// renders icons tiny. A <g transform="scale(...)"> avoids nested-svg
// percentage sizing issues and uniformly scales stroke-width along with the
// outline, preserving proportions.
function scaleToCustomIconViewport(svgText: string): string {
	const source = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
	const [, , viewBoxWidth] = (source.getAttribute("viewBox") ?? "0 0 24 24").split(/\s+/).map(Number);
	const scale = 100 / (viewBoxWidth || 24);

	const group = createSvg("g");
	group.setAttribute("transform", `scale(${scale})`);
	for (const attr of ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]) {
		const value = source.getAttribute(attr);
		if (value) group.setAttribute(attr, value);
	}
	while (source.firstChild) group.appendChild(source.firstChild);

	return group.outerHTML;
}

let nativeNames = new Set<string>();
let gapNames = new Set<string>();

/**
 * Registers every bundled Lucide icon this Obsidian version doesn't already
 * ship natively, under {@link GAP_ICON_PREFIX}. Call once during plugin
 * onload(), before any view/render code runs.
 */
export function registerLucideIcons(): void {
	const ICON_ID_PREFIX = "lucide-";

	// Computed first so an icon this Obsidian version happens to bundle
	// natively already defers to the native one below, instead of the
	// (possibly older) snapshot in the bundle shadowing it.
	nativeNames = new Set(
		getIconIds()
			.filter((id) => id.startsWith(ICON_ID_PREFIX))
			.map((id) => id.slice(ICON_ID_PREFIX.length)),
	);

	const gaps = new Set<string>();
	for (const [name, svg] of Object.entries(LUCIDE_ICON_SVGS)) {
		if (nativeNames.has(name)) continue;
		addIcon(GAP_ICON_PREFIX + name, scaleToCustomIconViewport(svg));
		gaps.add(name);
	}
	gapNames = gaps;
}

/** All known bare Lucide icon names — native + gap-filled. */
export function allLucideIconNames(): string[] {
	return Array.from(new Set([...nativeNames, ...gapNames]));
}

/** Search synonyms for a bare icon name (e.g. "flask-conical" -> ["lab", "chemistry", ...]), or [] if untagged. */
export function getLucideIconTags(name: string): readonly string[] {
	return LUCIDE_ICON_TAGS[name] ?? [];
}

/**
 * Resolves a bare icon name (e.g. "mosque") to the id `setIcon`/`getIcon`
 * must be called with — the native "lucide-" id if this Obsidian version
 * bundles it, the {@link GAP_ICON_PREFIX} id if it was gap-filled, or the
 * name unchanged as a defensive fallback (no regression vs. prior behavior
 * for unresolvable/typo'd names).
 */
export function resolveLucideIconId(bareName: string): string {
	if (nativeNames.has(bareName)) return "lucide-" + bareName;
	if (gapNames.has(bareName)) return GAP_ICON_PREFIX + bareName;
	return bareName;
}
