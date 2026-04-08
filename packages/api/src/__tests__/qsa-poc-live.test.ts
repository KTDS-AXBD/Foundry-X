/**
 * QSA PoC — 실제 Prototype HTML에 대해 CSS 정적 분석 + 5차원 Rubric 판별
 * Rule-based 판별 (Workers AI 없이 로컬 실행)
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { guardCss } from "../core/harness/services/css-anti-pattern-guard.js";

const PROTO_DIR = resolve(__dirname, "../../../../docs/specs/axbd-bizitem");
const PROTOS = [
  { id: "koami-v1", file: "prototype-koami.html", name: "KOAMI 산업 공급망 의사결정" },
  { id: "deny-v2", file: "prototype-deny-semi-v2.html", name: "Deny 내부자 리스크 SOC" },
];

const AI_DEFAULT_FONTS = ["Arial", "Inter", "system-ui", "Helvetica"];
const PURE_COLORS = ["#000000", "#ffffff", "#808080", "#999999", "#aaaaaa", "#cccccc", "#000", "#fff"];

function analyzeCss(html: string) {
  const aiDefaultFonts = AI_DEFAULT_FONTS.filter(f => new RegExp(`\\b${f}\\b`, "i").test(html));
  const pureColors = PURE_COLORS.filter(c => html.includes(c));
  const spacingMatches: string[] = [];
  const re = /(?:margin|padding|gap):\s*(\d+)px/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const v = parseInt(m[1] ?? "0", 10);
    if (v > 0 && v % 4 !== 0) spacingMatches.push(`${v}px`);
  }
  const hasNestedCards = /\.card[^{]*[\s>+~]+\.card/i.test(html);
  const hasMediaQueries = /@media\s/i.test(html);
  const hasViewportMeta = /viewport/.test(html);
  const hasH1 = /<h1/i.test(html);
  const hasCta = /btn|button|cta/i.test(html);
  return { aiDefaultFonts, pureColors, nonGridSpacing: spacingMatches, hasNestedCards, hasMediaQueries, hasViewportMeta, hasH1, hasCta };
}

// Prototype 유형 감지: pitch-deck형 vs 대시보드형
function detectPrototypeType(html: string): "pitch-deck" | "dashboard" {
  const dashboardSignals = [
    /dashboard/i, /panel/i, /widget/i, /chart/i, /graph/i,
    /sidebar/i, /nav-/i, /tab-/i, /grid-container/i, /monitor/i,
  ];
  const score = dashboardSignals.filter(p => p.test(html)).length;
  return score >= 3 ? "dashboard" : "pitch-deck";
}

function calculateQsaScores(html: string, css: ReturnType<typeof analyzeCss>) {
  const protoType = detectPrototypeType(html);

  // R1: 보안 — 내부 정보 패턴 (CSS 변수 내 폰트 참조는 제외)
  const internalPatterns = [/localhost/i, /127\.0\.0\.1/, /\.internal\./i, /api-key/i, /secret_key/i];
  const securityIssues = internalPatterns.filter(p => p.test(html)).length;
  const r1 = securityIssues === 0 ? 1.0 : Math.max(0, 1.0 - securityIssues * 0.3);

  // R2: 콘텐츠 — 유형별 기준
  // Pitch-deck: h1 + CTA + section 분할
  // Dashboard: 제목 + 패널/위젯 구성 + 데이터 시각화 요소
  const sectionCount = (html.match(/<section|class="section|class="panel|class="card|class="widget/gi) ?? []).length;
  let r2: number;
  if (protoType === "dashboard") {
    const hasTitle = css.hasH1 || /<h2/i.test(html);
    const hasPanels = sectionCount >= 2;
    const hasDataViz = /chart|graph|metric|stat|count|gauge|timeline/i.test(html);
    const hasNav = /nav|sidebar|tab/i.test(html);
    r2 = (hasTitle ? 0.25 : 0) + (hasPanels ? 0.25 : 0) + (hasDataViz ? 0.25 : 0) + (hasNav ? 0.25 : 0);
  } else {
    r2 = (css.hasH1 ? 0.3 : 0) + (css.hasCta ? 0.3 : 0) + Math.min(0.4, sectionCount * 0.1);
  }

  // R3: 디자인 — CSS 변수 내 폰트도 검출
  const cssVarFonts = (html.match(/--[\w-]*(?:font|sans)[\w-]*:\s*[^;]*/gi) ?? []);
  const varFontIssues = AI_DEFAULT_FONTS.filter(f =>
    cssVarFonts.some(v => new RegExp(`\\b${f}\\b`, "i").test(v))
  );
  let r3 = 1.0;
  r3 -= (css.aiDefaultFonts.length + varFontIssues.length) * 0.10;
  r3 -= css.pureColors.length * 0.05;
  r3 -= css.hasNestedCards ? 0.2 : 0;
  r3 -= !css.hasMediaQueries ? 0.2 : 0;
  r3 = Math.max(0, Math.min(1, r3));

  // R4: 구조 — 유형별 기준
  let r4: number;
  if (protoType === "dashboard") {
    // Dashboard: 헤더+사이드바+메인영역+패널 구조
    const hasHeader = /header|app-bar|top-bar/i.test(html);
    const hasSidebar = /sidebar|side-nav|nav-panel/i.test(html);
    const hasMainContent = /main|content-area|dashboard-body/i.test(html);
    const hasPanelLayout = sectionCount >= 3;
    r4 = (hasHeader ? 0.25 : 0) + (hasSidebar ? 0.25 : 0) + (hasMainContent ? 0.25 : 0) + (hasPanelLayout ? 0.25 : 0);
  } else {
    r4 = Math.min(1.0, sectionCount * 0.15 + (css.hasH1 ? 0.2 : 0) + (css.hasCta ? 0.2 : 0));
  }

  // R5: 기술 건전성
  const hasDoctype = /<!DOCTYPE html>/i.test(html);
  const hasCharset = /charset/i.test(html);
  const r5 = (hasDoctype ? 0.3 : 0) + (hasCharset ? 0.2 : 0) + (css.hasViewportMeta ? 0.3 : 0) + (css.hasMediaQueries ? 0.2 : 0);

  return {
    "QSA-R1": Math.round(r1 * 100) / 100,
    "QSA-R2": Math.round(r2 * 100) / 100,
    "QSA-R3": Math.round(r3 * 100) / 100,
    "QSA-R4": Math.round(r4 * 100) / 100,
    "QSA-R5": Math.round(r5 * 100) / 100,
    _type: protoType,
  };
}

function weightedTotal(scores: Record<string, number | string>) {
  const W: Record<string, number> = { "QSA-R1": 0.25, "QSA-R2": 0.25, "QSA-R3": 0.25, "QSA-R4": 0.15, "QSA-R5": 0.10 };
  return Object.entries(scores)
    .filter(([k]) => k.startsWith("QSA-"))
    .reduce((sum, [k, v]) => sum + (v as number) * (W[k] ?? 0), 0);
}

describe("QSA PoC — 실제 Prototype 5차원 판별", () => {
  for (const proto of PROTOS) {
    const filePath = resolve(PROTO_DIR, proto.file);
    const exists = existsSync(filePath);

    describe(`${proto.name} (${proto.id})`, () => {
      if (!exists) { it.skip(`파일 없음: ${proto.file}`, () => {}); return; }
      const html = readFileSync(filePath, "utf-8");

      it("CSS 정적 분석", () => {
        const css = analyzeCss(html);
        console.log(`  fonts=${css.aiDefaultFonts} colors=${css.pureColors.length} media=${css.hasMediaQueries}`);
        expect(css).toBeDefined();
      });

      it("5차원 QSA 점수 산출", () => {
        const css = analyzeCss(html);
        const scores = calculateQsaScores(html, css);
        const total = weightedTotal(scores);
        console.log(`  Type: ${scores._type}`);
        console.log(`  R1=${scores["QSA-R1"]} R2=${scores["QSA-R2"]} R3=${scores["QSA-R3"]} R4=${scores["QSA-R4"]} R5=${scores["QSA-R5"]}`);
        console.log(`  Total: ${(total * 100).toFixed(1)}% → ${total >= 0.85 ? "PASS" : "MINOR_FIX"}`);
        expect(total).toBeGreaterThan(0);
      });

      it("Guard 적용 후 폰트 안티패턴 0건", () => {
        const { fixed, corrections } = guardCss(html);
        console.log(`  Guard: ${corrections.length} corrections`);
        const cssAfter = analyzeCss(fixed);
        expect(cssAfter.aiDefaultFonts.length).toBe(0);
      });

      it("Guard 적용 후 점수 향상", () => {
        const before = weightedTotal(calculateQsaScores(html, analyzeCss(html)));
        const { fixed } = guardCss(html);
        const after = weightedTotal(calculateQsaScores(fixed, analyzeCss(fixed)));
        console.log(`  ${(before * 100).toFixed(1)}% → ${(after * 100).toFixed(1)}% (Δ${((after - before) * 100).toFixed(1)}%)`);
        expect(after).toBeGreaterThanOrEqual(before);
      });
    });
  }
});
