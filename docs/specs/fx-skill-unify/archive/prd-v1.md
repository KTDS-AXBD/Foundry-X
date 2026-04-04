---
code: FX-SPEC-SKILL-UNIFY
title: "Skill Unification PRD — 3개 스킬 시스템 통합"
version: 1
status: "🔄 검토 중"
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo (AX BD팀)
---

# Skill Unification PRD

**버전:** v1
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

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| 팀장 (백재현) | 스킬 ROI 판단, 팀 도입 의사결정 | 높음 |
| 기술 리드 (Sinclair) | 아키텍처 설계, 구현 | 높음 |

### 3.3 사용 환경

- 기기: PC (웹 대시보드) + 터미널 (CC 스킬 실행)
- 네트워크: 인터넷 (Cloudflare Workers/Pages)
- 기술 수준: 혼합 (개발자 3명 + 비개발자 4명)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 단절 해소 | 우선순위 |
|---|------|------|:---------:|:--------:|
| 1 | **SkillCatalog API 전환** | Web SkillCatalog가 `bd-skills.ts` 대신 `GET /api/skills/registry` + `GET /api/skills/search` 호출. 검색/필터/메트릭 표시 | D1 | P0 |
| 2 | **sf-scan → API 벌크 등록** | skill-framework의 sf-scan 결과를 `POST /api/skills/registry` 벌크 API로 D1에 등록. 기존 skill이면 upsert | D2 | P0 |
| 3 | **DERIVED/CAPTURED → SKILL.md 생성** | 승인된 derived/captured candidate가 SKILL.md 파일을 자동 생성하고 marketplace에 등록. CC에서 즉시 실행 가능 | D3 | P0 |
| 4 | **ax 스킬 실행 메트릭 수집** | usage-tracker hook이 `POST /api/skills/metrics` 호출하여 실행 기록 (duration, tokens, cost, status). CC → API 연동 | D4 | P0 |

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

### 5.2 MVP 최소 기준

- [ ] SkillCatalog가 API에서 데이터를 가져와 표시
- [ ] sf-scan 결과가 D1 skill_registry에 1회 이상 벌크 등록 성공
- [ ] ax 스킬 1개 이상의 실행 기록이 skill_executions에 존재
- [ ] DERIVED candidate 승인 시 SKILL.md가 생성되어 CC에서 실행 가능

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

### 6.2 기술 스택

- 프론트엔드: React 18 + React Router 7 (기존 Vite 8 앱)
- 백엔드: Hono on Cloudflare Workers (기존 API 확장)
- DB: Cloudflare D1 (기존 skill_* 테이블 활용, 새 마이그레이션 최소화)
- CLI: skill-framework sf-scan + ax-marketplace usage-tracker.sh
- 기존 시스템 의존: F274~F278 서비스/라우트 전체

### 6.3 인력/예산

- 투입: Sinclair 1명 (AI-assisted Sprint autopilot)
- API 비용: OpenRouter/Anthropic 기존 예산 내

### 6.4 컴플라이언스

- 스킬 실행 메트릭에 개인정보 미포함 (user_id는 org 내부 ID)
- 외부 API 키는 기존 Cloudflare Secrets 방식 유지

---

## 7. 기술 설계 개요

### 7.1 D1: Web SkillCatalog → API 전환

**현재**: `packages/web/src/data/bd-skills.ts` (정적 69개) → `SkillCatalog.tsx`

**변경**:
- `api-client.ts`에 `getSkillRegistry()`, `searchSkills(q)`, `getSkillEnriched(id)` 메서드 추가
- `SkillCatalog.tsx`가 `BD_SKILLS` 대신 API 호출 (SWR/React Query 또는 useEffect)
- `ProcessGuide.tsx`도 API 데이터 기반으로 전환
- `bd-skills.ts`는 API fallback용으로 유지 (오프라인/에러 시)

### 7.2 D2: sf-scan → API 벌크 등록

**현재**: sf-scan → 콘솔 출력 / JSON 파일

**변경**:
- sf-scan에 `--output json --api-register` 옵션 추가
- JSON 출력을 `POST /api/skills/registry/bulk` 벌크 API로 전달
- 벌크 API: 기존 `POST /api/skills/registry`를 배열 입력 지원으로 확장 (새 라우트)
- upsert 로직: `skill_id` 기준 존재하면 UPDATE, 없으면 INSERT
- 매핑: sf-scan 필드 → skill_registry 컬럼 (name, description, category, tags, source_type='manual')

### 7.3 D3: DERIVED/CAPTURED → SKILL.md 생성

**현재**: derived-review/captured-review 서비스가 승인 시 `skill_registry`에만 등록

**변경**:
- `DerivedReviewService.approve()` / `CapturedReviewService.approve()` 에 SKILL.md 생성 로직 추가
- SKILL.md 템플릿: `{name}.md` → frontmatter(name, description, triggers) + Steps(프롬프트 기반)
- 생성된 SKILL.md를 `POST /api/skills/registry/:id/deploy` API로 반환 (다운로드 또는 Git push)
- admin이 웹에서 "Deploy to marketplace" 버튼 클릭 → SKILL.md 파일 내용 제공 + 설치 가이드

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

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-04 | 최초 작성 (인터뷰 기반) | — |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
