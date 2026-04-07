// ─── F334: HookResultProcessor 테스트 (Sprint 149) ───

import { describe, it, expect } from "vitest";
import { HookResultProcessor } from "../core/harness/services/hook-result-processor.js";

describe("HookResultProcessor", () => {
  const processor = new HookResultProcessor();
  const taskId = "task-1";
  const tenantId = "org-1";

  it("exit code 0 → info severity", () => {
    const event = processor.process(
      { exitCode: 0, stderr: "", hookType: "PostToolUse" },
      taskId,
      tenantId,
    );
    expect(event.severity).toBe("info");
    expect(event.source).toBe("hook");
    expect(event.taskId).toBe(taskId);
  });

  it("exit code 1 → error severity", () => {
    const event = processor.process(
      { exitCode: 1, stderr: "lint failed", hookType: "PostToolUse" },
      taskId,
      tenantId,
    );
    expect(event.severity).toBe("error");
    expect(event.payload.type).toBe("hook");
    if (event.payload.type === "hook") {
      expect(event.payload.stderr).toBe("lint failed");
    }
  });

  it("exit code 2 → warning severity", () => {
    const event = processor.process(
      { exitCode: 2, stderr: "non-critical", hookType: "PostToolUse" },
      taskId,
      tenantId,
    );
    expect(event.severity).toBe("warning");
  });

  it("exit code 127 → error severity (unknown exit)", () => {
    const event = processor.process(
      { exitCode: 127, stderr: "command not found", hookType: "PreToolUse" },
      taskId,
      tenantId,
    );
    expect(event.severity).toBe("error");
  });

  it("hookType 구분 (PreToolUse vs PostToolUse)", () => {
    const pre = processor.process(
      { exitCode: 0, stderr: "", hookType: "PreToolUse" },
      taskId,
      tenantId,
    );
    const post = processor.process(
      { exitCode: 0, stderr: "", hookType: "PostToolUse" },
      taskId,
      tenantId,
    );
    if (pre.payload.type === "hook" && post.payload.type === "hook") {
      expect(pre.payload.hookType).toBe("PreToolUse");
      expect(post.payload.hookType).toBe("PostToolUse");
    }
  });

  it("filePath와 toolName 전달", () => {
    const event = processor.process(
      {
        exitCode: 1,
        stderr: "error",
        hookType: "PostToolUse",
        filePath: "src/app.ts",
        toolName: "Edit",
      },
      taskId,
      tenantId,
    );
    if (event.payload.type === "hook") {
      expect(event.payload.filePath).toBe("src/app.ts");
      expect(event.payload.toolName).toBe("Edit");
    }
  });

  it("stderr가 빈 문자열이어도 정상", () => {
    const event = processor.process(
      { exitCode: 1, stderr: "", hookType: "PostToolUse" },
      taskId,
      tenantId,
    );
    if (event.payload.type === "hook") {
      expect(event.payload.stderr).toBe("");
    }
  });

  it("고유 event.id 생성", () => {
    const e1 = processor.process(
      { exitCode: 0, stderr: "", hookType: "PostToolUse" },
      taskId,
      tenantId,
    );
    const e2 = processor.process(
      { exitCode: 0, stderr: "", hookType: "PostToolUse" },
      taskId,
      tenantId,
    );
    expect(e1.id).not.toBe(e2.id);
  });
});
