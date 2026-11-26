// Runs in Node: reads the repo's docs and sources from disk.
/// <reference types="node" />
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * GLOSSARY.md and every src/**​/CLAUDE.md describe code, so a symbol or file they name must still
 * exist. This catches the drift where a module is renamed or deleted and its docs keep the old name
 * (`mountMonthStrip` outlived its module by a release in 4 docs). It cannot catch a moved duty
 * whose prose names no deleted symbol: that stays the root CLAUDE.md's grep rule. ADRs, specs and
 * the root CLAUDE.md are history by design and are not checked.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "src");

/** Names the docs use on purpose that no source file defines, each with why. */
const EXTERNAL_NAMES = new Set([
	"lhakZettel", // the live vault's name
	"offsetLeft", // DOM property the view docs warn against
	"mousePressed", "mouseMoved", "mouseReleased", // CDP Input.dispatchMouseEvent types
	"addLegacySettingsCompat", // obsidian-calendar-notes' API, read for daily-note settings
]);

/** `.ts` files the docs name that live in another repo. */
const EXTERNAL_PATHS = new Set([
	"CalendarPanel.ts", // obsidian-lhak-dashboard's src/panels/CalendarPanel.ts, the rolling strip's host
]);

function walk(dir: string, keep: (path: string) => boolean): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return walk(path, keep);
		return keep(path) ? [path] : [];
	});
}

const docs = [join(root, "GLOSSARY.md"), ...walk(src, (p) => p.endsWith("CLAUDE.md"))];
// Not this file: its own comments name the drift it guards against.
const self = fileURLToPath(import.meta.url);
const sources = walk(src, (p) => p.endsWith(".ts") && p !== self).map((p) => readFileSync(p, "utf8"));

/** Backticked spans that are one identifier (optionally called: `fn()`, `fn(a, b)`). */
function namesIn(text: string): string[] {
	const names = new Set<string>();
	for (const [, name] of text.matchAll(/`([A-Za-z_]\w*)(?:\([^`]*\))?`/g)) {
		// camelCase or PascalCase only: a lowercase word or a CSS class reads the same as prose.
		if (name.length >= 5 && /[a-z][A-Z]|^[A-Z][a-z]+[A-Z]/.test(name)) names.add(name);
	}
	return [...names];
}

/** Backticked `.ts` paths, without a `:line` suffix; globs skipped. */
function pathsIn(text: string): string[] {
	const paths = new Set<string>();
	for (const [, path] of text.matchAll(/`([\w./-]+\.ts)(?::\d[\d-]*)?`/g)) paths.add(path);
	return [...paths];
}

const defined = (name: string) => {
	const word = new RegExp(`\\b${name}\\b`);
	return sources.some((s) => word.test(s));
};

/** A doc path resolves against the doc's folder, `src/` or the repo root. */
const resolves = (doc: string, path: string) =>
	[dirname(doc), src, root].some((base) => existsSync(join(base, path)));

describe("docs that describe code", () => {
	for (const doc of docs) {
		const text = readFileSync(doc, "utf8");
		const name = relative(root, doc);

		it(`${name} names only symbols the code has`, () => {
			expect(namesIn(text).filter((n) => !EXTERNAL_NAMES.has(n) && !defined(n))).toEqual([]);
		});

		it(`${name} names only .ts files that exist`, () => {
			expect(pathsIn(text).filter((p) => !EXTERNAL_PATHS.has(p) && !resolves(doc, p))).toEqual([]);
		});
	}
});
