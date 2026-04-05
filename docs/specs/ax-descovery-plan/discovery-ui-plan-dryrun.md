# Dry-Run 검증 결과 — 발굴 단계 UI/UX & Report 화면 계획

**검증 일시:** 2026-04-05
**대상 문서:** discovery-ui-plan.html v1.1
**검증 범위:** DB 스키마, 컴포넌트/라우트, AXIS DS 의존성, API 충돌

---

## 1. DB 스키마 정합성 — ✅ PASS (1건 주의)

| 항목 | 결과 | 비고 |
|------|------|------|
| 기존 테이블 (ax_discovery_items) | ✅ 존재 확인 | F213 Sprint 69에서 생성, type(I/M/P/T/S) + viability_score |
| 기존 테이블 (ax_discovery_stages) | ✅ 존재 확인 | stage_num, status, intensity 컬럼 일치 |
| 기존 테이블 (ax_discovery_outputs) | ✅ 존재 확인 | stage_num, skill_id, output_json, version 컬럼 일치 |
| 신규 4테이블 네이밍 충돌 | ✅ 충돌 없음 | ax_persona_configs, ax_persona_evals, ax_discovery_reports, ax_team_reviews |
| ax_* 네이밍 컨벤션 | ✅ 일관 | 기존 26개 ax_* 테이블과 동일 패턴 |

**⚠️ 주의사항:** CLAUDE.md에 "새 마이그레이션은 **0080부터**"로 명시. 계획서는 0079~0082로 작성됨 → **0080~0083으로 변경 권장**

---

## 2. 기존 컴포넌트/라우트 정합성 — ✅ PASS

### 기존 컴포넌트 확인

| 컴포넌트 | F# | 상태 | 참조 |
|----------|-----|------|------|
| DiscoveryWizard | F263 | ✅ 존재 (Sprint 94) | SPEC.md |
| WizardStepDetail | F263 | ✅ 존재 (Sprint 94) | SPEC.md |
| HelpAgentPanel | F264 | ✅ 존재 (Sprint 95, 99%) | SPEC.md |
| OnboardingTour | F265 | ✅ 존재 (Sprint 94, 100%) | SPEC.md |
| HitlReviewPanel | F266 | ✅ 존재 (Sprint 96, 100%) | SPEC.md |

### 신규 라우트/서비스 충돌 검사

| 신규 항목 | 충돌 여부 | 비고 |
|-----------|-----------|------|
| POST /ax-bd/persona-eval | ✅ 충돌 없음 | 기존 ax-bd 라우트와 네임스페이스 공유, 경로 미사용 |
| GET /ax-bd/discovery-report/:itemId | ✅ 충돌 없음 | 신규 경로 |
| PersonaConfigService | ✅ 충돌 없음 | 기존 서비스 169개 중 동명 없음 |
| PersonaEvalService | ✅ 충돌 없음 | 동명 없음 |
| DiscoveryReportService | ✅ 충돌 없음 | 동명 없음 |

---

## 3. AXIS DS 의존성 — ✅ PASS (1건 확인 필요)

| 항목 | 결과 | 비고 |
|------|------|------|
| @axis-ds/* 패키지 | ✅ 설치됨 (3개) | Sprint 25 F104에서 도입 |
| shadcn/ui → AXIS DS 전환 | ✅ 완료 (11 컴포넌트, 95%) | F79 + F104 |
| CSS 변수 자동 매핑 | ✅ 완료 | 코드 변경 없이 토큰 전환 |
| Tailwind v4 | ✅ 마이그레이션 완료 | globals.css + theme-provider |
| 다크모드 지원 | ✅ 지원 | F42 이후 theme-toggle |

**⚠️ 확인 필요:** recharts 의존성 — 계획서에서 Radar/Bar 차트에 recharts 사용 예정이나, 현재 프로젝트에서 custom chart renderer 사용 가능성 있음. WSL 프로젝트의 `packages/web/package.json`에서 recharts 존재 여부 실제 확인 필요.

---

## 4. API 엔드포인트 충돌 — ✅ PASS

- 기존 ax-bd 네임스페이스에 discovery, bmc, idea, pipeline, bdp, offering, mvp, decision, skill 관련 라우트 존재
- 신규 persona-eval, discovery-report 경로는 미사용 상태 → 안전하게 추가 가능
- ~420 기존 엔드포인트와 충돌 없음

---

## 5. 종합 판정

| 검증 영역 | 결과 | 위험도 |
|-----------|------|--------|
| DB 스키마 | ✅ PASS | 🟢 Low (마이그레이션 번호만 조정) |
| 컴포넌트/라우트 | ✅ PASS | 🟢 Low |
| AXIS DS 의존성 | ✅ PASS | 🟡 Medium (recharts 확인 필요) |
| API 충돌 | ✅ PASS | 🟢 Low |

### 조치 사항 (2건)

1. **마이그레이션 번호 조정**: 0079~0082 → **0080~0083** (CLAUDE.md 규칙 준수)
2. **recharts 의존성 확인**: WSL 프로젝트에서 `pnpm list recharts` 실행하여 설치 여부 확인. 미설치 시 Sprint 100 시작 전 `pnpm add recharts` 필요

### 결론

**계획서는 실행 가능(Actionable)합니다.** 기존 Foundry-X 아키텍처와 충돌 없이 확장 가능하며, AXIS DS 토큰 체계 위에 발굴 전용 시맨틱 토큰을 추가하는 전략이 적절해요. 마이그레이션 번호 조정과 recharts 확인 2건만 사전 처리하면 Sprint 99부터 바로 착수 가능합니다.
