/**
 * Runtime stand-in for the `obsidian` package under vitest.
 *
 * The real `obsidian` npm package ships types only (`obsidian.d.ts`, no entry
 * point), so any `src` file importing it is unresolvable at test time. The
 * `resolve.alias` in `vitest.config.ts` points `obsidian` here instead, which
 * is what makes pure logic inside Obsidian-coupled files testable.
 *
 * Only runtime values need to live here — types come from the real `.d.ts` at
 * typecheck time. Add a symbol when a file under test starts importing it.
 */
import moment from "moment";

export { moment };

/** Matches Obsidian's own behaviour: collapse duplicate slashes, trim leading/trailing ones. */
export function normalizePath(path: string): string {
	return path.replace(/([\\/])+/g, "/").replace(/(^\/+|\/+$)/g, "") || "/";
}

export class TAbstractFile {
	path = "";
	name = "";
	parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
	basename = "";
	extension = "";
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
}

export class Notice {
	constructor(public message: string) {}
	hide(): void {}
}
