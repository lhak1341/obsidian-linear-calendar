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

export class Vault {
	/** Matches Obsidian's: calls `cb` on `root` and every descendant. */
	static recurseChildren(root: TFolder, cb: (file: TAbstractFile) => unknown): void {
		cb(root);
		for (const child of root.children) {
			if (child instanceof TFolder) Vault.recurseChildren(child, cb);
			else cb(child);
		}
	}
}

export class Notice {
	constructor(public message: string) {}
	hide(): void {}
}

export interface Debouncer<T extends unknown[], V> {
	(...args: T): void;
	cancel(): void;
	run(): V | void;
}

/** Matches Obsidian's `debounce(cb, timeout, resetTimer)`: trailing call, timer restarts on each call when `resetTimer`. */
export function debounce<T extends unknown[], V>(cb: (...args: T) => V, timeout = 0, resetTimer = false): Debouncer<T, V> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: T | null = null;
	const fire = () => {
		timer = null;
		const args = lastArgs!;
		lastArgs = null;
		cb(...args);
	};
	const debounced = ((...args: T) => {
		lastArgs = args;
		if (timer !== null && !resetTimer) return;
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(fire, timeout);
	}) as Debouncer<T, V>;
	debounced.cancel = () => {
		if (timer !== null) clearTimeout(timer);
		timer = null;
		lastArgs = null;
	};
	debounced.run = () => {
		if (timer === null) return;
		clearTimeout(timer);
		fire();
	};
	return debounced;
}
