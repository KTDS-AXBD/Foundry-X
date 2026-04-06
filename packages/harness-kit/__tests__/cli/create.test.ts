import { describe, it, expect } from "vitest";
import { createCommand } from "../../src/cli/create.js";

describe("CLI create command", () => {
  it("should have correct command name", () => {
    expect(createCommand.name()).toBe("create");
  });

  it("should accept name argument", () => {
    const args = createCommand.registeredArguments;
    expect(args.length).toBe(1);
    expect(args[0].name()).toBe("name");
    expect(args[0].required).toBe(true);
  });

  it("should have service-id option with default", () => {
    const opt = createCommand.options.find(
      (o) => o.long === "--service-id",
    );
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe("foundry-x");
  });

  it("should have output option", () => {
    const opt = createCommand.options.find(
      (o) => o.long === "--output",
    );
    expect(opt).toBeDefined();
    expect(opt?.short).toBe("-o");
  });
});
