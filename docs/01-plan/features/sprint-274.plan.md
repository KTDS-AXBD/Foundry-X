---
feature: F517
req: FX-REQ-545
sprint: 274
status: plan
date: 2026-04-13
---

# Sprint 274 Plan — F517 메타데이터 트레이서빌리티

## 목표

REQ↔F-item↔Sprint↔PR↔Commit 전 체인을 D1에 저장하고, 웹에서 역추적 가능하게 만든다.

## 범위 (In-Scope)

| # | 항목 | 우선순위 |
|---|------|----------|
| 1 | D1 `spec_traceability` 테이블 — REQ/F-item/Sprint 매핑 | P0 |
| 2 | D1 `sprint_pr_links` 테이블 — Sprint↔PR↔Commit 매핑 | P0 |
| 3 | `TraceabilityService` — SPEC.md 파싱 + GitHub API 파싱 + D1 upsert | P0 |
| 4 | API `GET /api/work/trace?id=FX-REQ-545` — 체인 반환 | P0 |
| 5 | API `POST /api/work/trace/sync` — SPEC+GitHub 동기화 | P0 |
| 6 | Changelog 구조화 — REQ/F-item/PR 메타 태깅 | P0 |
| 7 | Web UI `/work-management` 추적 탭 | P1 |

## 범위 외 (Out-of-Scope)

- Work Ontology KG (F518, Sprint 275)
- 실시간 webhook sync (Phase 38 후)
- 공개 Roadmap 뷰 (F518 포함)

## 기술 접근

- SPEC.md 파싱: 기존 `parseFItems()` + REQ 코드 추출 확장
- GitHub API: `GET /repos/{owner}/{repo}/pulls` + PR body F번호 파싱 + branch명 sprint번호 파싱
- D1: INSERT OR REPLACE (upsert) 패턴
- API: Hono OpenAPI, Zod 스키마 필수

## 의존성

- `packages/api/src/services/work.service.ts` — parseSpecItems, fetchGithubData 재사용
- Migration 번호: 0129 (spec_traceability), 0130 (sprint_pr_links)
- Env: `GITHUB_TOKEN`, `GITHUB_REPO` (기존)

## 검증 계획 (TDD Red Targets)

1. `parseFItemLinks()` — SPEC.md fixture에서 REQ/F-item/Sprint 링크 배열 반환
2. `parsePrLinks()` — PR 목록 fixture에서 F번호/Sprint번호 파싱 정확도
3. `GET /api/work/trace` — 특정 REQ ID로 체인 조회, 404 처리
4. `POST /api/work/trace/sync` — D1 upsert 성공 200 반환
