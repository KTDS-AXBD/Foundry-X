# BD Quality System PRD

**버전:** v1
**날짜:** 2026-04-08
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
BD팀이 생성하는 모든 고객 대면 산출물(PRD, Offering, Prototype)의 품질을 AI 에이전트가 자율적으로 감시·판별·개선하여, "AI가 만들었다는 느낌이 전혀 없는" 전문가 수준의 산출물을 보장하는 품질 관리 체계.

**배경:**
Foundry-X는 발굴(Discovery) → PRD → Offering(HTML/PPTX) → Prototype(HTML) 파이프라인을 구축했으나, 각 단계의 품질 평가 구성요소들이 **독립적으로 존재할 뿐 유기적으로 연결되지 않아** 최종 산출물 품질이 일관되지 않다. 특히 고객 대면 산출물(Offering, Prototype)의 디자인 품질, 보안, 콘텐츠 충실도를 체계적으로 보장하는 메커니즘이 부재하다.

**목표:**
1. BD 산출물 전체를 아우르는 **자율적 품질 관리 체계** 구축
2. 산출물 유형별 **전문 QSA(Quality & Security Assurance) Discriminator** 운영
3. 파이프라인 구성요소 간 **단절(GAP)을 자동 감지하고 복구**하는 Sentinel 체계

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

**파이프라인 구성요소는 존재하지만 연결이 끊어져 있다:**

| # | GAP | 영향 |
|---|-----|------|
| 1 | `prototype_quality` 테이블이 O-G-D 루프와 분리 | Quality Dashboard에 데이터 부재 가능 |
| 2 | 사용자 피드백 저장 후 재생성 트리거 미구현 | 피드백이 무시됨 |
| 3 | HITL 섹션 리뷰가 읽기 전용 | revision_requested 해도 아무 일 안 일어남 |
| 4 | 디자인 토큰(14종)이 Prototype 생성과 완전 단절 | 브랜드 커스터마이징 불가 |
| 5 | Generator는 impeccable 7도메인 주입, Discriminator는 13항목 독립 체크리스트 | 평가 기준 불일치 → O-G-D 루프 비효율 |
| 6 | 메타 오케스트레이터 부재 | 시스템적 품질 패턴을 누구도 감시하지 않음 |
| 7 | Offering의 디자인 관리(C4)가 Prototype에 미전달 | Offering↔Prototype 시각 언어 불일치 |

**산출물별 품질 보장 현황:**

| 산출물 | 품질 평가 | 보안 점검 | "AI 느낌" 탈피 | 상태 |
|--------|----------|----------|--------------|------|
| PRD | O-G-D 루프 (ogd-discriminator) | ❌ 없음 | N/A (내부용) | 부분 |
| Offering (HTML/PPTX) | O-G-D + Six Hats + Expert 5인 | ❌ 없음 | impeccable 참조 주입 | 부분 |
| Prototype (HTML) | O-G-D 루프 (13항목 체크리스트) | ❌ 없음 | impeccable 참조 주입 | 부분 |

### 2.2 목표 상태 (To-Be)

```
BD Sentinel (자율 메타 오케스트레이터)
│
├── PRD QSA ─── PRD 품질/완결성 판별
├── Offering QSA ─── Offering 품질/보안/디자인 판별
├── Prototype QSA ─── Prototype 품질/보안/디자인 판별
│
├── 7 Sector 자율 감시 (파이프라인 단절 감지+복구)
├── CSS 정적 분석 (AI 느낌 정량 검출)
└── First Principles Gate (3-Question 사전 판정)
```

- 모든 고객 대면 산출물이 **전문가가 만든 것처럼** 보임
- 파이프라인 구성요소 간 **단절이 자동으로 감지되고 복구**됨
- BD팀은 **콘텐츠에만 집중** — 디자인/보안/구조는 Agent가 보장

### 2.3 시급성

- Phase 26까지 BD 파이프라인의 기능 구현은 거의 완료 (F451~F460)
- 기능은 있으나 **품질 체계 부재**가 병목 — 산출물 수가 늘수록 품질 편차 확대
- impeccable/styleseed/awesome-design-md 등 외부 참고 프로젝트가 급성장 중 — 도입 시점이 적절

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| BD팀 사업개발 담당자 (3~5명) | PRD/Offering/Prototype 생성자 | Agent가 품질을 자동 보장하여 콘텐츠에만 집중 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| 고객 (기업) | Offering/Prototype 수신자 | 높음 — 최종 산출물 품질 직접 체감 |
| 팀장/의사결정자 | Go/No-Go 판단 | 중간 — 산출물 신뢰도 기반 판단 |
| Foundry-X 개발 (Sinclair) | Agent/Service 구축·운영 | 높음 — 구현 및 유지보수 |

### 3.3 사용 환경
- 기기: PC (Web Dashboard + CLI)
- 네트워크: 인터넷 (Cloudflare Workers + Pages)
- 기술 수준: 비개발자(BD팀) — 에이전트가 자율 동작, 사람은 확인만

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have — P0)

| # | 기능 | 설명 | 구현 대상 |
|---|------|------|-----------|
| 1 | **BD Sentinel** | BD 산출물 전체 자율 감시 메타 오케스트레이터. 7+ Sector 감시, DDPEV(Detect→Diagnose→Prescribe→Execute→Verify) 사이클 | `.claude/agents/bd-sentinel.md` |
| 2 | **Prototype QSA** | Prototype HTML 5차원 품질/보안 판별 (QSA-R1~R5). First Principles Gate + CSS 정적 분석 | `.claude/agents/prototype-qsa.md` ✅ 설계 완료 |
| 3 | **Offering QSA** | Offering HTML/PPTX 품질/보안/디자인 판별. 18섹션 구조 검증 + 브랜드 일관성 + 콘텐츠 어댑터 톤 점검 | `.claude/agents/offering-qsa.md` |
| 4 | **PRD QSA** | PRD 완결성/논리성/실행가능성 판별. 기존 ogd-discriminator R1~R7 확장 + 착수 판단 기준 내장 | `.claude/agents/prd-qsa.md` |
| 5 | **Generation–Evaluation 정합성 복구** | impeccable 7도메인과 Discriminator 체크리스트 자동 정렬 | `prototype-ogd-adapter.ts` 수정 |
| 6 | **Design Token → Generation 연결** | DesignTokenService의 토큰을 prototype-styles.ts에 주입하는 인터페이스 | `prototype-styles.ts` 확장 |
| 7 | **Feedback → Regeneration 루프 구현** | feedback_pending 상태 Job의 피드백을 Generator에 전달하여 재생성 | `ogd-orchestrator-service.ts` + `prototype-feedback-service.ts` |

### 4.2 부가 기능 (Should Have — P1)

| # | 기능 | 설명 |
|---|------|------|
| 1 | **HITL Review → Action 연결** | revision_requested 리뷰가 자동으로 피드백 → 재생성 트리거 |
| 2 | **Quality 데이터 통합** | ogd_rounds → prototype_quality 자동 적재, 5차원 분해 |
| 3 | **CSS Anti-Pattern Guard** | 생성 시점에서 AI 기본 폰트/순수 흑백/비배수 spacing 사전 차단 |
| 4 | **산업별 DESIGN.md 프리셋** | awesome-design-md 기반 고객 산업에 맞는 디자인 시스템 자동 선택 |
| 5 | **3-Layer Design System** | styleseed식 Design Language → Token → CSS Theme 파이프라인 |

### 4.3 제외 범위 (Out of Scope)

- **외부 디자인 도구 연동**: Figma/Sketch 등 외부 디자인 도구 연동은 이번 범위에 포함하지 않음
- **실시간 협업**: 여러 사용자가 동시에 산출물을 편집하는 기능은 제외
- **PPTX 자동 수정**: PPTX 포맷의 자동 수정은 HTML 대비 도구 제약으로 제외 (판별만 수행)
- **Tailwind CSS 도입**: 기존 인라인 CSS 체계 유지, Tailwind 전환은 별도 검토

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Cloudflare Workers AI | LLM API (Discriminator 평가) | 필수 |
| Cloudflare D1 | Quality 점수 저장 | 필수 |
| impeccable-reference.ts | 디자인 원칙 주입 | 필수 (기존) |
| awesome-design-md | 산업별 DESIGN.md 템플릿 참조 | 선택 (P1) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| AI 느낌 안티패턴 검출 수 | 측정 안 됨 | 0건/산출물 | CSS 정적 분석 (AI 기본 폰트, 순수 흑백, 비배수 spacing) |
| 보안 기밀 노출 건수 | 측정 안 됨 | 0건/산출물 | QSA-R1 Security 체크 |
| O-G-D 루프 평균 라운드 수 | 측정 안 됨 | ≤ 2회 | ogd_rounds 테이블 집계 |
| 파이프라인 GAP 수 | 7건 | 0건 | Sentinel 자율 audit |
| QSA 평균 Quality Score | 측정 안 됨 | ≥ 0.85 | 3종 QSA 판별 결과 집계 |

### 5.2 MVP 최소 기준

- [ ] BD Sentinel이 7 Sector 전체를 audit하고 보고서를 생성할 수 있다
- [ ] Prototype QSA가 HTML을 5차원으로 판별하고 구조화된 피드백을 출력한다
- [ ] Offering QSA가 HTML/PPTX를 판별하고 보안+디자인 점검을 수행한다
- [ ] PRD QSA가 PRD의 완결성을 판별한다
- [ ] Generation–Evaluation 정합성이 복구되어 있다 (impeccable ↔ Discriminator 정렬)

### 5.3 실패/중단 조건

- Agent가 생성하는 피드백이 실행 불가능한 일반론으로만 구성될 경우
- LLM API 비용이 산출물 1건당 $1을 초과할 경우
- BD팀이 Agent 판별 결과를 신뢰하지 못하여 수동 검토를 병행하는 경우

---

## 6. 제약 조건

### 6.1 일정
- 목표 완료일: Phase 27로 편입 (Sprint 224~)
- 마일스톤: M1(에이전트 3종) → M2(GAP 복구) → M3(Sentinel 통합 운영)

### 6.2 기술 스택
- 백엔드: Cloudflare Workers + Hono + D1 (기존)
- 에이전트: Claude Code 커스텀 에이전트 (`.claude/agents/*.md`)
- LLM: Workers AI (Discriminator), Claude (Generator/Sentinel)
- 기존 시스템 의존: O-G-D 인프라, impeccable-reference.ts, DesignTokenService

### 6.3 인력/예산
- 투입 가능 인원: 1명 (Sinclair) + Agent 자율 운영
- LLM 비용: Workers AI 무료 티어 + Claude Code 기존 예산 내

### 6.4 컴플라이언스
- 고객 대면 산출물의 기밀 보호 필수 (QSA-R1 Security)
- 내부 프로젝트명, API endpoint, 인프라 정보 노출 차단

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Offering QSA의 PPTX 판별 범위 — 구조만 판별 vs 시각 요소도 판별 | Sinclair | PRD 확정 전 |
| 2 | PRD QSA와 기존 ogd-discriminator의 역할 분리/통합 범위 | Sinclair | PRD 확정 전 |
| 3 | 산업별 DESIGN.md 프리셋 — 우선 도입 산업 선정 (fintech? manufacturing?) | Sinclair | P1 착수 시 |
| 4 | Sentinel 자율 수정 범위 — DB 스키마 변경 허용 여부 | Sinclair | 설계 확정 전 |
| 5 | Workers AI 모델 선택 — Llama-3.1-8b로 충분한지, 더 큰 모델 필요한지 | Sinclair | PoC 후 판단 |

---

## 8. 설계 원칙 (Architecture Principles)

### First Principles Thinking (제1원칙 사고법)

모든 판별의 최상위 기준:
1. **"이 산출물을 받은 고객이 5초 안에 '이건 진짜다'라고 느끼는가?"**
2. **"이 산출물이 사업 아이디어의 핵심 가치를 체감하게 하는가?"**
3. **"이 산출물에서 우리의 비즈니스 기밀이 노출되는가?"**

### GAN 방법론 (적대적 품질 루프)

- Generator가 산출물 생성 → QSA(Discriminator)가 적대적 판별 → 피드백 → 재생성
- 쉽게 통과시키지 않는다 — "실제 고객 미팅에서 프로젝터로 띄울 수 있는가?" 기준
- 근거 기반 판별 — 모든 피드백에 Rubric 항목 참조 + 실행 가능한 개선안

### 자율 운영 (Agent Autonomy)

- **자율 실행**: 코드 경로 연결, 체크리스트 정렬, 테스트 추가 등 되돌릴 수 있는 변경
- **사람 확인 필요**: DB 스키마 변경, 에이전트 역할 변경, 외부 서비스 연동, 비용 영향

---

## 9. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-08 | 인터뷰 기반 최초 작성 | - |

---

*이 문서는 requirements-interview 스킬에 의해 생성되었습니다.*
