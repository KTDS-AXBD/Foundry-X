import { describe, it, expect, vi, beforeEach } from "vitest";
import { PiiMaskerService, DEFAULT_PII_PATTERNS } from "../services/pii-masker.js";

function createMockDb(rows: any[] = []) {
  const all = vi.fn().mockResolvedValue({ results: rows });
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ all }),
      all,
    }),
  } as any;
}

describe("PiiMaskerService", () => {
  let db: ReturnType<typeof createMockDb>;
  let masker: PiiMaskerService;

  beforeEach(() => {
    db = createMockDb();
    masker = new PiiMaskerService(db);
  });

  // ─── Default pattern count ───

  it("has 6 default PII patterns", () => {
    expect(DEFAULT_PII_PATTERNS).toHaveLength(6);
  });

  // ─── Email detection (redact) ───

  it("detects and redacts email addresses", async () => {
    const result = await masker.mask("Contact user@example.com for info");
    expect(result.masked).toContain("[EMAIL_REDACTED]");
    expect(result.masked).not.toContain("user@example.com");
    expect(result.detections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pattern: "email", count: 1, maskStrategy: "redact" }),
      ]),
    );
  });

  // ─── Phone KR detection (partial) ───

  it("detects and partially masks Korean phone numbers", async () => {
    const result = await masker.mask("연락처: 010-1234-5678");
    expect(result.masked).toContain("010-****-5678");
    expect(result.masked).not.toContain("1234");
    expect(result.detections[0]?.pattern).toBe("phone_kr");
  });

  it("handles phone without hyphens", async () => {
    const result = await masker.mask("전화번호 01012345678");
    expect(result.masked).toContain("010-****-5678");
  });

  // ─── SSN KR detection (redact) ───

  it("detects and redacts Korean SSN", async () => {
    const result = await masker.mask("주민번호 900101-1234567");
    expect(result.masked).toContain("[SSN_KR_REDACTED]");
    expect(result.masked).not.toContain("900101");
  });

  it("detects SSN without hyphen", async () => {
    const result = await masker.mask("주민번호 9001011234567");
    expect(result.masked).toContain("[SSN_KR_REDACTED]");
  });

  // ─── Employee ID detection (hash) ───

  it("detects and hashes employee IDs", async () => {
    const result = await masker.mask("사원번호 AB-12345");
    expect(result.masked).toMatch(/\[EMPLOYEE_ID:[a-f0-9]{5}\]/);
    expect(result.masked).not.toContain("AB-12345");
  });

  // ─── IP Address detection (partial) ───

  it("detects and partially masks IP addresses", async () => {
    const result = await masker.mask("서버 IP: 192.168.1.100");
    expect(result.masked).toContain("192.168.*.*");
    expect(result.masked).not.toContain("1.100");
  });

  // ─── Credit Card detection (redact) ───

  it("detects and redacts credit card numbers", async () => {
    const result = await masker.mask("카드번호 4111-1111-1111-1111");
    expect(result.masked).toContain("[CREDIT_CARD_REDACTED]");
    expect(result.masked).not.toContain("4111");
  });

  // ─── Mixed PII ───

  it("handles text with multiple PII types", async () => {
    const text = "이메일 user@test.com 전화 010-1111-2222 주민 900101-1234567";
    const result = await masker.mask(text);

    expect(result.masked).toContain("[EMAIL_REDACTED]");
    expect(result.masked).toContain("010-****-2222");
    expect(result.masked).toContain("[SSN_KR_REDACTED]");
    expect(result.detections).toHaveLength(3);
  });

  // ─── No PII ───

  it("returns original text when no PII detected", async () => {
    const text = "일반 텍스트입니다.";
    const result = await masker.mask(text);

    expect(result.masked).toBe(text);
    expect(result.detections).toHaveLength(0);
    expect(result.originalLength).toBe(text.length);
    expect(result.maskedLength).toBe(text.length);
  });

  // ─── Empty text ───

  it("handles empty text gracefully", async () => {
    const result = await masker.mask("");
    expect(result.masked).toBe("");
    expect(result.detections).toHaveLength(0);
    expect(result.originalLength).toBe(0);
  });

  // ─── maskAbove: classification filtering ───

  it("maskAbove: masks only confidential+ when minClassification=confidential", async () => {
    // employee_id is 'internal', email is 'confidential'
    const text = "직원 AB-12345 이메일 user@test.com";
    const result = await masker.maskAbove(text, "confidential");

    // email (confidential) should be masked
    expect(result.masked).toContain("[EMAIL_REDACTED]");
    // employee_id (internal) should NOT be masked
    expect(result.masked).toContain("AB-12345");
  });

  it("maskAbove: masks only restricted when minClassification=restricted", async () => {
    const text = "이메일 user@test.com 주민 900101-1234567";
    const result = await masker.maskAbove(text, "restricted");

    // email (confidential) should NOT be masked
    expect(result.masked).toContain("user@test.com");
    // ssn (restricted) should be masked
    expect(result.masked).toContain("[SSN_KR_REDACTED]");
  });

  it("maskAbove: empty text returns empty", async () => {
    const result = await masker.maskAbove("", "confidential");
    expect(result.masked).toBe("");
  });

  // ─── DB custom patterns ───

  it("loads and applies DB custom patterns", async () => {
    const dbWithRows = createMockDb([
      {
        pattern_name: "custom_code",
        pattern_regex: "PRJ-\\d{4}",
        classification: "internal",
        masking_strategy: "redact",
      },
    ]);
    const maskerWithDb = new PiiMaskerService(dbWithRows);
    const result = await maskerWithDb.mask("코드 PRJ-1234", "tenant_1");

    expect(result.masked).toContain("[CUSTOM_CODE_REDACTED]");
    expect(result.masked).not.toContain("PRJ-1234");
  });
});

// ─── Middleware tests ───

describe("PII Masker Middleware", () => {
  it("module exports piiMaskerMiddleware", async () => {
    const mod = await import("../middleware/pii-masker.middleware.js");
    expect(mod.piiMaskerMiddleware).toBeDefined();
    expect(typeof mod.piiMaskerMiddleware).toBe("function");
  });
});
