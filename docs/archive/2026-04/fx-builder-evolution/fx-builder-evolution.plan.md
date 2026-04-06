# fx-builder-evolution Planning Document

> **Summary**: Prototype Builder 품질 계량화 + 자동 향상 + Claude Max CLI 비용 최적화
>
> **Project**: Foundry-X
> **Version**: cli 0.5.0 / api 0.1.0 / web 0.1.0
> **Author**: AX BD팀
> **Date**: 2026-04-06
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 자동 빌드된 프로토타입이 고객 데모 수준에 미달하고, 품질 측정 기준이 없으며, Anthropic API 비용($2.40/회)이 반복 개선 시 누적됨 |
| **Solution** | 5차원 품질 스코어링(빌드/UI/기능/PRD반영/코드품질) + 타겟 개선 O-G-D 루프 + Claude Max CLI 통합으로 API 비용 $0 달성 |
| **Function/UX Effect** | BD팀이 PRD만 입력하면 80점+ 프로토타입이 자동 생성되고, 대시보드에서 차원별 점수와 개선 추이를 실시간 확인 |
| **Core Value** | 프로토타입 품질의 정량적 보장으로 고객 데모 전환율 향상 + 월 $20→$0 비용 구조 전환으로 무제한 반복 개선 가능 |

---

## 1. Overview

### 1.1 Purpose

Phase 16에서 구축한 Prototype Auto-Gen 시스템의 품질을 고객 데모 가능 수준(80점+)으로 끌어올리고, Claude Max 구독의 CLI를 활용해 API 비용을 제거하는 것이 목적이에요.

현재 Discriminator는 `vite build` 성공 여부만 판정(0.9/0.4)하여 "빌드는 되지만 조잡한" 결과물이 통과하는 문제가 있어요. 이를 5차원 다차원 평가로 전환하고, 약점 차원에 타겟 피드백을 주는 개선 루프를 구축해요.

### 1.2 Background

- **Phase 16 결과**: 5종 PRD E2E 성공, Railway 클라우드 배포 완료
- **품질 격차**: 빌드 성공 ≠ 고객 데모 가능 — UI 깨짐, 인터랙션 미구현, PRD 미반영
- **비용 압박**: Anthropic API 토큰 비용 ~$2.40/회, 반복 개선 시 $6~12/회 누적
- **구독 기회**: Claude Max $100/월 구독 중 — CLI `--bare` 모드로 API 비용 제거 가능
- **Phase 18 연계**: Offering Pipeline에서 `prototype-builder` 자동 호출(F382) 예정 — 품질 미달 시 파이프라인 전체 효용 저하

### 1.3 Related Documents

- PRD: `docs/specs/fx-builder-evolution/prd-final.md`
- 인터뷰 로그: `docs/specs/fx-builder-evolution/interview-log.md`
- Phase 16 PRD: `docs/specs/prototype-auto-gen/prd-final.md`
- 현행 Builder 코드: `prototype-builder/src/`

---

## 2. Scope

### 2.1 In Scope

- [ ] M0: CLI `--bare` rate limit/안정성 PoC (F384)
- [ ] M0: 5차원 평가 재현성 검증 — ±10점 이내 + 인간 평가 상관관계 (F385)
- [ ] M1: 5차원 품질 스코어러 구현 — 빌드/UI/기능/PRD반영/코드품질 (F386)
- [ ] M1: 기존 5종 프로토타입 베이스라인 측정 + D1 저장 + API 조회 (F387)
- [ ] M2: Claude Max CLI primary + API fallback 듀얼 모드 (F388)
- [ ] M3: Enhanced O-G-D 루프 — 타겟 피드백 + 80점 수렴 + 장애 복구 (F389)
- [ ] M4: Builder Quality 대시보드 — 점수 카드 + 레이더 차트 + 개선 추이 (F390)
- [ ] M4: 사용자 피드백 루프 — BD팀/고객 수동 평가 + 캘리브레이션 (F391)

### 2.2 Out of Scope

- 백엔드 기능 구현 (프로토타입은 React SPA만)
- 모바일 반응형 최적화
- 실시간 협업 편집
- 실제 고객 데이터(PII) 활용

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | F-item |
|----|-------------|----------|--------|
| FR-01 | CLI `--bare` 모드에서 코드 생성이 정상 동작하고 rate limit 측정 | High | F384 |
| FR-02 | 동일 코드 3회 평가 시 품질 점수 편차 ±10점 이내 | High | F385 |
| FR-03 | 5개 차원(빌드 20%, UI 25%, 기능 20%, PRD반영 25%, 코드 10%) 가중 평균 스코어 산출 | High | F386 |
| FR-04 | 스코어 결과를 D1 `prototype_quality` 테이블에 저장 + API GET 조회 | High | F387 |
| FR-05 | CLI 가용성 자동 감지 → CLI/API 자동 전환, 비용 분리 기록 | High | F388 |
| FR-06 | 점수 < 80 시 가장 약한 차원 식별 → 타겟 피드백 생성 → 자동 재생성 (최대 5라운드) | High | F389 |
| FR-07 | Web에 Builder Quality 페이지: 점수 카드, 5차원 레이더 차트, 라운드별 추이 | Medium | F390 |
| FR-08 | BD팀/고객 수동 평가 입력 + 자동 점수 상관관계 분석 | Medium | F391 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 성능 | CLI 코드 생성 1회 < 5분 | Builder 로그 타임스탬프 |
| 비용 | CLI 모드 코드 생성 비용 $0/회 | CostTracker 기록 |
| 재현성 | 동일 입력 점수 편차 ±10점 | 반복 평가 테스트 |
| 가용성 | CLI 실패 시 API fallback 30초 이내 전환 | 장애 시나리오 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 5종 프로토타입 중 3종 이상 품질 점수 80+ 달성
- [ ] CLI 모드로 코드 생성 비용 $0 확인
- [ ] 5차원 스코어가 D1에 저장되고 API로 조회 가능
- [ ] Builder Quality 대시보드에서 점수 확인 가능
- [ ] typecheck + lint + test 통과

### 4.2 Quality Criteria

- [ ] 5차원 평가 재현성 ±10점 이내
- [ ] 자동 개선 5라운드 내 80점 수렴율 70%+
- [ ] CLI/API 듀얼 모드 전환 정상 동작

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CLI `--bare` rate limit이 실용적이지 않음 | High | Medium | M0 PoC에서 사전 측정. 불가 시 API 모드 유지 + 비용 최적화(haiku 우선) |
| 5차원 평가 재현성 부족 (±20점+) | High | Medium | 프롬프트 고정 + temperature 0 + 구조화 출력. 불가 시 빌드+정적분석 기반 3차원으로 축소 |
| Vision API 비용 월 $5 초과 | Medium | Medium | 스크린샷 평가 빈도 제한 (최종 라운드만). DOM 구조 분석으로 대체 가능 |
| 자동 개선 루프 수렴 불가 | Medium | Low | 5라운드 미수렴 시 best score 채택 + 미달 리포트. 수동 피드백 주입 옵션 |
| Railway Hobby plan 동시 처리 제한 | Low | Medium | 작업 큐(D1) 순차 처리. 병렬 필요 시 Railway Team 업그레이드 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 스코어러 위치 | Builder 내장 / API 서비스 분리 | **Builder 내장** | 스코어링은 빌드 직후 실행되므로 Builder 프로세스 내에서 처리 |
| UI 평가 방식 | Vision API / DOM 분석 / Lighthouse | **DOM 분석 (P0) + Vision API (P1)** | DOM 분석은 비용 $0, Vision은 비용 발생하므로 선택적 |
| PRD 반영도 평가 | LLM 비교 / 키워드 매칭 | **LLM 비교** | PRD 기능 목록과 코드의 의미적 매칭 필요 |
| CLI 통합 방식 | subprocess `--bare` / MCP | **subprocess `--bare`** | 기존 `executeWithFallback()` 구조에 자연스러운 통합 |
| 데이터 저장 | D1 / KV / 파일 | **D1** | 기존 `prototype_jobs` 테이블과 조인 가능 |

### 6.3 변경 대상 파일

```
prototype-builder/src/
├── orchestrator.ts    ← Enhanced O-G-D 루프 (5차원 스코어 기반)
├── scorer.ts          ← [신규] 5차원 품질 스코어러
├── fallback.ts        ← CLI 모드 primary + API fallback
├── executor.ts        ← CLI `--bare` 통합
├── types.ts           ← QualityScore, ScoreDimension 타입 추가
├── deployer.ts        ← (변경 없음)
└── index.ts           ← 스코어링 단계 추가

packages/api/src/
├── routes/builder.ts  ← 스코어 조회 API 추가
├── services/          ← prototype-quality-service.ts [신규]
├── schemas/           ← prototype-quality-schema.ts [신규]
└── db/migrations/     ← prototype_quality 테이블 [신규]

packages/web/src/
├── routes/            ← builder-quality.tsx [신규]
└── components/feature/← QualityRadarChart, ScoreCard [신규]
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (flat config, 커스텀 룰 3종)
- [x] TypeScript configuration (`tsconfig.json`, strict mode)
- [x] Vitest 테스트 프레임워크

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **스코어 타입** | 미정의 | `QualityScore`, `ScoreDimension`, `ScoreResult` | High |
| **D1 마이그레이션** | 0109까지 | 0110_prototype_quality.sql | High |
| **Builder 로그 형식** | console.log 기반 | 구조화 로그 (라운드별 점수 기록) | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `ANTHROPIC_API_KEY` | API fallback용 | Server | ☑ (기존) |
| `CLOUDFLARE_API_TOKEN` | Pages 배포 | Server | ☑ (기존) |
| `SKIP_CLI` | CLI 모드 건너뛰기 (Docker) | Server | ☑ (기존) |
| `CLAUDE_CLI_PATH` | CLI 바이너리 경로 | Server | ☐ (신규) |

---

## 8. Implementation Order

### Sprint 175 — M0: 검증 PoC (F384~F385)

**목적**: 3종 AI 검토에서 제기된 핵심 불확실성 해소

1. **F384: CLI PoC**
   - `claude --bare -p "test" --max-turns 5` 반복 실행 (10회)
   - 분당/시간당 rate limit 측정
   - 장시간 실행 (30분+) 안정성 테스트
   - 결과 기록: `docs/specs/fx-builder-evolution/poc-cli.md`

2. **F385: 5차원 재현성 PoC**
   - 기존 5종 프로토타입 중 1종 선택
   - 임시 스코어러 (빌드 + ESLint + LLM PRD 비교) 구현
   - 동일 코드 3회 평가 → 편차 측정
   - BD팀 1명 수동 평가와 비교
   - 결과 기록: `docs/specs/fx-builder-evolution/poc-scorer.md`

**PoC 통과 기준**: CLI 시간당 10회+ 가능 + 평가 편차 ±10점 이내

### Sprint 176 — M1: 5차원 스코어링 (F386~F387)

1. **F386: 스코어러 구현**
   - `prototype-builder/src/scorer.ts` 신규 생성
   - 5차원: `buildScore()` + `uiScore()` + `functionalScore()` + `prdScore()` + `codeScore()`
   - 가중 평균: 빌드(20%) + UI(25%) + 기능(20%) + PRD(25%) + 코드(10%)
   - `orchestrator.ts`에 통합 — `runBuild()` 대체

2. **F387: 베이스라인 + D1**
   - D1 마이그레이션 `0110_prototype_quality.sql`
   - `prototype-quality-service.ts` + API route
   - 5종 프로토타입 베이스라인 점수 측정 + 저장

### Sprint 177 — M2+M3: CLI + 자동 개선 (F388~F389)

1. **F388: CLI 듀얼 모드**
   - `fallback.ts` 수정 — CLI primary, API fallback
   - CLI 가용성 자동 감지 (subprocess 실행 테스트)
   - `CostTracker`에 CLI 모드 $0 기록

2. **F389: Enhanced O-G-D**
   - `orchestrator.ts` 전면 개편
   - 5차원 스코어 기반 타겟 피드백 생성
   - 가장 낮은 차원 식별 → 차원별 개선 프롬프트
   - 5라운드 수렴 + 미수렴 시 best score 채택

### Sprint 178 — M4: 대시보드 + 피드백 (F390~F391)

1. **F390: Builder Quality 대시보드**
   - `packages/web/src/routes/builder-quality.tsx`
   - 5차원 레이더 차트 (Canvas/SVG)
   - 라운드별 점수 추이 그래프
   - 프로토타입 목록 + 점수 카드

2. **F391: 사용자 피드백**
   - 수동 평가 입력 UI
   - 자동 점수 vs 수동 점수 상관관계 분석
   - 캘리브레이션 보정 계수

---

## 9. Next Steps

1. [ ] Write design document (`/pdca design fx-builder-evolution`)
2. [ ] M0 PoC 착수 (`sprint 175`)
3. [ ] PoC 결과에 따라 M1~M4 일정 조정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-06 | Initial draft (PRD-final 기반) | AX BD팀 |
