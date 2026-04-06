# Sprint 171 Plan — Integration: 콘텐츠 어댑터 + discover→shape 파이프라인

> **문서코드:** FX-PLAN-S171
> **버전:** 1.0
> **작성일:** 2026-04-07
> **Phase:** 18-D (Offering Pipeline — Integration)
> **Sprint:** 171
> **F-items:** F378, F379

---

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F378 콘텐츠 어댑터 + F379 discover→shape 파이프라인 |
| 목표 | 발굴 산출물의 목적별 톤 변환 자동화 + 발굴→형상화 자동 전환 파이프라인 구축 |
| 기간 | Sprint 171 (1 Sprint) |
| 의존성 | F370 (Offerings CRUD) ✅, F334 (EventBus) ✅ |
| 리스크 | R2 (톤 변환 품질) — O-G-D Loop로 게이팅 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 산출물에서 사업기획서로의 변환이 수작업, 발굴→형상화 단계 전환이 수동 |
| Solution | 3가지 톤 어댑터(executive/technical/critical) + EventBus 기반 자동 전환 파이프라인 |
| Function UX Effect | 발굴 완료 시 Offering 자동 생성 + 톤 선택 UI로 1-click 콘텐츠 변환 |
| Core Value | 형상화 단계 자동화율 0%→80% 향상, 사업기획서 작성 시간 5분 이내 |

---

## 2. F-item 상세

### F378 — 콘텐츠 어댑터

| 항목 | 내용 |
|------|------|
| REQ | FX-REQ-370 |
| 우선순위 | P0 |
| 설명 | DiscoveryPackage에서 목적별 톤 자동 변환 (executive/technical/critical) + UI 전환 지원 |

**구현 범위:**
1. `content-adapter-service.ts` — 3가지 톤 변환 로직 (DiscoveryPackage → 섹션 콘텐츠)
2. `content-adapter.schema.ts` — Zod 스키마 (톤 유형, 변환 요청/응답)
3. `content-adapter.ts` (routes) — POST /offerings/:id/adapt (톤 변환 API)
4. Web UI — 톤 선택 드롭다운 + 변환 결과 프리뷰
5. 테스트 — 어댑터 서비스 단위 테스트 + API 통합 테스트

**톤 정의:**
- `executive`: 경영진 보고용 — 핵심 수치/ROI/전략적 판단 강조, 간결한 문체
- `technical`: 기술 제안용 — 아키텍처/구현 상세/기술 스택 강조, 상세한 문체
- `critical`: 검토/심사용 — 리스크/대안/한계 강조, 객관적/비판적 문체

### F379 — discover → shape 자동 전환 파이프라인

| 항목 | 내용 |
|------|------|
| REQ | FX-REQ-371 |
| 우선순위 | P0 |
| 설명 | EventBus(F334) 활용, 발굴 완료 시 DiscoveryPackage → Offering 프리필 자동화 |

**구현 범위:**
1. `discovery-shape-pipeline-service.ts` — 파이프라인 핸들러 (발굴 완료 감지 → Offering 생성)
2. EventBus 이벤트 타입 확장 — `discovery.completed` 이벤트 정의
3. `pipeline.ts` (routes) — GET /pipeline/status, POST /pipeline/trigger (수동 트리거)
4. DiscoveryPackage → Offering 매핑 로직 (섹션 프리필)
5. 테스트 — 파이프라인 E2E 흐름 테스트

**파이프라인 흐름:**
```
발굴 완료 (teamDecision='Go')
  → EventBus emit('discovery.completed', { itemId, orgId })
  → Pipeline Handler 수신
  → Offering 자동 생성 (purpose='report', format='html', status='draft')
  → 21개 표준 섹션 초기화
  → DiscoveryPackage 데이터로 섹션 프리필
  → 콘텐츠 어댑터(F378)로 기본 톤(executive) 적용
```

---

## 3. 기술 설계 방향

### 3-1. 기존 인프라 활용

| 기존 자산 | 활용 방식 |
|----------|----------|
| EventBus (F334) | discover→shape 이벤트 발행/소비 |
| DomainAdapterInterface | 콘텐츠 어댑터 구현 패턴 |
| Offering CRUD (F370) | Offering 자동 생성 |
| Offering Sections (F371) | 섹션 프리필 |
| Discovery Report | DiscoveryPackage 데이터 소스 |

### 3-2. 신규 파일 목록

**API (packages/api/src/):**
| 파일 | 유형 | F-item |
|------|------|--------|
| `services/content-adapter-service.ts` | 서비스 | F378 |
| `services/discovery-shape-pipeline-service.ts` | 서비스 | F379 |
| `routes/content-adapter.ts` | 라우트 | F378 |
| `routes/pipeline.ts` | 라우트 | F379 |
| `schemas/content-adapter.schema.ts` | 스키마 | F378 |
| `schemas/pipeline.schema.ts` | 스키마 | F379 |

**Web (packages/web/src/):**
| 파일 | 유형 | F-item |
|------|------|--------|
| `components/offerings/ToneSelector.tsx` | 컴포넌트 | F378 |
| `components/offerings/TonePreview.tsx` | 컴포넌트 | F378 |
| `components/pipeline/PipelineStatus.tsx` | 컴포넌트 | F379 |

**Shared (packages/shared/src/):**
| 파일 | 유형 | F-item |
|------|------|--------|
| `offering-adapter.ts` (기존 확장) | 타입 | F378 |

**Tests:**
| 파일 | 유형 | F-item |
|------|------|--------|
| `packages/api/src/__tests__/content-adapter.test.ts` | 단위 | F378 |
| `packages/api/src/__tests__/discovery-shape-pipeline.test.ts` | 단위 | F379 |
| `packages/api/src/__tests__/content-adapter-route.test.ts` | 통합 | F378 |
| `packages/api/src/__tests__/pipeline-route.test.ts` | 통합 | F379 |

### 3-3. 수정 파일 목록

| 파일 | 변경 | F-item |
|------|------|--------|
| `packages/api/src/index.ts` | 라우트 등록 | F378, F379 |
| `packages/shared/src/types.ts` | EventBus 이벤트 타입 확장 | F379 |
| `packages/api/src/services/event-bus.ts` | 이벤트 타입 추가 (필요시) | F379 |

---

## 4. 테스트 전략

| 테스트 | 범위 | 수량 |
|--------|------|------|
| 서비스 단위 | 톤 변환 3가지 + 파이프라인 핸들러 | ~12 |
| API 통합 | POST /adapt + GET /pipeline/status | ~8 |
| EventBus 통합 | 이벤트 발행→소비 흐름 | ~4 |
| 합계 | | ~24 |

---

## 5. 완료 기준

- [ ] F378: 3가지 톤(executive/technical/critical) 변환 API 동작
- [ ] F378: 톤 선택 UI + 변환 결과 프리뷰
- [ ] F379: EventBus 이벤트 발행/소비 연동
- [ ] F379: 발굴 완료 시 Offering 자동 생성 + 섹션 프리필
- [ ] F379: 파이프라인 상태 API + 수동 트리거
- [ ] typecheck 통과
- [ ] 테스트 전체 통과
- [ ] Gap Analysis ≥ 90%
