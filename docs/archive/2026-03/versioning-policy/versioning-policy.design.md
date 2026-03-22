---
code: FX-DSGN-134
title: 프로젝트 버전 관리 정책 수립 — 상세 설계
version: 1.0
status: Draft
category: DSGN
feature: F134
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# F134: 버전 관리 정책 — 상세 설계

> **Summary**: Sprint 기반 비공식 버전 → 프로젝트(Sprint N) + 패키지(Independent SemVer) 분리 전환
>
> **Project**: Foundry-X
> **Planning Doc**: [versioning-policy.plan.md](../../01-plan/features/versioning-policy.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. `system-version` 필드(SemVer 형식의 프로젝트 버전)를 Sprint 번호 기반으로 전환
2. 4개 패키지 각각에 Independent SemVer 0.x 버전을 부여
3. SPEC.md, CLAUDE.md, MEMORY.md, CHANGELOG.md의 버전 참조를 일관되게 갱신
4. 기존 이력(v0.1~v2.5)을 보존하면서 점진적으로 전환

### 1.2 Design Principles

- **최소 변경**: 코드 로직 수정 없이 메타데이터(package.json, 문서)만 변경
- **이력 보존**: 기존 31 Sprint의 마일스톤 이력을 소급 수정하지 않음
- **명확한 경계**: "이 시점부터 새 정책"이라는 전환선을 문서에 명시

---

## 2. 현행 상태 분석

### 2.1 버전 번호 현황 (전환 전)

| 위치 | 현재 값 | 문제 |
|------|--------|------|
| `package.json` (root) | 없음 (`private: true`) | — |
| `packages/cli/package.json` | `1.5.0` | npm 배포본은 `0.5.0` — 불일치 |
| `packages/api/package.json` | `1.5.0` | Workers 배포, SemVer 의미 없음 |
| `packages/web/package.json` | `1.5.0` | Pages 배포, SemVer 의미 없음 |
| `packages/shared/package.json` | `1.5.0` | 내부 전용, SemVer 의미 없음 |
| `SPEC.md` frontmatter `system-version` | `2.5` | Sprint 기반 비공식 bump |
| `SPEC.md` §3 마일스톤 | `v0.1` ~ `v2.5` | 32행, Sprint와 1:1 |
| `CLAUDE.md` | `v2.5 — Sprint 31 완료` | system-version 참조 |
| `MEMORY.md` | `Version: 2.5` | system-version 참조 |

### 2.2 버전이 참조되는 모든 위치 (Impact Analysis)

아래 파일들에서 `system-version` 또는 프로젝트 버전을 참조한다:

| # | 파일 | 참조 패턴 | 변경 필요 |
|---|------|----------|----------|
| 1 | `SPEC.md` frontmatter | `system-version: 2.5` | ✅ Sprint 형식으로 |
| 2 | `SPEC.md` §1 프로젝트 개요 | `Version: 2.5` | ✅ Sprint 형식으로 |
| 3 | `SPEC.md` §2 현재 상태 | `Workers ... v2.4.0 배포` | ⚠️ Workers 배포 참조는 패키지 버전으로 |
| 4 | `SPEC.md` §3 마일스톤 | `v0.1 ~ v2.5` 행들 | ✅ Sprint 32+ 행부터 새 형식 |
| 5 | `SPEC.md` §5 F-items | `v2.6` 등 마일스톤 버전 | ✅ Sprint 번호로 |
| 6 | `SPEC.md` §9 변경이력 | `system-version X.Y` | ✅ Sprint 번호로 |
| 7 | `CLAUDE.md` 현재 상태 | `v2.5 — Sprint 31 완료` | ✅ Sprint 31 |
| 8 | `CLAUDE.md` 마일스톤 | `v0.6.0 ~ v2.5` | ✅ Sprint 32+ 새 형식 |
| 9 | `MEMORY.md` 프로젝트 상태 | `Version: 2.5` | ✅ Sprint 31 |
| 10 | `MEMORY.md` 주요 지표 | Workers URL 옆 버전 | ✅ 패키지 버전으로 |
| 11 | `CHANGELOG.md` | Sprint별 이력 | ✅ 신규 Sprint부터 패키지별 형식 |
| 12 | `packages/*/package.json` | `version` 필드 | ✅ Independent 버전 부여 |

---

## 3. 변경 설계

### 3.1 package.json 버전 변경

#### packages/cli/package.json

```json
// Before
"version": "1.5.0"

// After
"version": "0.5.0"
```

> 근거: npm에 `foundry-x@0.5.0`으로 배포됨. package.json을 npm 배포 버전과 일치시킨다.
> CLI 기능 변경이 Phase 1 이후 없었으므로 0.5.0이 정확하다.

#### packages/api/package.json

```json
// Before
"version": "1.5.0"

// After
"version": "0.1.0"
```

> 근거: API 패키지는 npm에 배포하지 않음. Workers 배포 대상이지만 외부 사용자가 없고
> API 안정성을 선언하지 않았으므로 0.x에서 시작. Sprint 6(첫 API)~31까지의 변경은
> 모두 초기 개발(0.y.z)에 해당.

#### packages/web/package.json

```json
// Before
"version": "1.5.0"

// After
"version": "0.1.0"
```

> 근거: Pages 배포 대상. 외부 사용자 없음, UI 안정성 미선언.

#### packages/shared/package.json

```json
// Before
"version": "1.5.0"

// After
"version": "0.1.0"
```

> 근거: 내부 전용 패키지. 다른 패키지에서만 참조.

### 3.2 SPEC.md 변경

#### 3.2.1 frontmatter

```yaml
# Before
system-version: 2.5

# After
system-version: Sprint 31
```

#### 3.2.2 §1 프로젝트 개요

```markdown
# Before
- **Version**: 2.5

# After
- **Sprint**: 31 (Phase 4 Conditional Go)
- **Package Versions**: cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0
```

#### 3.2.3 §3 마일스톤 — 전환선 추가

기존 v0.1~v2.5 행은 그대로 유지. Sprint 31 다음에 전환선 + Sprint 32 행 추가:

```markdown
| v2.5 | Sprint 31: ... | ✅ |
| — | **⚡ 버전 정책 전환 (F134)** — 이후 프로젝트는 Sprint N, 패키지는 Independent SemVer | — |
| Sprint 32 | {제목} (cli 0.5.x, api 0.x.y, web 0.x.y) | 📋 |
```

#### 3.2.4 §5 미래 작업 F-items — 마일스톤 버전 표기

```markdown
# Before
| F134 | ... (FX-REQ-134, P1) | v2.6 | 📋 | ... |

# After
| F134 | ... (FX-REQ-134, P1) | Sprint 32 | ✅ | ... |
```

#### 3.2.5 신규 §10 버전 정책 섹션

§9 변경이력 뒤에 추가:

```markdown
## §10 버전 정책

### 프로젝트 마일스톤
- **Sprint N**: 프로젝트 진행 상태 추적 (Sprint 32부터 적용)
- 이전(Sprint 1~31): v0.1~v2.5 형식 사용 (이력 보존, 소급 수정 안 함)

### 패키지 버전 (Independent SemVer 2.0)

| 패키지 | 현재 버전 | 배포 대상 | 버전 증가 기준 |
|--------|----------|----------|--------------|
| packages/cli | 0.5.0 | npm registry | CLI 기능 변경 |
| packages/api | 0.1.0 | Cloudflare Workers | API endpoint 변경 |
| packages/web | 0.1.0 | Cloudflare Pages | UI 기능 변경 |
| packages/shared | 0.1.0 | 내부 전용 | 타입/인터페이스 변경 |

### 0.x 기간 버전 증가 규칙

| 변경 유형 | 버전 증가 | 예시 |
|----------|----------|------|
| 하위 비호환 변경 | 0.MINOR.0 | 0.1.0 → 0.2.0 |
| 새 기능 추가 | 0.minor.PATCH | 0.1.0 → 0.1.1 |
| 버그 수정 | 0.minor.PATCH | 0.1.1 → 0.1.2 |

### 1.0.0 전환 기준

패키지별 독립 판단. 아래 두 조건 **모두** 충족 시 승격:
1. 외부 사용자가 프로덕션에서 실제 사용 중
2. 공개 API 하위 호환성 정책 수립 + API 문서화 완료
```

### 3.3 CLAUDE.md 변경

```markdown
# Before
**현재 상태:** v2.5 — Sprint 31 완료 (111 endpoints, 45 services, 583 API tests + ~61 E2E)

# After
**현재 상태:** Sprint 31 완료 (111 endpoints, 45 services, 583 API tests + ~61 E2E)
**패키지 버전:** cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0
```

Phase 4 섹션:

```markdown
# Before
- **Phase 4:** ✅ Conditional Go (Sprint 26~31) — v2.5

# After
- **Phase 4:** ✅ Conditional Go (Sprint 26~31)
```

### 3.4 MEMORY.md 변경

```markdown
# Before
- **Version**: 2.5 (Sprint 31 완료)

# After
- **Sprint**: 31 (Phase 4 Conditional Go)
- **Packages**: cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0
```

### 3.5 CHANGELOG.md — Sprint 32부터 새 형식

기존 CHANGELOG 내용은 그대로 유지. Sprint 32 이후부터 패키지별 변경 내역 구조 적용:

```markdown
## Sprint 32 (YYYY-MM-DD)

> 버전 정책 전환 (F134): 이후 패키지별 Independent SemVer 적용

### packages/api (0.1.0, 변경 없음)
### packages/web (0.1.0, 변경 없음)
### packages/cli (0.5.0, 변경 없음)
### packages/shared (0.1.0, 변경 없음)
```

---

## 4. 구현 순서

### Step 1: package.json 버전 리셋 (4개 파일)

```bash
# 각 패키지 version 필드 변경
packages/cli/package.json     → "0.5.0"
packages/api/package.json     → "0.1.0"
packages/web/package.json     → "0.1.0"
packages/shared/package.json  → "0.1.0"
```

검증: `pnpm install` → lock file 변경 없음 확인 (version 변경은 lock에 영향 없음)

### Step 2: SPEC.md 갱신 (5개 섹션)

1. frontmatter `system-version` → `Sprint 31`
2. §1 Version → Sprint + Package Versions
3. §3 마일스톤 전환선 추가
4. §5 F134 마일스톤 버전 갱신
5. §10 버전 정책 섹션 신규 추가

### Step 3: CLAUDE.md 갱신 (2개 섹션)

1. 현재 상태 → Sprint 형식
2. Phase 4 섹션 → v2.5 제거

### Step 4: MEMORY.md 갱신 (2개 항목)

1. 프로젝트 상태 → Sprint 형식 + 패키지 버전
2. 주요 지표 → 패키지 버전 반영

### Step 5: INDEX.md 갱신

1. FX-DSGN-134 추가

### Step 6: 검증

- [ ] `pnpm install` 정상 완료
- [ ] `turbo build` 정상 완료
- [ ] SPEC.md 내 "system-version" 문자열이 Sprint 형식인지 확인
- [ ] package.json 4개 파일 버전 확인
- [ ] CLAUDE.md에 v2.5 형식 잔존 없는지 확인

---

## 5. 변경하지 않는 항목

| 항목 | 이유 |
|------|------|
| Git tags (v0.1.0 ~ v0.5.0) | npm 배포 이력, 소급 수정 불가 |
| 기존 커밋 메시지의 버전 참조 | Git 이력은 불변 |
| docs/archive/ 내 아카이브 문서 | 작성 시점의 이력, 수정 불필요 |
| SPEC.md §3 기존 마일스톤 행 (v0.1~v2.5) | 이력 보존 원칙 |
| SPEC.md §9 변경이력 기존 행 | 당시 system-version 기록 |
| wrangler.toml | 배포 설정에 버전 참조 없음 |
| CI/CD (GitHub Actions) | 버전 기반 배포 아님 |

---

## 6. 검증 계획

### 6.1 자동 검증

| # | 검증 항목 | 명령어 | 기대 결과 |
|---|----------|--------|----------|
| 1 | 빌드 정상 | `turbo build` | 에러 0 |
| 2 | 테스트 통과 | `turbo test` | 기존 테스트 전부 통과 |
| 3 | 타입체크 | `turbo typecheck` | 에러 0 |
| 4 | 린트 | `turbo lint` | 에러 0 |

### 6.2 수동 검증

| # | 검증 항목 | 방법 |
|---|----------|------|
| 1 | SPEC.md 일관성 | §1, §3, §5, §10에서 Sprint 형식 사용 확인 |
| 2 | v2.5 잔존 여부 | `grep -r "v2\.5" SPEC.md CLAUDE.md` → 마일스톤 이력에만 존재 |
| 3 | package.json 정합성 | 4개 패키지 version 필드 확인 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-22 | 초안 — Plan 기반 상세 설계 | Sinclair Seo |
