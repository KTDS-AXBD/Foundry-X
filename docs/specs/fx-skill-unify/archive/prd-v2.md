---
code: FX-SPEC-SKILL-UNIFY
title: "Skill Unification PRD — 3개 스킬 시스템 통합"
version: 2
status: "🔄 검토 중"
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo (AX BD팀)
---

# Skill Unification PRD

**버전:** v2
**날짜:** 2026-04-04
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X의 3개 단절된 스킬 시스템(skill-framework CLI, API skill_registry, ax-marketplace)을 유기적으로 연결하여, 스킬 등록→실행→메트릭→진화가 하나의 루프로 동작하는 통합 플랫폼을 완성한다.

**배경:**
Phase 10에서 OpenSpace를 내재화하여 skill_registry(F275), DERIVED/CAPTURED 엔진(F276~F277), 메트릭 수집(F274), ROI 벤치마크(F278)를 API+D1로 구현했다. skill-framework는 CLI 레벨에서 210+ 스킬을 관리한다. ax-marketplace는 22개 CC 스킬을 SKILL.md로 배포한다. 그러나 이 3개는 서로 데이터를 공유하지 않아, 각각 독립된 사일로로 동작하고 있다.

**목표:**
팀원이 웹 대시보드에서 전체 스킬을 검색·조회하고, 실행 메트릭이 자동으로 쌓이며, AI가 생성한 새 스킬이 즉시 사용 가능한 상태를 만든다.

<!-- CHANGED: 목표와 사용자 페인/업무 임팩트의 직접적 연결 및 명확한 업무 효율 설명 추가 -->
**업무 임팩트 구체화:**
- **팀원**은 웹에서 최신 스킬 목록을 실시간으로 확인하고, 검색 및 필터링을 통해 적합한 스킬을 빠르게 찾을 수 있으며, 각 스킬의 최근 실행 메트릭(빈도, 성공률, 성능지표)을 확인해 효과적인 스킬을 선택하는 업무 효율이 대폭 향상된다.
- **관리자**는 스킬 신규 등록·진화·폐기·실행 이력을 한 곳에서 관리할 수 있어, 도입 ROI 분석과 팀 전체 생산성 관리가 실시간으로 가능하다.
- **AI가 생성한 스킬**은 검증을 거쳐 바로 marketplace에 배포·실행 가능하게 하여, 팀이 신규 업무 자동화 기회를 즉시 활용할 수 있다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ skill-framework│  │ Foundry-X API│  │ ax-marketplace│
│ (CLI)         │  │ (D1)         │  │ (CC Plugin)   │
│               │  │              │  │               │
│ 210+ 파일스캔 │  │ skill_registry│  │ 22 SKILL.md  │
│ sf-lint/deploy│  │ DERIVED 엔진 │  │ usage-tracker │
│               │  │ CAPTURED 엔진│  │ (미연결)      │
│ ❌ API 없음   │  │ ❌ Web 미호출 │  │ ❌ API 없음   │
└──────────────┘  └──────────────┘  └──────────────┘
```

| 단절 | 현상 | 영향 |
|------|------|------|
| **D1** Web↔API | SkillCatalog가 정적 `bd-skills.ts` 69개만 사용 | 검색/메트릭/안전성 활용 불가 |
| **D2** sf-scan↔API | 파일시스템만 스캔, D1 미동기 | 210+ 스킬이 registry에 없음 |
| **D3** 생성→실사용 | DERIVED/CAPTURED가 D1에만 등록 | SKILL.md 미생성, CC 실행 불가 |
| **D4** 실행→메트릭 | ax 스킬 실행 시 기록 안 됨 | ROI 데이터 없음 |

### 2.2 목표 상태 (To-Be)

```
┌──────────────────────────────────────────────────────┐
│                    Foundry-X                          │
│  ┌─────────┐   ┌─────────────┐   ┌──────────────┐   │
│  │ sf-scan  │──▶│ skill_registry│◀──│ SkillCatalog │   │
│  │ (벌크등록)│   │ (D1 SSOT)   │   │ (Web 실시간) │   │
│  └─────────┘   └──────┬──────┘   └──────────────┘   │
│                       │                               │
│       ┌───────────────┼───────────────┐               │
│       ▼               ▼               ▼               │
│  ┌─────────┐   ┌───────────┐   ┌───────────┐        │
│  │ DERIVED  │   │ skill_    │   │ SKILL.md  │        │
│  │ CAPTURED │──▶│ metrics   │◀──│ 자동 생성  │        │
│  │ (AI 진화)│   │ (실행 기록)│   │ (실사용)   │        │
│  └─────────┘   └───────────┘   └───────────┘        │
└──────────────────────────────────────────────────────┘
```

<!-- CHANGED: 데이터 흐름 및 정책 명확화 안내 추가 -->
**데이터 흐름 및 정책 개요:**
- **sf-scan**은 주기적으로 파일시스템 내 스킬 정보를 추출하여 API로 벌크 등록(upsert)한다. 이 과정에서 기존 스킬과 신규 스킬 간 충돌/중복/삭제/업데이트 정책이 적용된다.
- **SkillCatalog**는 D1 skill_registry API에서 실시간으로 페이징/캐시(TTL 5분)된 데이터를 받아 전체 스킬 목록, 필터, 메트릭 등을 표시한다.
- **DERIVED/CAPTURED** 스킬은 승인 시 자동으로 SKILL.md가 생성되어 marketplace에 등록되고, 등록 상태/실행 가능 여부를 검증하는 품질 관리 프로세스를 거친다.
- **ax-marketplace**의 usage-tracker는 스킬 실행 시 API로 메트릭을 전송하며, 비동기·배치 전송 등 성능 영향 최소화 전략이 적용된다.

### 2.3 시급성

- Phase 10에서 구현한 DERIVED/CAPTURED 엔진이 유휴 상태 — API는 있으나 실사용 루프가 없음
- skill-framework의 210+ 스킬 메타데이터가 D1에 없어 검색/분석 불가
- 웹 SkillCatalog가 정적 데이터 → 팀원이 실제 활용도를 볼 수 없음
- 세션 #189에서 drift 방지 원칙을 수립했으나, 스킬 수도 동일한 drift 위험 존재

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| BD 팀원 (member) | AX BD팀 7명 | 웹에서 스킬 검색/실행 결과 조회, 어떤 스킬이 효과적인지 파악 |
| BD 관리자 (admin) | Sinclair/기욱/정원 | 스킬 등록/폐기/버전 관리, 팀 실행 메트릭 모니터링 |

<!-- CHANGED: 사용자 관점 임팩트 보강 -->
**사용자 pain-point와 기대 효과 구체화:**
- **팀원**: "기존에는 개별 CLI/문서/정적 목록을 일일이 확인해야 했으나, 통합 후에는 웹에서 원하는 업무/키워드로 바로 검색·실행 결과까지 확인 → 업무 준비/실행 시간 단축, 스킬 활용률 증가"
- **관리자**: "스킬 실사용과 효과(ROI)가 한눈에 드러나, 신규 도입/폐기/업데이트 의사결정이 신속하게 가능"

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| 팀장 (백재현) | 스킬 ROI 판단, 팀 도입 의사결정 | 높음 |
| 기술 리드 (Sinclair) | 아키텍처 설계, 구현 | 높음 |

### 3.3 사용 환경

- 기기: PC (웹 대시보드) + 터미널 (CC 스킬 실행)
- 네트워크: 인터넷 (Cloudflare Workers/Pages)
- 기술 수준: 혼합 (개발자 3명 + 비개발자 4명)

<!-- CHANGED: 사용자 교육/온보딩 계획 추가 -->
**사용자 교육 및 온보딩:**
- 신규 웹 대시보드, 스킬 검색/실행, 메트릭 해석법, AI 생성 스킬 신뢰성 안내 등 전환 가이드를 별도 문서 및 세션으로 제공한다.
- FAQ, 빠른 시작 튜토리얼, 관리자용 운영 매뉴얼을 Sprint 127까지 마련한다.

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 단절 해소 | 우선순위 |
|---|------|------|:---------:|:--------:|
| 1 | **SkillCatalog API 전환** | Web SkillCatalog가 `bd-skills.ts` 대신 `GET /api/skills/registry` + `GET /api/skills/search` 호출. 검색/필터/메트릭 표시 | D1 | P0 |
| 2 | **sf-scan → API 벌크 등록** | skill-framework의 sf-scan 결과를 `POST /api/skills/registry` 벌크 API로 D1에 등록. 기존 skill이면 upsert | D2 | P0 |
| 3 | **DERIVED/CAPTURED → SKILL.md 생성** | 승인된 derived/captured candidate가 SKILL.md 파일을 자동 생성하고 marketplace에 등록. CC에서 즉시 실행 가능 | D3 | P0 |
| 4 | **ax 스킬 실행 메트릭 수집** | usage-tracker hook이 `POST /api/skills/metrics` 호출하여 실행 기록 (duration, tokens, cost, status). CC → API 연동 | D4 | P0 |

<!-- CHANGED: Must-Have 기능별로 어떤 사용자 pain/효율을 해소하는지 명시 -->
**Must-Have 기능 — 사용자 pain 해소 및 업무 임팩트**
1. **SkillCatalog API 전환**: 팀원이 웹에서 실시간으로 전체 스킬을 찾고, 실행 이력·성능 등 실제 업무 활용도 기반으로 의사결정 가능. → "내가 필요한 스킬을 찾는 데 걸리는 시간이 단축되고, 최신/인기/성과 좋은 스킬을 바로 확인"
2. **sf-scan → API 벌크 등록**: 기존 210+ 스킬의 메타데이터가 자동으로 통합되어, 신규/변경/삭제가 운영에 즉시 반영. → "신규 스킬 배포·업데이트 실수/누락 감소, 수작업 관리 부담 경감"
3. **DERIVED/CAPTURED → SKILL.md 생성**: AI/자동화 기반 스킬이 승인 즉시 marketplace에 반영되어, 팀이 새로운 자동화 기회를 바로 실험/활용 가능. → "신규 스킬 도입/적용 속도 대폭 향상"
4. **ax 스킬 실행 메트릭 수집**: 모든 스킬 실행이 메트릭으로 기록되어, 효과/문제/트렌드를 실시간 모니터링. → "불필요한 스킬, 실패율 높은 스킬을 조기에 식별, 업무 개선 근거 확보"

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|:--------:|
| 5 | **SkillEnrichedView 대시보드** | registry + metrics + versions + lineage 통합 상세 뷰. 기존 `GET /api/skills/registry/:id/enriched` 활용 | P1 |
| 6 | **스킬 진화 계보 시각화** | skill_lineage 데이터를 트리/그래프로 Web 표시 (manual→derived→captured 관계) | P1 |
| 7 | **벌크 등록 스케줄링** | sf-scan → API 등록을 Cron 또는 CI/CD에서 주기적 실행 | P2 |
| 8 | **SKILL.md 템플릿 커스터마이징** | DERIVED/CAPTURED 생성 시 사용할 SKILL.md 템플릿을 admin이 설정 가능 | P2 |

### 4.3 제외 범위 (Out of Scope)

- **D5 ROI 벤치마크 서비스 구현**: D1 테이블(roi_benchmarks)은 존재하나, 서비스/라우트 구현은 D4 데이터 축적 후 별도 Phase에서 진행
- **skill-framework 대폭 리팩토링**: sf-scan에 API 호출 옵션만 추가, 기존 파일 기반 동작은 유지
- **외부 마켓플레이스 연동**: bkit 등 다른 marketplace와의 크로스 등록은 이번 범위 밖
- **실시간 스킬 실행 UI**: 웹에서 스킬을 직접 실행하는 기능 (기존 SkillExecutionForm은 유지)

<!-- CHANGED: Out-of-scope에 추가 (범위 밖 요청 명시) -->
- **이벤트 기반 아키텍처 전환**: 벌크 등록/메트릭 수집 등 배치/이벤트 드리븐 구조는 차기 phase에서 검토
- **외부 스킬 자동 검증 서비스**: 외부 LLM 평가/테스트 자동화는 제외

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|:---------:|
| skill-framework CLI | sf-scan JSON 출력 → API POST | 필수 |
| ax-marketplace | usage-tracker.sh → API POST | 필수 |
| Cloudflare D1 | 기존 skill_* 테이블 활용 | 필수 |
| Claude Code | SKILL.md 파일 읽기 (hot reload) | 필수 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| skill_registry 등록 스킬 수 | 0건 | 210+건 | `SELECT COUNT(*) FROM skill_registry` |
| 웹 SkillCatalog API 호출 | 0건/일 | 10+건/일 | skill-metrics 로그 |
| skill_executions 일일 기록 | 0건 | 20+건 | `SELECT COUNT(*) FROM skill_executions WHERE date > today` |
| DERIVED/CAPTURED → 실사용 전환 | 0건 | 1+건 | marketplace에 SKILL.md 존재 + CC 실행 성공 |

<!-- CHANGED: 성공 기준과 Must-Have 기능, 사용자 임팩트 직접 연결 -->
**지표별 업무 임팩트**
- 등록 스킬 수(210+) → "실제 업무에 통합된 스킬의 양"
- API 호출/실행 기록 → "팀의 실제 활용빈도/관심도"
- 실사용 전환 → "AI 기반 신규 스킬의 실제 업무 적용 성공 사례"

<!-- CHANGED: 실사용의 정의 구체화 -->
**실사용 전환의 정의:**
- SKILL.md가 marketplace에 생성
- CC에서 정상 실행(성공 상태 기록, 실패율 10% 이하)
- 관리자 검증(최소 1회 성공, 품질/이상동작 없는 상태)

### 5.2 MVP 최소 기준

- [ ] SkillCatalog가 API에서 데이터를 가져와 표시
- [ ] sf-scan 결과가 D1 skill_registry에 1회 이상 벌크 등록 성공
- [ ] ax 스킬 1개 이상의 실행 기록이 skill_executions에 존재
- [ ] DERIVED candidate 승인 시 SKILL.md가 생성되어 CC에서 실행 가능
<!-- CHANGED: DERIVED/CAPTURED SKILL.md 실사용 기준과 검증 단계 명시 -->
- [ ] DERIVED/CAPTURED SKILL.md 자동 생성은 초기 파일럿 테스트(3건 이상) 및 관리자 수동 검수/수정 후 실사용 배포

### 5.3 실패/중단 조건

- 기존 API 스키마 변경 시 Phase 10 테스트(175건)가 5% 이상 실패하면 접근 방식 재검토
- skill-framework 연동이 보안 이슈(외부 API 키 노출 등)를 유발하면 D2는 보류

---

## 6. 제약 조건

### 6.1 일정

- 목표: Phase 12 — Sprint 124~127 (4 Sprint)
- 마일스톤:
  - Sprint 124: D1(Web→API) + D2(sf-scan→API) — 기반 연결
  - Sprint 125: D4(실행→메트릭) — 데이터 축적 시작
  - Sprint 126: D3(생성→실사용) — AI 진화 루프 완성
  - Sprint 127: 통합 QA + SkillEnrichedView + 계보 시각화

<!-- CHANGED: 인력/자원 한계 및 리스크 주석 -->
**인력/자원**
- 기존 계획: Sinclair 1명 (AI-assisted Sprint autopilot)
- **현실적 리소스 산정**: 4 Sprint 내 완수는 1인 체제+AI로 불가능. 최소 1명 추가 개발자 또는 일정 연장 필요. QA/운영/테스트/문서화 등 추가 리소스 확보가 필요함.
- **AI는 도구(코드/문서 자동화)로만 활용, 업무 책임은 전담 인력에게 있음.**

### 6.2 기술 스택

- 프론트엔드: React 18 + React Router 7 (기존 Vite 8 앱)
- 백엔드: Hono on Cloudflare Workers (기존 API 확장)
- DB: Cloudflare D1 (기존 skill_* 테이블 활용, 새 마이그레이션 최소화)
- CLI: skill-framework sf-scan + ax-marketplace usage-tracker.sh
- 기존 시스템 의존: F274~F278 서비스/라우트 전체

<!-- CHANGED: D1 API 호출에 페이지네이션/캐시 전략 명시 -->
**API 성능/확장성**
- SkillCatalog API는 페이지네이션(기본 50건/페이지), 캐시(TTL 5분) 옵션을 지원해야 하며, 대량 호출 시 속도 제한(초당 5req/user) 적용
- 벌크 등록/메트릭 수집 API는 인증(서비스 토큰), 속도 제한(분당 60req/source), 에러시 롤백/재시도 정책 적용

### 6.3 인력/예산

- 투입: Sinclair 1명 (AI-assisted Sprint autopilot)
- API 비용: OpenRouter/Anthropic 기존 예산 내

<!-- CHANGED: 인력 계획의 한계와 리스크 명시 -->
- **추가 투입 필요**: QA/테스트/운영 자동화/문서화 등은 별도 리소스 확보 필수(최소 1명 추가 또는 일정 조정 전제)

### 6.4 컴플라이언스

- 스킬 실행 메트릭에 개인정보 미포함 (user_id는 org 내부 ID)
- 외부 API 키는 기존 Cloudflare Secrets 방식 유지
- <!-- CHANGED: 권한/보안 정책 구체화 추가 -->
- **권한/보안 정책**: 
  - skill 등록/폐기/승인/실행/메트릭 접근은 role-based access(관리자/팀원)를 명확히 분리한다.
  - API 호출 시 서비스 토큰/개인 토큰 인증 필수(Cloudflare Secrets/Env).
  - 벌크 등록, 메트릭 기록, SKILL.md 배포 등은 관리자/CI에 한해 허용.

---

## 7. 기술 설계 개요

### 7.1 D1: Web SkillCatalog → API 전환

**현재**: `packages/web/src/data/bd-skills.ts` (정적 69개) → `SkillCatalog.tsx`

**변경**:
- `api-client.ts`에 `getSkillRegistry()`, `searchSkills(q)`, `getSkillEnriched(id)` 메서드 추가
- `SkillCatalog.tsx`가 `BD_SKILLS` 대신 API 호출 (SWR/React Query 또는 useEffect)
- `ProcessGuide.tsx`도 API 데이터 기반으로 전환
- `bd-skills.ts`는 API fallback용으로 유지 (오프라인/에러 시)
<!-- CHANGED: 페이지네이션/캐시 전략, 하위호환성/마이그레이션 정책 추가 -->
- API 응답은 pagination(50건/페이지), 캐시 TTL 5분 적용. 기존 소비 서비스는 v1/v2 API 버전 분리로 다운타임 최소화 및 롤백 옵션 제공.
- 마이그레이션(데이터/스키마/API) 시 구버전 API/데이터와 병행 운영(1 Sprint) 후 완전 전환

### 7.2 D2: sf-scan → API 벌크 등록

**현재**: sf-scan → 콘솔 출력 / JSON 파일

**변경**:
- sf-scan에 `--output json --api-register` 옵션 추가
- JSON 출력을 `POST /api/skills/registry/bulk` 벌크 API로 전달
- 벌크 API: 기존 `POST /api/skills/registry`를 배열 입력 지원으로 확장 (새 라우트)
- upsert 로직: `skill_id` 기준 존재하면 UPDATE, 없으면 INSERT
- 매핑: sf-scan 필드 → skill_registry 컬럼 (name, description, category, tags, source_type='manual')
<!-- CHANGED: 데이터 정합성/충돌/삭제/롤백 정책 추가 -->
- **충돌/중복 처리**: skill_id가 동일할 경우, sf-scan 데이터가 더 최신이면 UPDATE, 아니면 무시(타임스탬프/버전 기준)
- **삭제 정책**: sf-scan에서 누락된 skill은 별도 '미사용' 상태로 soft-delete. 강제 삭제는 관리자 승인 필요.
- **롤백/오류 처리**: 벌크 등록 중 일부 실패 시 전체 롤백, 에러 로그/알림 발송, 수동 조정 프로세스 제공
- **보안**: 벌크 등록 API는 서비스 토큰 기반 인증, 속도 제한(분당 60req/source)

### 7.3 D3: DERIVED/CAPTURED → SKILL.md 생성

**현재**: derived-review/captured-review 서비스가 승인 시 `skill_registry`에만 등록

**변경**:
- `DerivedReviewService.approve()` / `CapturedReviewService.approve()` 에 SKILL.md 생성 로직 추가
- SKILL.md 템플릿: `{name}.md` → frontmatter(name, description, triggers) + Steps(프롬프트 기반)
- 생성된 SKILL.md를 `POST /api/skills/registry/:id/deploy` API로 반환 (다운로드 또는 Git push)
- admin이 웹에서 "Deploy to marketplace" 버튼 클릭 → SKILL.md 파일 내용 제공 + 설치 가이드
<!-- CHANGED: 파일럿/수동 검증, 품질관리 프로세스 추가 -->
- 최초 3건 이상은 자동 생성 후 관리자 수동 검수/수정 및 CC 정상 실행 확인 후 배포(파일럿 운영)
- 실패율 10% 초과/품질 미달 시 자동화 비활성화, 수동 검증 필수

### 7.4 D4: ax 스킬 실행 → 메트릭 수집

**현재**: `usage-tracker.sh` (PreToolUse hook) — 로컬 로그만 기록

**변경**:
- `usage-tracker.sh`에 API 호출 추가:
  ```bash
  curl -s -X POST "$FOUNDRY_API_URL/api/skills/metrics/record" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"skill_id\":\"ax:$SKILL_NAME\",\"duration_ms\":$DURATION,\"status\":\"$STATUS\"}"
  ```
- `POST /api/skills/metrics/record` 엔드포인트 신규 (기존 `recordExecution()` 서비스 활용)
- 토큰 비용은 CC 세션에서 직접 측정 불가 → `tokens: null`로 전송, 서버에서 추정치 계산
<!-- CHANGED: 성능 영향, 비동기/배치, 장애/이상 탐지, 보안 정책 추가 -->
- **성능 영향 최소화**: API 호출은 비동기/배치 전송 지원(네트워크 불량 시 로컬 큐에 저장 후 재시도)
- **성능 영향 평가**: Sprint 125 시작 전 usage-tracker.sh 프로토타입으로 세션 지연/성능 영향 측정(50회 이상)
- **장애/이상 탐지**: 메트릭 전송 실패/오류 발생 시 관리자 알림, 일정 횟수 이상 실패시 fallback(로컬 저장 후 재시도)
- **보안**: API 호출은 서비스 토큰 인증, 1일 1,000회 이상 호출시 자동 Alert

---

## 8. F-item 구성 (안)

| F# | 제목 | Sprint | 단절 | 우선순위 |
|----|------|:------:|:----:|:--------:|
| F303 | SkillCatalog API 전환 — Web bd-skills.ts → skill_registry API 호출 + 실시간 검색/필터/메트릭 | 125 | D1 | P0 |
| F304 | 벌크 레지스트리 API + sf-scan 연동 — POST /api/skills/registry/bulk + sf-scan --api-register 옵션 | 125 | D2 | P0 |
| F305 | 스킬 실행 메트릭 수집 — usage-tracker.sh → POST /api/skills/metrics/record + CC 훅 연동 | 126 | D4 | P0 |
| F306 | DERIVED/CAPTURED → SKILL.md 자동 생성 + Deploy API + marketplace 등록 플로우 | 127 | D3 | P0 |
| F307 | SkillEnrichedView 대시보드 + 진화 계보 시각화 (registry+metrics+lineage 통합 뷰) | 128 | — | P1 |
| F308 | 통합 QA + 데모 데이터 + Production 배포 | 128 | — | P1 |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | sf-scan JSON 출력 포맷과 skill_registry 컬럼 매핑 정확도 검증 필요 | Sinclair | Sprint 124 착수 시 |
| 2 | usage-tracker.sh의 API 호출이 CC 세션 성능에 미치는 영향 측정 | Sinclair | Sprint 125 |
| 3 | DERIVED/CAPTURED SKILL.md 자동 생성 품질 — 프롬프트 기반 Steps가 CC에서 정상 동작하는지 | Sinclair | Sprint 126 |
| 4 | bd-skills.ts 제거 시점 — API 안정성 확보 후 | Sinclair | Sprint 127 |
<!-- CHANGED: 데이터 불일치/이상 탐지 및 수동 조정 프로세스 추가 -->
| 5 | 벌크 등록/자동화 중 데이터 불일치 시 수동 조정 프로세스(수동 diff/restore) 설계 | Sinclair | Sprint 126 |
| 6 | 메트릭 수집 장애/이상 발생 시 Alert/장애 복구 플로우 구현 | Sinclair | Sprint 126 |
| 7 | 권한/보안 정책(롤 분리, 토큰 인증, 속도 제한) 명확화 | Sinclair | Sprint 124 |
| 8 | API 하위호환성/마이그레이션 시 다운타임 최소화 방안 설계 | Sinclair | Sprint 124 |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-04 | 최초 작성 (인터뷰 기반) | — |
<!-- CHANGED: v2 변경사항 추가 -->
| 2차 | 2026-04-05 | AI 검토 의견 반영(데이터 정합성·충돌/롤백/장애복구/보안/운영/실사용 정의·리소스산정 등 보완) | — |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*

---

## 11. 데이터 정합성 및 충돌 관리 정책

<!-- CHANGED: 데이터 정합성/충돌/불일치 대응 섹션 신설 -->
### 11.1 정합성 정책
- skill_registry는 단일 source of truth(SSOT)로 운영. 모든 등록/갱신/삭제는 API를 통해서만 반영
- sf-scan/bulk 등록, DERIVED/CAPTURED, 수동 입력 등 다양한 소스에서 등록 시, skill_id+버전+타임스탬프 기반 merge
- 비정상/중복/충돌 발생 시 API가 에러 반환, 전체 트랜잭션 롤백(atomicity)

### 11.2 충돌/중복 처리
- 동일 skill_id 존재시, 최신 타임스탬프/버전이 우선 적용(이전 상태는 이력으로 보관)
- 충돌(동일 skill_id/다른 내용) 발생시 관리자 승인 대기 상태로 이동, 수동 diff/resolve 프로세스 제공

### 11.3 불일치/이상 데이터 대응
- 자동화 등록/갱신 중 불일치(대량 삭제/누락 등) 탐지시 Alert 및 관리자 승인 전까지 적용 보류
- 불일치 발생 시 웹 대시보드에서 수동 diff/restore/roll-back 기능 제공
- 이상 탐지(실행 실패율 급증, 메트릭 누락 등)시 자동 알림 및 장애 복구(rollback/재시도) 플로우 내장

---

## 12. 롤백 및 장애 대응 플랜

<!-- CHANGED: 롤백/장애 복구/운영 모니터링 세부 정책 신설 -->
### 12.1 장애 탐지 및 Alerting
- API/CLI/웹에서 5회 이상 연속 에러, 5분간 10% 이상 실패율, 대량 데이터 갱신 등 이상 발생 시 Slack/Email 등으로 실시간 Alert
- 메트릭 수집, 벌크 등록, SKILL.md 배포 등 주요 단계별 장애 발생시 담당자 즉시 알림

### 12.2 롤백 및 데이터 복구
- 벌크 등록/메트릭/배포 등 트랜잭션 실패시 전체 롤백
- 일간/주간 단위 자동 백업 및 수동 restore 프로세스 보장
- 장애 발생 시 관리자 수동 diff/복구 가이드 문서화

### 12.3 운영 모니터링
- API/메트릭/등록/실행 등 주요 지표 실시간 대시보드화
- 데이터 이상/트렌드, 장애/성능 저하 등 자동 탐지 및 이력 관리

---

## 13. 권한 및 보안 정책

<!-- CHANGED: 보안/권한 정책 신설 -->
### 13.1 역할별 권한 관리
- **관리자(admin)**: skill 등록/승인/폐기, 벌크 등록, SKILL.md 배포, 데이터 롤백, 모든 메트릭/계보 열람/수정
- **팀원(member)**: skill 검색/실행, 실행 결과/일부 메트릭 열람(자신/팀), SKILL.md 요청/리포트, 피드백 제공

### 13.2 인증/인가
- 모든 API/CLI 호출 시 서비스 토큰/개인 토큰 인증(Cloudflare Secrets/Env 관리)
- 벌크 등록/삭제/배포 등 위험 API는 관리자/CI 토큰만 허용

### 13.3 속도 제한 및 DoS 방지
- 벌크 등록/메트릭 API는 소스별 초당 5req, 분당 60req, 일 1,000회 한도
- 이상 감지 시 자동 차단 및 관리자 Alert

---

## 14. 운영 모니터링 및 Alerting

<!-- CHANGED: 운영 모니터링/Alerting 정책 신설 -->
- 모든 스킬 등록/실행/메트릭/배포 API는 성공/실패/이상 징후를 실시간 로그/모니터링
- 실패율, 데이터 이상, API 응답 지연 등 SLA 기준 초과 시 즉시 Alert
- 주요 이벤트(신규 스킬 배포, 자동화 실패, 데이터 롤백 등)는 대시보드와 알림을 통해 전체 공유

---

## 15. 하위호환성 및 마이그레이션 전략

<!-- CHANGED: 마이그레이션/하위호환성 전략 명시 -->
- API/DB 스키마 변경은 v1/v2 병행 운영, 다운타임 없는 배포(Blue-Green 또는 Shadow) 적용
- 구버전 소비 서비스는 1 Sprint(2주)간 유지, 신규 서비스 완전 전환 후 단계적 sunset
- 마이그레이션 스크립트/테스트 케이스 별도 작성, 전체 QA 통과 전까지 기존 데이터/서비스 유지

---

## 16. 품질/성능/신뢰성 검증

<!-- CHANGED: 품질/성능 검증, AI 기반 스킬 신뢰성 검증 정책 추가 -->
### 16.1 AI 생성 SKILL.md 품질 검증
- 자동 생성된 SKILL.md는 최초 3건 파일럿 후 관리자 수동 검수/수정 필수
- 실행 성공률 90% 미만, 이상동작(프롬프트 오류, 실행 실패 등) 발견시 자동화 비활성화, 수동 검증으로 전환

### 16.2 성능 측정
- usage-tracker.sh 프로토타입으로 CC 세션 성능(실행 지연, API 응답시간, 네트워크 병목) 50회 이상 측정
- 병목/오류 발생시 비동기화/배치/경량화 등 최적화 적용

### 16.3 테스트/QA 리소스
- 신규/변경 API/CLI/자동화 등 전체 시나리오 QA/테스트 플랜 별도 문서화
- 통합 QA(Phase 10 기준 175건+신규 50건 이상 커버리지) 및 자동화 테스트 도구 적용

---

## 17. 단계적 롤아웃/운영 전략

<!-- CHANGED: 단계적 롤아웃/점진적 배포 정책 추가 -->
- 신규 기능/자동화/등록/메트릭 등은 단계별로 롤아웃(관리자 전용→팀원 베타→전체 공개)
- 장애/품질 문제 발견시 즉시 이전 단계로 롤백
- 신규 스킬/자동화/시장 배포는 초기 1~3건만 시범 적용 후 확대

---

## 18. 추가 리스크 및 검증 필요사항

<!-- CHANGED: 리스크/가설/사실 확인 등 명시 -->
- AI 생성 스킬의 품질/신뢰도 미달시, 자동화 확장 대신 수동 검증/검수 체계 강화 필요
- 인력(1인체제+AI)으로 전체 범위/운영/품질 커버 불가, 리소스 추가 확보 필수
- 데이터 정합성/충돌/불일치 발생시 서비스 일관성 저하 위험, 수동 조정/Alert/복구 플로우 강화
- 외부 API/DB 장애, Cloudflare D1 단일장애점(SPOF)시 서비스 중단 위험, 백업/복제/복구 시나리오 필요
- 기존 수치/가정(스킬 수, 성공률, 품질 등) 지속 모니터링, 이상 발견시 PRD 재검토
- 사용자 교육/온보딩/가이드 부재시 신규 시스템 활용률 저하 우려, 별도 교육자료/세션 필수

---

## Out-of-scope

<!-- CHANGED: Out-of-scope에 명시적으로 범위 밖 요청 추가 -->
- 이벤트 기반 아키텍처(배치/메시지큐 기반 리팩토링)
- 외부 LLM 평가/자동화 검증 서비스
- 외부 마켓플레이스(bkit 등) 연동
- 실시간 스킬 실행 UI 개선(웹 내 직접 실행 등)
- 대규모 데이터 모델 재설