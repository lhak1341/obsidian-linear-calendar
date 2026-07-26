import { describe, it, expect } from "vitest";
import { formatTagLabel } from "./tagUtils";

describe("formatTagLabel", () => {
	it("strips the linear-calendar/ prefix", () => {
		expect(formatTagLabel("linear-calendar/work")).toBe("work");
	});

	it("leaves tags without the prefix unchanged", () => {
		expect(formatTagLabel("work")).toBe("work");
	});

	it("only strips a leading prefix, not one mid-string", () => {
		expect(formatTagLabel("foo/linear-calendar/work")).toBe("foo/linear-calendar/work");
	});
});
