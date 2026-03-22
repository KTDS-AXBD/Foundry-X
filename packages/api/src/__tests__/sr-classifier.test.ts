import { describe, it, expect } from "vitest";
import { SrClassifier } from "../services/sr-classifier.js";

describe("SrClassifier", () => {
  const c = new SrClassifier();

  it("code_change 분류", () => {
    const r = c.classify("사용자 프로필 사진 업로드 API 추가", "대시보드에서 업로드 기능 추가");
    expect(r.srType).toBe("code_change");
    expect(r.matchedKeywords.length).toBeGreaterThan(0);
  });
  it("bug_fix 분류", () => {
    const r = c.classify("로그인 후 대시보드 500 에러", "긴급 수정");
    expect(r.srType).toBe("bug_fix");
    expect(r.matchedKeywords).toContain("에러");
  });
  it("env_config 분류", () => {
    expect(c.classify("스테이징 환경 변수 추가", "배포 설정").srType).toBe("env_config");
  });
  it("doc_update 분류", () => {
    expect(c.classify("API 문서 업데이트", "REST API 문서 갱신").srType).toBe("doc_update");
  });
  it("security_patch 분류", () => {
    expect(c.classify("보안 취약점 패치", "XSS 취약점").srType).toBe("security_patch");
  });
  it("모호한 텍스트 → code_change 기본값", () => {
    const r = c.classify("잡다한 작업", "없음");
    expect(r.srType).toBe("code_change");
    expect(r.confidence).toBe(0.5);
    expect(r.matchedKeywords).toEqual([]);
  });
  it("복수 유형 → priority 기반 선택", () => {
    expect(c.classify("보안 취약점 버그 수정", "패치").srType).toBe("security_patch");
  });
  it("confidence 0.0~1.0 범위", () => {
    for (const t of ["기능 추가", "보안 CVE XSS 패치", "잡다한"]) {
      const r = c.classify(t, "");
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
  it("CVE 패턴 매칭", () => {
    expect(c.classify("CVE-2026-1234 패치", "").srType).toBe("security_patch");
  });
  it("한국어+영어 혼합", () => {
    expect(c.classify("Fix login bug — 에러 수정", "500").srType).toBe("bug_fix");
  });
});
