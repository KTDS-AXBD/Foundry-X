# fx-ai-foundry-os 인터뷰 로그

**일시:** 2026-04-15
**참여:** Sinclair Seo (요청자), Claude (인터뷰어)
**참조 문서:** `docs/specs/AI_Foundry_OS_DeepDive_v0.3.html`
**연동 레포:** https://github.com/KTDS-AXBD/Decode-X (기존 TS/Bun/Cloudflare 스택, Phase 2-E 완료)

---

## Part 1 — 왜 (목적/문제)

**Q1. 가장 핵심적인 동기?**
- ✅ '26 하반기 대표 보고·수주 자산화
- ✅ Decode-X 파이프라인 완성 (코드+문서+암묵지 → 3종 Spec)

**Q2. 데드라인?**
- **1차 MVP: 2026-04-17(금) 09:00** (~42시간) — 대표 보고용 데모
- 장기: '26 하반기 내 SI/ITO 파일럿 (외부 고객사 적용)

---

## Part 2 — 누구를 위해 (사용자)

**Q3. 사용자/이해관계자?**
- ✅ AX사업1/2팀 수행인력 (1순위 타겟)
- ✅ kt ds 대표·임원 (의사결정·투자승인)
- ✅ SI/ITO 고객사 도메인 전문가 (Decode-X 암묵지 추출 대상)

**1순위:** AX사업1/2팀 — 방법론 자기증명은 이들이 실제 써야 성립

---

## Part 3 — 무엇을 (범위/기능)

**Q4. Must Have (DeepDive 기반)?**
- ✅ Decode-X 파이프라인 (코드+문서+암묵지 → 3종 Spec)
- ✅ Spec 스키마 + AI-Ready 6기준 검증
- ✅ Harness 5종 체크리스트 자동화
- ✅ KG 기반 XAI

**Q5. Out-of-scope?**
- ✅ 코드박스 Appliance (폐쇄망 현장배포)
- ✅ 12종 Worker Agent 전수 통합

---

## Part 4 — 성공 기준 (KPI)

**Q6. 성공 지표?**
- ✅ Decode-X 캘리브레이션 성공률 ≥80% (내부 1개 도메인, 도메인 전문가 판정)
- ✅ "퇴직연금 중도인출" Type 1 반제품 1건 실제 산출 (Spec → Code → Test)

**Q7. 실패/중단 조건?**
- ✅ Decode-X 성공률 <50%
- ✅ 퇴직연금 Type 1 데모 미완성

---

## Part 5 — 제약과 리소스

**Q8. 인력/기간?**
- Foundry-X 1명(Sinclair) + AI Squad 중심, 4/17까지 42시간 집중
- '26 Q3~ AX사업1/2팀 Pair 합류 후 공동 검증

**Q9. 기술/인프라?**
- Foundry-X 현 스택 유지 (Cloudflare Workers + D1 + React + pnpm + TS)
- **Ontology MCP 서버 신규 추가** (Palantir 참조, '27 예정이었던 것을 앞당김)
- Decode-X(TypeScript + Bun) 연동 — API 프록시 또는 shared types 미러링

**Q10. 컴플라이언스?**
- ✅ kt ds 내부 IP/지식자산 정책 (Spec 자산 내부 귀속)
- ✅ 고객사 개인정보 보호 (퇴직연금 데모는 가명·모크 데이터 필수)

---

## 후속 조사 결과 — Decode-X 레포 스캔

**Stack:** TypeScript + Bun + Cloudflare Workers + Neo4j
**구조:** `services/svc-extraction`, `svc-ontology`, `svc-policy` + `packages/types` + `apps/app-mockup`
**진척:** Phase 2-E 완료 (퇴직연금 3-Pass 분석 + Cross-Org 비교) — 847+ tests GREEN
**발견 기능:**
- 3-Pass LLM 파이프라인: scoring (중요도·핵심 프로세스 판정) → diagnosis (missing/duplicate/overspec/inconsistency 4대 진단) → comparison (조직 간 서비스 그룹 분류)
- Neo4j 온톨로지: SubProcess/Method/Condition/Actor/Requirement/DiagnosisFinding
- HITL 리뷰 플로우: pending/accept/reject/modify
- 이벤트 발행: `analysis.completed`, `diagnosis.completed`
- RBAC + X-Internal-Secret 인증

**시사점:** fx-ai-foundry-os는 "Decode-X를 zero에서 만드는 것"이 아니라, **Foundry-X 레이어 위에서 Decode-X와 연동하여 "AI Foundry OS"의 Control Plane + Presentation(대표 보고 UI)을 구성하는 것**이 현실적. 42시간 MVP 범위를 여기에 맞춰 현실화.
