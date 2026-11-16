// TypeScript 6 loads no @types on its own; only this test runs in Node.
/// <reference types="node" />
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import { stylesOptions } from "../scripts/styles.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

async function buildStyles(): Promise<string> {
	const result = await esbuild.build({ ...stylesOptions, absWorkingDir: root, write: false, logLevel: "silent" });
	const [output] = result.outputFiles ?? [];
	if (!output) throw new Error("esbuild wrote no stylesheet");
	return output.text;
}

/** Each declaration of a vendored @lhak/style sheet, e.g. `--lk-surface: var(--background-primary)`. */
function packageDeclarations(sheet: string): string[] {
	const path = createRequire(join(root, "package.json")).resolve(`@lhak/style/${sheet}`);
	const css = readFileSync(path, "utf8");
	return [...css.matchAll(/([a-z-]+):\s*([^;{}]+);/g)].map(([, name, value]) => `${name}: ${value}`);
}

/** The body of the first rule whose selector list holds `selector` as one whole entry. */
function ruleBody(css: string, selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?:^|[},]\\s*)${escaped}\\s*(?:,[^{}]*)?\\{([^}]*)\\}`, "m").exec(css)?.[1] ?? "";
}

/** The value one property takes in a rule body. */
function value(body: string, property: string): string | undefined {
	return new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`).exec(body)?.[1]?.trim();
}

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".test.ts"))
		.map((e) => join(e.parentPath, e.name));
}

describe("built styles.css", () => {
	it("inlines every declaration of the @lhak/style alias layer", async () => {
		const css = await buildStyles();
		const decls = packageDeclarations("obsidian.css");
		expect(decls.length).toBeGreaterThan(50);
		expect(css).toContain(".lk-root {");
		for (const decl of decls) expect(css).toContain(decl);
	});

	it("reads the contract roles in the view, not the retired --lc- font variables", async () => {
		const css = await buildStyles();
		expect(css).not.toMatch(/--lc-f[hbm]\b/);
		const container = ruleBody(css, ".linear-calendar-container");
		expect(value(container, "background")).toBe("var(--lk-surface)");
		expect(value(container, "font-family")).toBe("var(--lk-font-label)");
		expect(value(ruleBody(css, ".lc-today-circle"), "background")).toBe("var(--lk-accent)");
	});

	it("sets the tooltip's title and meta row in the heading role and its description in the body role", async () => {
		const css = await buildStyles();
		expect(value(ruleBody(css, ".linear-calendar-tooltip"), "font-family")).toBe("var(--lk-font-label)");
		expect(value(ruleBody(css, ".tooltip-description"), "font-family")).toBe("var(--lk-font-interface)");
	});

	it("lays a rolling strip out itself, under its embedded-mode class", async () => {
		const css = await buildStyles();
		expect(value(ruleBody(css, ".lc-embedded .lc-month-row"), "grid-template-columns")).toBe("0px 1fr");
		expect(value(ruleBody(css, ".lc-embedded .lc-month-label"), "visibility")).toBe("hidden");
		for (const selector of [".lc-embedded .linear-calendar-grid", ".lc-embedded .lc-month-row", ".lc-embedded .lc-days-grid"]) {
			expect(value(ruleBody(css, selector), "width"), selector).toBe("100% !important");
		}
	});

	it("fills bars with their category hue, with black or white text by the hue's lightness", async () => {
		const css = await buildStyles();
		const bar = ruleBody(css, ".calendar-bar");
		expect(value(bar, "background")).toBe("var(--lc-hue)");
		expect(bar).toContain("color: oklch(from var(--lc-hue) clamp(0, (0.73 - l) * 1000, 1) 0 0);");
	});

	it("shows a category's hue as a dot, never as the chip's fill", async () => {
		const css = await buildStyles();
		expect(value(ruleBody(css, ".lc-category-dot"), "background")).toBe("var(--lc-hue, var(--lk-text-faint))");
		expect(value(ruleBody(css, ".lc-category-chip"), "background")).toBe("var(--lk-surface-chrome)");
		expect(value(ruleBody(css, ".tooltip-tag-dot"), "background")).toBe("var(--lc-hue)");
	});

	it("draws grey as the theme's muted neutral at the hues' lightness, under every root", async () => {
		const css = await buildStyles();
		expect(css).toMatch(/\.lk-root\s*\{\s*--lc-grey: var\(--lk-text-muted\);/);
		expect(css).toMatch(/@supports \(color: oklch\(from red l c h\)\)\s*\{\s*\.lk-root\s*\{\s*--lc-grey: oklch\(from var\(--lk-text-muted\) 0\.65 c h\);/);
	});

	it("draws the hue picker's swatches in their hue, the chosen one ringed in it", async () => {
		const css = await buildStyles();
		expect(value(ruleBody(css, "button.lc-hue-swatch"), "background")).toBe("var(--lc-hue)");
		expect(value(ruleBody(css, "button.lc-hue-swatch[aria-pressed=true]"), "box-shadow")).toBe("0 0 0 2px var(--background-primary), 0 0 0 4px var(--lc-hue)");
		expect(css).not.toMatch(/lc-color-swatch|lc-hue-swatches|lc-settings-dot/);
	});

	it("draws a settings tag chip as its bar: filled when its hue is chosen, outlined when automatic", async () => {
		const css = await buildStyles();
		// The fill rule, not the layout rule button.lc-tag-chip shares with the add chip.
		const chip = /\}\s*button\.lc-tag-chip\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
		expect(value(chip, "background")).toBe("var(--lc-hue, transparent)");
		expect(chip).toContain("color: oklch(from var(--lc-hue) clamp(0, (0.73 - l) * 1000, 1) 0 0);");
		expect(value(ruleBody(css, "button.lc-tag-chip.is-auto"), "box-shadow")).toBe("inset 0 0 0 1.5px var(--lc-hue, var(--background-modifier-border))");
	});

	it("styles the shared icon picker's suggestion rows", async () => {
		const css = await buildStyles();
		expect(value(ruleBody(css, ".lk-icon-suggest-item"), "display")).toBe("flex");
		expect(css).not.toMatch(/lc-icon-suggest/);
	});
});

describe("plugin source", () => {
	it("passes the @lhak/style adoption check (stylelint)", async () => {
		const { results } = await stylelint.lint({ files: [join(root, "styles.src.css")], cwd: root });
		expect(results.map((r) => Boolean(r.ignored))).toEqual([false]);
		expect(results[0]?.warnings.map((w) => `${w.line}: ${w.text}`)).toEqual([]);
	});

	it("reads the accent from the contract in TypeScript too (the daily-note fallback)", () => {
		const offenders = sourceFiles(join(root, "src")).filter((f) => /var\(--color-accent\)/.test(readFileSync(f, "utf8")));
		expect(offenders).toEqual([]);
	});

	it("sets event colours as contract hues, never an inline colour", () => {
		const offenders = sourceFiles(join(root, "src")).filter((f) =>
			/style\.(background\w*|color|border\w*Color)\s*=|setProperty\(\s*"(background(-color)?|color|border(-\w+)?-color)"|COLOR_PALETTE|getContrastColor/.test(
				readFileSync(f, "utf8"),
			),
		);
		expect(offenders).toEqual([]);
	});

	it("sets no retired --lc- font variable", () => {
		const offenders = sourceFiles(join(root, "src")).filter((f) => /--lc-f[hbm]\b/.test(readFileSync(f, "utf8")));
		expect(offenders).toEqual([]);
	});

	it("marks a rolling strip's container for embedded mode", () => {
		const strip = readFileSync(join(root, "src/view/RollingStrip.ts"), "utf8");
		expect(strip).toMatch(/container\.addClass\("lc-embedded"\)/);
	});
});
