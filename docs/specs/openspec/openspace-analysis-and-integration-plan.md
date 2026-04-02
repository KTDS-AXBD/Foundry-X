# OpenSpace 분석 및 Foundry-X 적용 방안

> **문서코드:** FX-ANLS-OPENSPACE-001
> **작성일:** 2026-04-02
> **작성:** AX BD팀
> **상태:** Draft

---

## 1. OpenSpace 프로젝트 분석

### 1.1 개요

OpenSpace는 홍콩대학교 Data Intelligence Lab(HKUDS)이 개발한 **Self-Evolving Skill Engine**이다. 슬로건은 "Make Your Agents: Smarter, Low-Cost, Self-Evolving"이며, AI 에이전트가 매 작업에서 스킬을 캡처·파생·수리하여 재사용함으로써 토큰 비용을 줄이고 품질을 높이는 프레임워크다.

핵심 철학: **"매번 처음부터 추론하지 말고, 검증된 실행 패턴을 재사용하라."**

### 1.2 아키텍처

OpenSpace는 4개 핵심 레이어로 구성된다.

**Local Skill Database** — SQLite 기반 스킬 저장소. 스킬 버전, 계보(lineage), 실행 메트릭을 추적한다. 모든 핵심 기능이 로컬에서 동작하므로 클라우드 의존성이 없다.

**Evolution Engine** — 3가지 진화 모드(FIX/DERIVED/CAPTURED)를 통해 스킬을 자율적으로 개선한다. 실패를 감지하면 자동 수리하고, 성공 패턴에서 새 스킬을 추출하며, 복합 워크플로우를 메타 스킬로 통합한다.

**MCP 통합 레이어** — Model Context Protocol(stdio)을 통해 호스트 에이전트와 통신한다. `execute_task`, `search_skills`, `fix_skill`, `upload_skill` 4개 도구를 노출하며, Claude Code, OpenClaw, nanobot, Cursor 등과 연동된다.

**Cloud Skill Community** — open-space.cloud를 통한 선택적 스킬 공유. 한 에이전트의 개선이 전체 네트워크의 업그레이드가 되는 Collective Intelligence 구조다.

### 1.3 스킬 진화 3모드

**FIX (자동 수리)** — 스킬 실행 실패 시 트리거된다. 에러 컨텍스트(스택 트레이스, API 응답, 도구 실패)를 캡처하고 LLM에게 수정 로직 생성을 요청한 뒤 즉시 재실행하여 검증한다. 성공하면 새 스킬 버전으로 저장된다. 예시로 PDF 추출 실패 시 PyPDF2 → pdfplumber로 폴백 라이브러리를 자동 생성한다.

**DERIVED (패턴 파생)** — 성공적 실행 후 트리거된다. 중간 단계와 도구 호출을 분석하여 재사용 가능한 시퀀스("추출 → 변환 → 검증 → 출력" 등)를 식별하고 다단계 워크플로우를 단일 최적화된 스킬로 통합한다.

**CAPTURED (워크플로우 캡처)** — 복잡한 작업에서 성공적인 도구 조합을 기록하고 도메인 특화 워크플로우를 추출한다. 크로스 도메인 오케스트레이션을 위한 메타 스킬을 생성하며 시맨틱 검색을 통한 스킬 발견을 가능하게 한다.

### 1.4 GDPVal 벤치마크 결과

OpenSpace는 "Agent GDP"라는 경제적 벤치마크(GDPVal)를 도입했다 — 에이전트가 소비한 토큰 대비 생성한 달러 가치를 측정한다.

| 지표 | 수치 |
|------|------|
| 수익 배수 | 베이스라인 대비 4.2× |
| 토큰 절감 | Phase 2에서 46% 감소 |
| 품질 점수 | 평균 70.8% (ClawWork 대비 +30pp) |
| 가치 포착률 | 72.8% (전체 테스트 에이전트 중 최고) |

카테고리별로는 컴플라이언스/양식(토큰 51% 절감), 문서(56% 절감), 엔지니어링(43% 절감) 순으로 높은 효율을 보였다. 전체 165개 스킬이 자율 생성되었으며, 그중 File Format I/O 44개, Execution Recovery 29개, Document Generation 26개(1개 템플릿에서 13버전까지 진화), QA 23개 순이다.

### 1.5 스킬 구조

각 스킬은 `SKILL.md` + YAML 프론트매터(name, description) 형태의 마크다운 파일로 정의되며, 에이전트 프레임워크의 skill.md 포맷과 호환된다. 로딩 우선순위는 `OPENSPACE_HOST_SKILL_DIRS`(최고) → `config_grounding.json` → 기본 디렉토리(최저) 순이고, 첫 발견 시 `.skill_id` 사이드카 파일이 생성되어 재시작 간 추적이 유지된다. 보안 검증(`check_skill_safety`)을 통해 프롬프트 인젝션, 자격증명 탈취 등 위험 패턴이 포함된 스킬은 자동 차단된다.

### 1.6 "My Daily Monitor" 쇼케이스

인간이 작성한 코드 0줄로 29개 UI 패널 + 14개 데이터 서비스를 갖춘 풀스택 대시보드를 구축했다. 6단계(Seed → Scaffold → Build → Fix → Evolve → Capture)를 거쳐 60+ 스킬이 자율 생성되었으며, 모든 진화 이력이 SQLite DB에 저장된다.

---

## 2. Foundry-X 현재 상태 점검

### 2.1 프로젝트 현황

Foundry-X는 Phase 9(Sprint 98 완료) 단계에 있으며, AX BD 사업개발 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼이다.

| 항목 | 수치 |
|------|------|
| 총 테스트 | 2,664+ (API 2,250 + CLI 149 + Web 265) |
| E2E 스펙 | 35개 (~146 tests) |
| API endpoints | ~420개 |
| Services | 169개 |
| D1 migrations | 0001~0078 |
| 패키지 | cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0 |

### 2.2 기존 스킬 체계

Foundry-X는 이미 자체 스킬 체계를 보유하고 있다.

**AX BD Discovery 스킬 (v8.2)** — `.claude/skills/ax-bd-discovery/`에 2단계 발굴 프로세스 오케스트레이터가 있고, `.claude/skills/ai-biz/`에 cost-model, feasibility-study 등 11종 서브스킬이 배치되어 있다.

**개발 도구 스킬** — npm-release(배포), tdd(Red→Green→Refactor 자동화) 스킬이 있다.

**커스텀 에이전트** — `.claude/agents/`에 deploy-verifier, spec-checker, build-validator 3종 에이전트가 정의되어 있다.

**GAN Agent Architecture** — Harness의 Generation-Validation 패턴을 GAN 개념으로 확장한 설계서가 이미 존재한다. Generator Agent → Discriminator Agent → Orchestrator 구조로 적대적 긴장을 통한 품질 향상을 추구한다.

### 2.3 강점과 갭

**강점:** 98개 Sprint를 거치며 검증된 SDD Triangle(Spec ↔ Code ↔ Test) 동기화 엔진, 풍부한 BD 도메인 스킬(76스킬+36커맨드), 프로덕션 배포 인프라(Cloudflare Workers/Pages/D1), GAN Agent 아키텍처 설계 완료.

**갭:** 스킬이 정적 파일로 수동 관리되어 실행 결과에서 자동 진화하지 않는다. 스킬 성공/실패 메트릭이 수집되지 않으며, 에이전트 간 스킬 공유·검색 메커니즘이 부재하다. 토큰 효율성을 측정하는 경제적 벤치마크도 없다.

---

## 3. 적용 방안 설계

### 3.1 전략적 방향

OpenSpace의 3가지 핵심 개념을 Foundry-X의 기존 아키텍처에 점진적으로 내재화한다. 외부 의존성(OpenSpace 라이브러리 직접 도입)이 아니라, 개념과 패턴을 Foundry-X의 TypeScript 모노리포 안에서 자체 구현하는 방식이다.

```
OpenSpace 핵심 개념          Foundry-X 적용
─────────────────           ──────────────
Self-Evolving Skills    →   BD 스킬 자동 진화 엔진
GDPVal (경제적 벤치마크)  →   AX BD ROI 메트릭 시스템
Cloud Skill Community   →   팀 내 스킬 레지스트리 + 공유
```

### 3.2 Phase 10 로드맵: "Skill Evolution"

#### Track A — 스킬 메트릭 수집 (Sprint 99~100)

BD 스킬 실행 시 메트릭을 자동 수집하는 인프라를 구축한다.

**수집 대상:** 스킬 호출 횟수, 성공/실패율, 토큰 소비량, 실행 시간, 산출물 품질 점수(기존 사업성 신호등과 연계). 이를 D1에 `skill_executions` 테이블로 저장하고, 기존 토큰 대시보드(F143)와 연동하여 스킬별 비용-효과를 시각화한다.

**기존 자산 활용:** Sprint 45(F158~F161)의 KPI 자동 수집 인프라와 Sprint 43(F143)의 모델 품질 대시보드가 기반이 된다.

#### Track B — FIX 모드 구현 (Sprint 101~102)

BD 스킬 실행 실패 시 자동 수리하는 엔진을 만든다.

**메커니즘:** 기존 TDD 스킬(`.claude/skills/tdd/`)의 Red→Green→Refactor 패턴을 확장하여, 스킬 실패 시 에러 컨텍스트 캡처 → LLM 수정 생성 → 재실행 검증 → 새 버전 저장 파이프라인을 구축한다. GAN Agent Architecture의 Generation-Validation 루프와 자연스럽게 결합된다 — Generator가 수정을 생성하고 Discriminator가 검증하는 구조다.

**안전 장치:** CLAUDE.md의 "자동 커밋 절대 금지" 원칙을 준수하여, FIX 결과는 반드시 사람이 확인 후 커밋한다. 재시도 상한 3회(Harness 설계 원칙 준용).

#### Track C — DERIVED + CAPTURED 모드 (Sprint 103~105)

**DERIVED:** BD 프로세스 7단계(발굴→검증→제안→수주→수행→완료→회고) 각 단계에서 성공 패턴을 자동 추출한다. 예를 들어 특정 산업군의 BMC 작성 → AI 검토 → Six Hats 토론 시퀀스가 반복 성공하면 "산업군별 사업성 평가 워크플로우" 스킬로 파생시킨다.

**CAPTURED:** 스프린트 실행 이력에서 크로스 도메인 패턴을 식별한다. 방법론 레지스트리(F191)와 연동하여 어떤 방법론 조합이 높은 성공률을 보이는지 학습한다.

#### Track D — 스킬 레지스트리 및 공유 (Sprint 106~107)

팀 내 스킬 레지스트리를 구축하여 팀원 간 검증된 스킬을 공유한다.

**구현:** 기존 에이전트 마켓플레이스(F152)를 확장하여 스킬 마켓플레이스로 발전시킨다. 스킬 메타데이터(name, description, success_rate, token_cost, lineage)를 기반으로 시맨틱 검색을 지원한다. OpenSpace의 `.skill_id` 사이드카 패턴을 채용하여 스킬 버전 추적을 유지한다.

**보안:** OpenSpace의 `check_skill_safety` 패턴을 적용하여 스킬 로드 전 위험 패턴을 자동 검사한다.

#### Track E — AX BD ROI 벤치마크 (Sprint 108)

GDPVal을 참고하여 AX BD 맥락에 맞는 경제적 벤치마크를 설계한다.

**측정 공식:** `BD_ROI = (스킬로 생성한 산출물 가치) / (소비 토큰 비용)`. 산출물 가치는 사업성 신호등(F262)의 3단계 점수를 달러 환산하고, 토큰 비용은 실제 API 호출 비용을 합산한다. Cold Start(스킬 없이)와 Warm Run(진화된 스킬 활용) 간 비교를 통해 스킬 진화의 실질적 가치를 정량화한다.

### 3.3 아키텍처 설계

```
┌─────────────────────────────────────────────────────────┐
│                    Foundry-X Web Dashboard               │
│   ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│   │ Skill    │  │ Evolution│  │ BD ROI             │    │
│   │ Registry │  │ Lineage  │  │ Dashboard          │    │
│   │ Browser  │  │ Graph    │  │ (GDPVal 방식)      │    │
│   └────┬─────┘  └────┬─────┘  └─────────┬──────────┘    │
│        │              │                  │               │
├────────┼──────────────┼──────────────────┼───────────────┤
│        │     Foundry-X API (Hono)        │               │
│   ┌────┴──────────────┴──────────────────┴─────────┐     │
│   │              Skill Evolution Engine              │     │
│   │  ┌──────┐  ┌─────────┐  ┌──────────┐           │     │
│   │  │ FIX  │  │ DERIVED │  │ CAPTURED │           │     │
│   │  │Engine│  │ Engine  │  │ Engine   │           │     │
│   │  └──┬───┘  └────┬────┘  └────┬─────┘           │     │
│   │     │           │            │                  │     │
│   │  ┌──┴───────────┴────────────┴──────────┐       │     │
│   │  │       Skill Execution Tracker        │       │     │
│   │  │  (메트릭 수집 + 성공/실패 분류)       │       │     │
│   │  └──────────────┬───────────────────────┘       │     │
│   └─────────────────┼───────────────────────────────┘     │
│                     │                                     │
├─────────────────────┼─────────────────────────────────────┤
│   ┌─────────────────┴────────────────────────────────┐    │
│   │                D1 Database                        │    │
│   │  skill_executions │ skill_versions │ skill_lineage│    │
│   └──────────────────────────────────────────────────┘    │
│                                                           │
├───────────────────────────────────────────────────────────┤
│   ┌──────────────────────────────────────────────────┐    │
│   │         기존 BD 스킬 체계                         │    │
│   │  .claude/skills/ax-bd-discovery/ (오케스트레이터) │    │
│   │  .claude/skills/ai-biz/ (11종 서브스킬)           │    │
│   │  .claude/agents/ (3종 커스텀 에이전트)             │    │
│   │  + GAN Agent Architecture (G→D 루프)              │    │
│   └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

### 3.4 OpenSpace 직접 도입 vs 자체 구현 비교

| 관점 | OpenSpace 직접 도입 | Foundry-X 자체 구현 (권장) |
|------|---------------------|---------------------------|
| 기술 스택 | Python + SQLite + MCP | TypeScript + D1 + 기존 인프라 |
| 기존 자산 활용 | 낮음 (별도 시스템) | 높음 (76스킬+169서비스 재활용) |
| 커스터마이징 | 제한적 (프레임워크 제약) | 자유 (BD 도메인 특화 가능) |
| 유지보수 | 외부 의존성 증가 | 모노리포 내 통합 관리 |
| 학습 비용 | Python + OpenSpace API 학습 | 기존 팀 역량으로 충분 |
| 클라우드 연동 | open-space.cloud (외부) | Cloudflare 인프라 (자체) |

**결론:** OpenSpace의 개념과 패턴을 학습하되, 구현은 Foundry-X의 TypeScript 모노리포 내에서 자체적으로 한다. "Git이 진실, Foundry-X는 렌즈"라는 핵심 철학과 정합하며, 기존 420+ endpoints와 169 services를 최대한 활용할 수 있다.

### 3.5 GAN Agent Architecture와의 시너지

이미 설계된 Harness × GAN Agent Architecture와 OpenSpace의 스킬 진화를 결합하면 강력한 시너지가 발생한다.

**Generator Agent**가 BD 산출물(사업계획서, BMC, 제안서 등)을 생성하면 **Discriminator Agent**가 판별·피드백을 제공하고, 이 과정에서 성공한 패턴이 **DERIVED 스킬**로 자동 추출된다. 실패한 경우 **FIX 엔진**이 수정을 시도하고, 복합 워크플로우의 최적 조합이 **CAPTURED 스킬**로 캡처된다. Orchestrator는 수렴 판정과 함께 스킬 진화 트리거를 제어한다.

```
Generator Agent ──산출물──→ Discriminator Agent
     ↑                           │
     │    FIX (실패시 수리)       │ 피드백
     │                           ↓
     ├────────── Orchestrator ────┤
     │     (수렴 판정 + 진화 트리거)│
     │                           │
     ↓                           ↓
 DERIVED Skill              CAPTURED Skill
 (성공 패턴 추출)            (워크플로우 캡처)
```

### 3.6 우선순위 및 일정 요약

| 순번 | Track | Sprint | 핵심 산출물 | 의존성 |
|:----:|:-----:|:------:|-----------|-------|
| 1 | A: 메트릭 수집 | 99~100 | skill_executions 테이블 + 대시보드 연동 | F143, F158~F161 |
| 2 | B: FIX 모드 | 101~102 | 자동 수리 엔진 + GAN 루프 통합 | Track A |
| 3 | C: DERIVED+CAPTURED | 103~105 | 패턴 추출 + 워크플로우 캡처 | Track A, B |
| 4 | D: 스킬 레지스트리 | 106~107 | 팀 내 공유 + 시맨틱 검색 | Track A |
| 5 | E: BD ROI 벤치마크 | 108 | Cold/Warm 비교 + ROI 정량화 | Track A, C |

---

## 4. 결론

OpenSpace가 증명한 핵심 가치는 "에이전트가 작업을 반복할수록 더 효율적이 된다"는 것이다 — 토큰 46% 절감, 품질 30pp 향상이라는 정량적 결과가 이를 뒷받침한다. Foundry-X는 이미 76개 BD 스킬, GAN Agent 아키텍처, 420+ API endpoints라는 풍부한 기반을 갖추고 있으므로, OpenSpace의 Self-Evolving 개념을 내재화하면 AX BD 업무 효율을 크게 높일 수 있다.

핵심 원칙은 3가지다: **첫째**, 외부 프레임워크를 직접 도입하지 않고 개념을 자체 구현한다. **둘째**, 기존 자산(메트릭 인프라, 에이전트 마켓플레이스, TDD 스킬)을 최대한 활용한다. **셋째**, "자동 커밋 절대 금지" 등 Foundry-X의 안전 원칙을 스킬 진화에도 동일하게 적용한다.

---

## Sources

- [HKUDS/OpenSpace GitHub](https://github.com/HKUDS/OpenSpace)
- [OpenSpace Community](https://open-space.cloud/)
- [OpenSpace Skills README](https://github.com/HKUDS/OpenSpace/blob/main/openspace/skills/README.md)
- [OpenSpace Config README](https://github.com/HKUDS/OpenSpace/blob/main/openspace/config/README.md)
- [OpenSpace Host Skills README](https://github.com/HKUDS/OpenSpace/blob/main/openspace/host_skills/README.md)
- [OpenSpace Showcase (My Daily Monitor)](https://github.com/HKUDS/OpenSpace/blob/main/showcase/README.md)
- [MarkTechPost: Self-Evolving Skill Engine with OpenSpace](https://www.marktechpost.com/2026/03/24/a-coding-implementation-to-design-self-evolving-skill-engine-with-openspace-for-skill-learning-token-efficiency-and-collective-intelligence/)
- [Self-Evolving Agents: Open-Source Projects Redefining AI in 2026](https://evoailabs.medium.com/self-evolving-agents-open-source-projects-redefining-ai-in-2026-be2c60513e97)
