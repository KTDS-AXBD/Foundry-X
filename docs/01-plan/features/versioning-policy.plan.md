---
code: FX-PLAN-134
title: 프로젝트 버전 관리 정책 수립
version: 1.0
status: Active
category: PLAN
feature: F134
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# F134: 프로젝트 버전 관리 정책 수립

## 1. 배경 및 문제

### 현행 체계 분석

Foundry-X는 Sprint 1(2026-03-16)부터 Sprint 31(2026-03-22)까지 31회 반복을 거치며 아래 3개의 독립적 "버전"을 사용해왔다:

| 버전 종류 | 현재 값 | 용도 | 문제점 |
|----------|--------|------|--------|
| `system-version` (SPEC.md frontmatter) | 2.5 | 프로젝트 마일스톤 추적 | Sprint 완료 = minor bump → SemVer 의미 상실 |
| npm CLI 버전 (packages/cli/package.json) | 0.5.0 | npm 배포 | Phase 1 이후 동결, 실제 변경과 무관 |
| SPEC.md 문서 버전 (SPEC.md `version` 필드) | 5.11 | 문서 개정 이력 | 정상 운영 중 (문서 거버넌스 표준 준수) |

### 안티패턴 식별

1. **Sprint = Version Bump**: v2.5가 "31번째 스프린트 완료"를 의미할 뿐, API 호환성/안정성 정보 없음
2. **프로젝트 버전 ≠ 패키지 버전 혼재**: system-version 2.5 vs npm 0.5.0 → 외부에서 혼란
3. **Pre-production인데 v2.x**: SemVer 기준 MAJOR 2는 "2번의 breaking change"를 의미하나 실제로는 해당 없음
4. **패키지별 버전 미관리**: api, web, shared 패키지에 독립 버전 없음

### 근거 자료

- [SemVer 2.0.0 명세](https://semver.org/) — "Major version 0 (0.y.z)은 초기 개발용"
- [0ver.org](https://0ver.org/) — 0.x 장기 유지의 트레이드오프 분석
- Turborepo 공식 권장: pnpm workspace + Turborepo + Changesets 조합

## 2. 목표

- 프로젝트 마일스톤 추적과 패키지 기술 버전을 명확히 분리
- 각 패키지가 SemVer 2.0에 부합하는 독립 버전을 갖도록 전환
- 1.0.0 전환 기준을 명확히 정의하여 Pre-production 탈출 조건 확립
- Sprint 32부터 점진적으로 적용 (기존 이력 보존)

## 3. 신규 버전 정책

### 3.1 프로젝트 레벨: Sprint N 방식

마일스톤 추적은 **Sprint 번호**로만 수행한다. SemVer 형식의 "프로젝트 버전"은 제거한다.

| 항목 | 이전 | 이후 |
|------|------|------|
| SPEC.md frontmatter `system-version` | `2.5` | `Sprint 31` (전환 시점 기록) |
| SPEC.md §3 마일스톤 | `v2.5` | `Sprint 31` |
| CLAUDE.md 버전 표기 | `v2.5` | `Sprint 31` |
| MEMORY.md 버전 표기 | `2.5` | `Sprint 31` |

> **전환 이전 이력 보존**: §3 마일스톤 테이블에서 v0.1~v2.5 행은 그대로 유지하되, Sprint 32행부터 새 형식 적용.

### 3.2 패키지 레벨: Independent SemVer

각 패키지가 독립적으로 SemVer 2.0을 따른다:

| 패키지 | 초기 버전 | 버전 증가 기준 | 배포 대상 |
|--------|----------|--------------|----------|
| `packages/cli` | `0.5.0` (현행 유지) | CLI 기능 변경 시 | npm registry |
| `packages/api` | `0.1.0` (신규 부여) | API endpoint 변경 시 | Cloudflare Workers |
| `packages/web` | `0.1.0` (신규 부여) | UI 기능 변경 시 | Cloudflare Pages |
| `packages/shared` | `0.1.0` (신규 부여) | 타입/인터페이스 변경 시 | 내부 전용 |

#### 0.x 기간 버전 증가 규칙

SemVer §4에 따라 0.x 기간에는 안정성을 보장하지 않으나, 내부 일관성을 위해:

| 변경 유형 | 버전 증가 | 예시 |
|----------|----------|------|
| 하위 비호환 API 변경 | 0.**MINOR**.0 | 0.1.0 → 0.2.0 |
| 새 기능 추가 (호환) | 0.MINOR.**PATCH** | 0.1.0 → 0.1.1 |
| 버그 수정 | 0.MINOR.**PATCH** | 0.1.1 → 0.1.2 |

### 3.3 문서 버전: 현행 유지

SPEC.md `version` 필드(현재 5.11)는 문서 거버넌스 표준(doc-governance.md)에 따라 `Major.Minor` 체계를 그대로 유지한다. 이는 코드 버전과 별개의 문서 개정 이력이다.

### 3.4 CHANGELOG.md 운영

Sprint 완료 시 CHANGELOG.md에 기록하되, 형식을 변경:

```markdown
## Sprint 32 (2026-03-XX)

### packages/api (0.1.0 → 0.2.0)
- BREAKING: `/api/xxx` 엔드포인트 경로 변경
- feat: 새 엔드포인트 추가

### packages/web (0.1.0 → 0.1.1)
- feat: 온보딩 위젯 추가

### packages/cli (변경 없음)

### packages/shared (변경 없음)
```

## 4. 1.0.0 전환 기준

패키지별로 아래 **두 조건 모두 충족** 시 0.x → 1.0.0 전환:

| # | 조건 | 검증 방법 |
|---|------|----------|
| 1 | **외부 사용자 존재** | 조직 외부 사용자(KT DS SR 등)가 프로덕션에서 실제 사용 중 |
| 2 | **API 안정성 선언** | 공개 API 변경 시 하위 호환성 정책 수립 + API 문서화 완료 |

- 패키지별 독립 판단: cli가 먼저 1.0.0에 도달할 수도, api가 먼저일 수도 있음
- 전환 시 SPEC.md에 "1.0.0 승격 근거" 행 추가

## 5. 전환 계획 (Do 단계 가이드)

### Phase A: 정책 문서화 (이번 Sprint)
- [x] PDCA Plan 작성 (본 문서)
- [ ] SPEC.md에 §10 버전 정책 섹션 추가
- [ ] CLAUDE.md 버전 표기 갱신 가이드 작성

### Phase B: 패키지 버전 초기화 (Sprint 32)
- [ ] packages/api/package.json `version` → `"0.1.0"`
- [ ] packages/web/package.json `version` → `"0.1.0"`
- [ ] packages/shared/package.json `version` → `"0.1.0"`
- [ ] packages/cli/package.json `version` → `"0.5.0"` (변경 없음 확인)

### Phase C: SPEC.md 전환 (Sprint 32)
- [ ] frontmatter `system-version` → Sprint 번호 형식으로 변경
- [ ] §3 마일스톤 테이블 Sprint 32행부터 새 형식 적용
- [ ] §3에 "버전 정책 전환 시점" 주석 행 추가

### Phase D: 운영 도구 연동 (Sprint 33+, 선택)
- [ ] Changesets 도입 검토 (PR마다 changeset 파일로 버전 관리 자동화)
- [ ] CI에서 패키지 버전 → 배포 태그 자동 연동

## 6. 리스크

| # | 리스크 | 영향 | 완화 |
|---|--------|------|------|
| 1 | 기존 문서/커밋의 v2.5 참조 혼란 | 저 | §3에 전환 시점 명시, 기존 이력 소급 수정 안 함 |
| 2 | 패키지별 독립 버전 관리 부담 증가 | 중 | Sprint 종료 시에만 변경된 패키지 버전 업데이트 |
| 3 | Changesets 도입 시 학습 비용 | 저 | Phase D에서 선택적 도입, 수동 관리도 충분 |

## 7. 성공 기준

| 지표 | 목표 |
|------|------|
| 패키지별 독립 SemVer 적용 | 4개 패키지 모두 |
| system-version 제거 | SPEC frontmatter에서 Sprint 형식으로 전환 |
| 버전 의미 명확성 | "이 버전이 무엇을 의미하는가"에 즉시 답변 가능 |
| 1.0.0 전환 기준 문서화 | 2개 조건 명시 |
