/**
 * Sprint 220 F454: BpHtmlParser 테스트
 */
import { describe, it, expect } from "vitest";
import { BpHtmlParser } from "../core/offering/services/bp-html-parser.js";

const SAMPLE_HTML = `
<html>
<head><title>AI 헬스케어 솔루션 사업기획서</title></head>
<body>
  <h1>AI 헬스케어 솔루션 사업기획서</h1>

  <h2>1. 사업 목적 및 배경</h2>
  <p>고령화 사회에서 의료비 절감과 예방 의학의 필요성이 증가하고 있습니다.
  AI 기반 건강 모니터링으로 만성질환 조기 진단을 자동화합니다.</p>

  <h2>2. 타깃 고객</h2>
  <p>주요 타깃: 50대 이상 만성질환 위험군 (당뇨, 고혈압). 병원 접근성이 낮은 농촌 지역 거주자.
  B2B: 중소 병원 및 보건소.</p>

  <h2>3. 시장 규모 및 경쟁 현황</h2>
  <p>국내 디지털 헬스케어 시장: 2025년 8조원 규모, 연 15% 성장.
  경쟁사: 카카오헬스, 삼성헬스. 차별화: 실시간 AI 진단.</p>

  <h2>4. 기술 아키텍처</h2>
  <p>React Native 앱 + FastAPI 백엔드 + TensorFlow Lite 온디바이스 추론.
  AWS EKS 기반 스케일링. 예상 개발 기간: 6개월.</p>

  <h2>5. 기능 범위 (MVP)</h2>
  <p>1. 혈압/혈당 수동 입력 + 트렌드 분석
  2. AI 위험도 알림
  3. 병원 예약 연동</p>

  <h2>6. 일정 및 마일스톤</h2>
  <p>M1 (2026-01): MVP 개발 완료
  M2 (2026-03): 파일럿 병원 3개소 도입
  M3 (2026-06): 정식 출시</p>

  <h2>7. 리스크 및 제약</h2>
  <p>의료기기 인증 필요 (MFDS). 개인정보보호법 의료 데이터 규제.
  대응: 법무 자문단 구성, 인증 비용 예산 확보.</p>
</body>
</html>
`;

const EMPTY_HTML = "<html><body><p>Some text without headers.</p></body></html>";

const MALFORMED_HTML = "<div>No structure here just plain text lorem ipsum dolor sit amet</div>";

describe("BpHtmlParser (F454)", () => {
  const parser = new BpHtmlParser();

  it("구조화된 HTML — 7개 표준 섹션 추출", () => {
    const result = parser.parse(SAMPLE_HTML);

    expect(result.title).toBe("AI 헬스케어 솔루션 사업기획서");
    expect(result.sections.length).toBeGreaterThanOrEqual(7);
    expect(result.rawText.length).toBeGreaterThan(100);

    const standardCount = parser.countStandardSections(result);
    expect(standardCount).toBeGreaterThanOrEqual(5);
  });

  it("섹션 키 매핑 — purpose/target/market/technology/scope/timeline/risk", () => {
    const result = parser.parse(SAMPLE_HTML);
    const keys = result.sections.map((s) => s.sectionKey);

    expect(keys).toContain("purpose");
    expect(keys).toContain("target");
    expect(keys).toContain("market");
    expect(keys).toContain("technology");
    expect(keys).toContain("scope");
    expect(keys).toContain("timeline");
    expect(keys).toContain("risk");
  });

  it("섹션 컨텐츠 — 내용 추출 정확도", () => {
    const result = parser.parse(SAMPLE_HTML);
    const targetSection = result.sections.find((s) => s.sectionKey === "target");

    expect(targetSection).toBeDefined();
    expect(targetSection!.content).toContain("만성질환");
    expect(targetSection!.confidence).toBeGreaterThan(0.5);
  });

  it("헤더 없는 HTML — 폴백 단락 파싱", () => {
    const result = parser.parse(EMPTY_HTML);

    // 폴백이라도 rawText는 존재
    expect(result.rawText.length).toBeGreaterThan(0);
  });

  it("구조 없는 HTML — rawText 보존", () => {
    const result = parser.parse(MALFORMED_HTML);

    expect(result.rawText).toContain("plain text");
  });

  it("빈 HTML — 안전하게 처리", () => {
    const result = parser.parse("");

    expect(result.sections).toEqual([]);
    expect(result.rawText).toBe("");
  });

  it("countStandardSections — 7개 중 표준 섹션 수 계산", () => {
    const result = parser.parse(SAMPLE_HTML);
    const count = parser.countStandardSections(result);

    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });
});
