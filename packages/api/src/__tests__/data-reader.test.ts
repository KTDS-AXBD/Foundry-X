import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  getProjectRoot,
  foundryXPath,
  readJsonFile,
  readTextFile,
  writeTextFile,
} from "../services/data-reader.js";

describe("data-reader", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
    delete process.env.PROJECT_ROOT;
  });

  // ─── getProjectRoot ───

  describe("getProjectRoot", () => {
    it("returns PROJECT_ROOT env if set", () => {
      process.env.PROJECT_ROOT = "/custom/path";
      expect(getProjectRoot()).toBe("/custom/path");
    });

    it("falls back to cwd when env not set", () => {
      delete process.env.PROJECT_ROOT;
      expect(getProjectRoot()).toBe(process.cwd());
    });
  });

  // ─── foundryXPath ───

  describe("foundryXPath", () => {
    it("constructs .foundry-x/ path under project root", () => {
      process.env.PROJECT_ROOT = "/my/project";
      expect(foundryXPath("config.json")).toBe("/my/project/.foundry-x/config.json");
    });
  });

  // ─── readJsonFile ───

  describe("readJsonFile", () => {
    it("reads and parses valid JSON", async () => {
      tempDir = await mkdtemp(join(tmpdir(), "fx-test-"));
      const filePath = join(tempDir, "data.json");
      await writeFile(filePath, '{"key":"value"}');
      const result = await readJsonFile<{ key: string }>(filePath, { key: "fallback" });
      expect(result).toEqual({ key: "value" });
    });

    it("returns fallback for missing file", async () => {
      const result = await readJsonFile("/nonexistent/file.json", { default: true });
      expect(result).toEqual({ default: true });
    });

    it("returns fallback for invalid JSON", async () => {
      tempDir = await mkdtemp(join(tmpdir(), "fx-test-"));
      const filePath = join(tempDir, "bad.json");
      await writeFile(filePath, "not valid json{{{");
      const result = await readJsonFile<string[]>(filePath, ["fallback"]);
      expect(result).toEqual(["fallback"]);
    });
  });

  // ─── readTextFile ───

  describe("readTextFile", () => {
    it("reads file content", async () => {
      tempDir = await mkdtemp(join(tmpdir(), "fx-test-"));
      const filePath = join(tempDir, "readme.md");
      await writeFile(filePath, "# Hello");
      const result = await readTextFile(filePath, "");
      expect(result).toBe("# Hello");
    });

    it("returns fallback for missing file", async () => {
      const result = await readTextFile("/nonexistent/readme.md", "default content");
      expect(result).toBe("default content");
    });
  });

  // ─── writeTextFile ───

  describe("writeTextFile", () => {
    it("writes content to file", async () => {
      tempDir = await mkdtemp(join(tmpdir(), "fx-test-"));
      const filePath = join(tempDir, "output.txt");
      await writeTextFile(filePath, "written content");
      const result = await readTextFile(filePath, "");
      expect(result).toBe("written content");
    });
  });
});
