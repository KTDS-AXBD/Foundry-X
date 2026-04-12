---
code: FX-PLAN-S104
title: "Sprint 104 — F275 스킬 레지스트리"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-267]]"
---

# Sprint 104: F275 스킬 레지스트리

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F275: Track D 스킬 레지스트리 — 메타데이터 확장 + 시맨틱 검색 + 버전 추적 + 안전성 검사 |
| Sprint | 104 |
| 우선순위 | P0 |
| 의존성 | F274 선행 (Sprint 103 ✅, D1 0080 skill_metrics 4테이블) |
| Design | docs/02-design/features/sprint-104.design.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | ax-marketplace 스킬이 파일시스템 기반으로만 존재하여, 성능/비용 메타데이터 조회와 중앙 관리가 불가능 |
| Solution | D1 skill_registry 테이블 + CRUD API + 시맨틱 검색(TF-IDF) + 안전성 검사 + F274 메트릭 연동 |
| Function UX Effect | 스킬 검색/등록/버전 비교/안전성 확인이 API를 통해 가능 |
| Core Value | 스킬 생애주기 관리 기반 확보 → F276 DERIVED 엔진, F277 CAPTURED 엔진의 전제 조건 |

## 구현 범위

### 1. D1 마이그레이션 (0081_skill_registry.sql)

스킬 레지스트리 메인 테이블 + 시맨틱 검색용 인덱스 테이블:

| 테이블 | 용도 |
|--------|------|
| `skill_registry` | 스킬 메타데이터 (이름, 설명, 카테고리, 태그, 상태, 안전성 등급) |
| `skill_search_index` | TF-IDF 기반 시맨틱 검색 인덱스 (토큰 + weight) |

### 2. API 엔드포인트 (skill-registry route)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/skills/registry` | 스킬 등록 |
| GET | `/api/skills/registry` | 스킬 목록 조회 (필터: category, status, safety_grade) |
| GET | `/api/skills/registry/:skillId` | 스킬 상세 (F274 메트릭 연동) |
| PUT | `/api/skills/registry/:skillId` | 스킬 수정 |
| DELETE | `/api/skills/registry/:skillId` | 스킬 삭제 (soft delete) |
| GET | `/api/skills/search` | 시맨틱 검색 (키워드 → TF-IDF 매칭) |
| POST | `/api/skills/registry/:skillId/safety-check` | 안전성 검사 실행 |
| GET | `/api/skills/registry/:skillId/enriched` | 스킬 + 메트릭 + 버전 + 리니지 통합 조회 |

### 3. 서비스 (skill-registry.ts)

| 서비스 | 메서드 |
|--------|--------|
| `SkillRegistryService` | register, list, getById, update, softDelete, search, runSafetyCheck, getEnriched |
| `SkillSearchService` | buildIndex, search (TF-IDF), updateIndex |

### 4. Shared 타입 확장

- `SkillRegistryEntry` — 레지스트리 엔트리 인터페이스
- `SkillSafetyGrade` — 안전성 등급 (A/B/C/D/F)
- `SkillSearchResult` — 검색 결과
- `SkillEnrichedView` — 통합 조회 결과 (registry + metrics + versions + lineage)
- `SafetyCheckResult` — 안전성 검사 결과

### 5. 안전성 검사 규칙

| # | 규칙 | 감점 |
|---|------|------|
| 1 | 프롬프트 인젝션 패턴 탐지 (system/user 경계 위반) | -20 |
| 2 | 외부 URL/API 호출 참조 | -15 |
| 3 | 파일시스템 접근 패턴 | -15 |
| 4 | 환경변수/시크릿 참조 | -20 |
| 5 | 코드 실행 패턴 (eval, exec) | -20 |
| 6 | 무한 루프/재귀 위험 패턴 | -10 |

- 100점 시작 → 감점 합산 → A(90+), B(70+), C(50+), D(30+), F(<30)

### 6. 테스트

- 스킬 등록/조회/수정/삭제 CRUD 테스트
- 시맨틱 검색 정확도 테스트
- 안전성 검사 규칙별 테스트
- F274 메트릭 연동 통합 테스트
- 목표: **20+ 테스트**

## 사전 조건

- [x] F274 Sprint 103 완료 (D1 0080 skill_metrics 4테이블)
- [x] sprint/104 브랜치 생성

## 성공 기준

- [ ] D1 마이그레이션 0081 적용
- [ ] 8개 API 엔드포인트 동작
- [ ] 시맨틱 검색 키워드 → 관련 스킬 반환
- [ ] 안전성 검사 6개 규칙 적용
- [ ] 20+ 테스트 전체 통과
- [ ] Match Rate >= 90%
