import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// The `obsidian` package is types-only, so src files that import it are
			// otherwise unresolvable under vitest. See test/obsidian-stub.ts.
			obsidian: fileURLToPath(new URL("./test/obsidian-stub.ts", import.meta.url)),
		},
	},
	test: {
		include: ["src/**/*.test.ts"],
		coverage: { exclude: ["test/**"] },
	},
});
