---
code: FX-PLAN-S125
title: "Sprint 125 Plan — Skill Unification 배치 1 (F303+F304)"
version: 1.0
status: Active
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
refs:
  - "[[FX-SPEC-SKILL-UNIFY]]"
  - "[[FX-SPEC-001]] §12 Phase 12"
---

# Sprint 125 Plan — Skill Unification 배치 1

## 1. 목표

Phase 12 Skill Unification의 **배치 1** — D1(Web↔API 단절) + D2(sf-scan↔API 단절) 해소.

| F-item | 제목 | REQ | 단절 |
|--------|------|-----|:----:|
| F303 | SkillCatalog API 전환 | FX-REQ-295 | D1 |
| F304 | 벌크 레지스트리 API + sf-scan 연동 | FX-REQ-296 | D2 |

**순서**: F303 → F304 (단일 WT, 순차 구현)

---

## 2. 현재 상태 분석

### F303 관련 (Web↔API 단절)

**현재 구조 (As-Is)**:
- `packages/web/src/data/bd-skills.ts` — 정적 배열 69개 BdSkill 객체
- `packages/web/src/components/feature/ax-bd/SkillCatalog.tsx` — BD_SKILLS import, 클라이언트 필터링
- `packages/web/src/components/feature/ax-bd/ProcessGuide.tsx` — BD_SKILLS 참조
- `packages/web/src/components/feature/ax-bd/SkillCard.tsx` — BdSkill 타입 표시
- `packages/web/src/components/feature/ax-bd/SkillDetailSheet.tsx` — BdSkill 상세

**이미 구현된 API (Phase 10, F275)**:
- `GET /api/skills/registry` — 목록 (category/status/safetyGrade 필터, limit/offset 페이징)
- `GET /api/skills/search?q=` — TF-IDF 시맨틱 검색
- `GET /api/skills/registry/:skillId` — 상세
- `GET /api/skills/registry/:skillId/enriched` — 통합 조회 (registry+metrics+versions+lineage)

**문제**: Web api-client에 skill registry 호출 메서드 없음. SkillCatalog가 정적 데이터만 사용.

### F304 관련 (sf-scan↔API 단절)

**현재 구조 (As-Is)**:
- `POST /api/skills/registry` — 단건 등록만 지원 (upsert 미구현)
- skill-framework의 `sf-scan` — 파일시스템 스캔 후 JSON 출력, API 연동 없음
- 210+ 스킬이 D1 skill_registry에 미등록

**필요한 것**:
- `POST /api/skills/registry/bulk` — 벌크 upsert 엔드포인트
- `bulkRegisterSkillSchema` — Zod 스키마
- `SkillRegistryService.bulkUpsert()` — 서비스 메서드
- sf-scan JSON → API 매핑 스크립트 또는 CLI 옵션

---

## 3. 구현 계획

### Phase A: F303 — SkillCatalog API 전환

#### A-1. api-client 확장
- `packages/web/src/lib/api-client.ts`에 skill registry 메서드 추가:
  - `getSkillRegistry(params)` → `GET /api/skills/registry`
  - `searchSkills(q, opts)` → `GET /api/skills/search`
  - `getSkillDetail(skillId)` → `GET /api/skills/registry/:skillId`
  - `getSkillEnriched(skillId)` → `GET /api/skills/registry/:skillId/enriched`
- 타입: `@foundry-x/shared`의 `SkillRegistryEntry`, `SkillSearchResult`, `SkillEnrichedView` 활용

#### A-2. React Hook 생성
- `packages/web/src/hooks/useSkillRegistry.ts` — SWR/React Query 패턴
  - `useSkillList(params)` — 목록 + 페이징
  - `useSkillSearch(query)` — 검색 (디바운스 300ms)
  - `useSkillDetail(skillId)` — 상세/enriched

#### A-3. SkillCatalog 리팩토링
- `BD_SKILLS` import 제거 → `useSkillList()` hook 사용
- 검색: 클라이언트 필터 → `useSkillSearch()` API 호출로 전환
- 카테고리/단계 필터: API query param으로 서버사이드 필터링
- 로딩/에러 상태 UI 추가
- `bd-skills.ts`는 폴백용으로 유지 (API 실패 시 정적 데이터 표시)

#### A-4. ProcessGuide 업데이트
- BD_SKILLS 참조를 API 데이터로 전환 (또는 SkillCatalog와 공유 hook)

#### A-5. 테스트
- api-client 메서드 단위 테스트
- SkillCatalog 컴포넌트 테스트 (API mock)
- 기존 `skill-catalog.test.tsx` 업데이트

### Phase B: F304 — 벌크 레지스트리 API

#### B-1. API 벌크 엔드포인트
- 스키마: `bulkRegisterSkillSchema` — 배열 최대 500건, 각 항목은 기존 `registerSkillSchema` 기반
- 라우트: `POST /api/skills/registry/bulk` — 인증 필수 (admin)
- 서비스: `SkillRegistryService.bulkUpsert(tenantId, items, actorId)` — INSERT OR REPLACE 패턴

#### B-2. Upsert 로직
- `skill_id` + `tenant_id` 기준 중복 판별
- 기존 스킬: description/tags/category 업데이트 + updated_at 갱신
- 신규 스킬: 새 row INSERT + search index 빌드
- 결과: `{ created: N, updated: N, errors: [...] }`

#### B-3. sf-scan 매핑 스크립트
- `scripts/sf-scan-register.sh` — sf-scan JSON 출력을 API 벌크 등록으로 전달
- 매핑: sf-scan 필드 → registerSkillSchema 필드 변환
- 실행: `./scripts/sf-scan-register.sh [--api-url] [--token]`

#### B-4. 테스트
- bulkUpsert 서비스 단위 테스트 (upsert, 중복, 에러 케이스)
- 벌크 라우트 통합 테스트
- sf-scan JSON 매핑 테스트

---

## 4. 변경 파일 예상

### F303 (Web 중심)
| 파일 | 동작 |
|------|------|
| `packages/web/src/lib/api-client.ts` | skill registry 메서드 4개 추가 |
| `packages/web/src/hooks/useSkillRegistry.ts` | 신규 — React hook |
| `packages/web/src/components/feature/ax-bd/SkillCatalog.tsx` | 리팩토링 — API 전환 |
| `packages/web/src/components/feature/ax-bd/ProcessGuide.tsx` | BD_SKILLS → API 데이터 |
| `packages/web/src/components/feature/ax-bd/SkillCard.tsx` | 타입 변경 (BdSkill → SkillRegistryEntry) |
| `packages/web/src/components/feature/ax-bd/SkillDetailSheet.tsx` | 타입 변경 + enriched 데이터 |
| `packages/web/src/__tests__/skill-catalog.test.tsx` | 테스트 업데이트 |

### F304 (API 중심)
| 파일 | 동작 |
|------|------|
| `packages/api/src/schemas/skill-registry.ts` | `bulkRegisterSkillSchema` 추가 |
| `packages/api/src/services/skill-registry.ts` | `bulkUpsert()` 메서드 추가 |
| `packages/api/src/routes/skill-registry.ts` | `POST /bulk` 라우트 추가 |
| `scripts/sf-scan-register.sh` | 신규 — sf-scan → API 벌크 등록 |
| `packages/api/src/__tests__/skill-registry-bulk.test.ts` | 신규 — 벌크 테스트 |

---

## 5. 의존성 및 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| skill_registry에 데이터 0건 (벌크 등록 전) | F303 SkillCatalog가 빈 화면 | bd-skills.ts 폴백 + F304 완료 후 데이터 투입 |
| BdSkill ↔ SkillRegistryEntry 타입 불일치 | 카테고리/필드 매핑 불일치 | 어댑터 함수로 변환 |
| sf-scan JSON 포맷 변경 | 매핑 스크립트 실패 | 스크립트에 validation 추가 |
| D1 벌크 INSERT 성능 (210+ 건) | 타임아웃 | 50건씩 배치 처리 |

---

## 6. 성공 기준

- [ ] SkillCatalog가 `GET /api/skills/registry` 호출하여 목록 표시
- [ ] 검색이 `GET /api/skills/search` API로 동작
- [ ] `POST /api/skills/registry/bulk` 벌크 등록 성공 (210+ 건)
- [ ] sf-scan-register.sh 실행으로 D1에 스킬 데이터 투입
- [ ] 기존 테스트 + 신규 테스트 전체 통과
- [ ] typecheck + lint 통과
