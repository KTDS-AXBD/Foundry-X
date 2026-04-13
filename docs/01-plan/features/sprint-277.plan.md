---
id: FX-PLAN-277
title: Sprint 277 Plan — F522 shared 슬리밍 + F523 D1 스키마 격리
sprint: 277
f_items: [F522, F523]
req: FX-REQ-550, FX-REQ-551
priority: P0
status: draft
created: 2026-04-13
---

# Sprint 277 Plan — F522 shared 슬리밍 + F523 D1 스키마 격리

## 1. 목표

MSA Walking Skeleton Phase 2 — shared 패키지에서 도메인 전용 타입을 각 Worker 내부로 이동하고, D1 접근 규약을 문서화하여 도메인 경계를 강화한다.

## 2. 배경

- F520(Sprint 268): API Gateway Worker ✅ — Service Binding 라우팅 준비 완료
- F521(Sprint 268): Discovery 도메인 분리 ✅ — fx-discovery Worker 스텁 생성
- **현재 상태**: fx-gateway/fx-discovery 모두 Walking Skeleton 수준(Health check만). shared를 import하지 않고, deploy.yml 미포함, 실제 라우트 이관 없음
- **이번 Sprint**: shared 슬리밍 + D1 규약으로 "도메인 경계 명확화" 완성

### 현황 수치

| 항목 | 현재값 |
|------|--------|
| shared 파일 수 | 24개, 4,110줄 |
| Discovery 전용 타입 | 3파일 393줄 (discovery-report.ts, discovery-v2.ts, methodology.ts) |
| Shaping 전용 타입 | 2파일 98줄 (prototype.ts, prototype-feedback.ts) |
| D1 Discovery 테이블 | ~10개 (biz_items 기준 FK 트리) |
| fx-discovery 라우트 | 1개 (health check 스텁) |

## 3. 핵심 요구사항

### F522: shared 타입 슬리밍 (FX-REQ-550)

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| T1 | Discovery 전용 타입(3파일 393줄)을 `packages/fx-discovery/src/types/`로 이동 | P0 |
| T2 | Shaping 전용 타입(2파일 98줄)을 향후 fx-shaping 후보로 분리 준비 (shared 내부 서브폴더) | P1 |
| T3 | shared/index.ts에서 이동된 타입의 re-export 유지 (하위 호환) | P0 |
| T4 | api/web 패키지의 import 경로를 직접 import로 전환 (re-export 의존 제거) | P1 |
| T5 | ESLint 룰 또는 문서로 "shared에 도메인 전용 타입 추가 금지" 규약 명시 | P1 |

### F523: D1 스키마 격리 (FX-REQ-551)

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| D1 | Option B(공유 DB) 유지 결정을 wrangler.toml + Design 문서에 명시 | P0 |
| D2 | Discovery 도메인 테이블 목록 확정 + `docs/02-design/` 접근 규약 문서 | P0 |
| D3 | fx-discovery에 실제 Discovery 라우트 1~2개 이관 (health + `/api/discovery/items` GET) | P0 |
| D4 | fx-gateway에서 DISCOVERY Service Binding 활성화 + 라우팅 연결 | P0 |
| D5 | deploy.yml에 fx-gateway/fx-discovery 배포 job 추가 | P1 |

## 4. 스코프 경계

### In Scope

- shared → fx-discovery 타입 이동 (3파일)
- shared 내부 Shaping 서브폴더 정리
- api/web import 경로 전환
- fx-discovery 실제 라우트 1~2개 이관 (조회만, 쓰기는 제외)
- fx-gateway DISCOVERY binding 활성화
- deploy.yml fx-gateway + fx-discovery job 추가
- D1 접근 규약 문서 (어떤 Worker가 어떤 테이블에 접근하는지)

### Out of Scope

- D1 별도 DB 생성 (Option A) — 팀 확장 시점에 전환
- Discovery 전체 12 routes 이관 — 이번은 1~2개 파일럿만
- fx-shaping Worker 신규 생성
- 데이터 마이그레이션
- CI/CD 분리 (도메인별 paths-filter)

## 5. 파일 매핑 (예상)

### 이동 대상 (shared → fx-discovery)

| 원본 (shared) | 대상 (fx-discovery) | 줄수 |
|---------------|---------------------|------|
| `src/discovery-report.ts` | `src/types/discovery-report.ts` | 250 |
| `src/discovery-v2.ts` | `src/types/discovery-v2.ts` | 115 |
| `src/methodology.ts` | `src/types/methodology.ts` | 28 |

### 신규 파일

| 파일 | 목적 |
|------|------|
| `packages/fx-discovery/src/routes/items.ts` | Discovery items GET 라우트 |
| `packages/fx-discovery/src/services/biz-item.service.ts` | biz_items 조회 서비스 (기존 api에서 추출) |
| `docs/02-design/features/sprint-277.design.md` | Design 문서 (D1 규약 포함) |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `packages/shared/src/index.ts` | 이동된 타입 re-export 유지 (하위 호환) |
| `packages/fx-gateway/wrangler.toml` | DISCOVERY binding 주석 해제 |
| `packages/fx-gateway/src/app.ts` | DISCOVERY_ENABLED 제거, 직접 라우팅 |
| `.github/workflows/deploy.yml` | fx-gateway + fx-discovery deploy job |

## 6. 리스크

| # | 리스크 | 심각도 | 완화 |
|---|--------|--------|------|
| R1 | shared re-export 제거 시 하위 호환 깨짐 | HIGH | T3: re-export 유지, T4는 점진적 전환 |
| R2 | fx-discovery 실제 배포 시 D1 접근 문제 | MEDIUM | Option B(공유 DB)이므로 바인딩만 확인 |
| R3 | Service Binding latency | LOW | Health check + 1 GET만 이관, 벤치마크 |
| R4 | deploy.yml 복잡도 증가 | LOW | paths-filter로 변경 패키지만 배포 |

## 7. TDD 전략

| 대상 | Red Phase | Green Phase |
|------|-----------|-------------|
| fx-discovery items GET | 응답 스키마 + 빈 DB 케이스 | biz-item.service 구현 |
| fx-gateway 라우팅 | `/api/discovery/items` → Discovery Worker 전달 | Service Binding fetch |
| shared import 호환 | 기존 api/web 테스트가 PASS 유지 확인 | re-export + import 전환 |

## 8. 성공 기준

- [ ] shared 파일 24 → 21개 이하 (3파일 이동)
- [ ] fx-discovery가 `/api/discovery/items` GET 응답 가능
- [ ] fx-gateway가 Discovery binding으로 라우팅
- [ ] deploy.yml에서 fx-gateway + fx-discovery 배포 성공
- [ ] 기존 api/web 테스트 전량 PASS (하위 호환)
- [ ] D1 접근 규약 문서 완성
