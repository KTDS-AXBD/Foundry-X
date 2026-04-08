---
title: Phase 26 BD Portfolio Management 완료 보고서
version: 1.0
status: completed
phase: Phase 26
f_items: F451~F460
sprints: 219~224
match_rate: 95%
created: 2026-04-08
---

# Phase 26: BD Portfolio Management — 완료 보고서

## 1. 개요

| 항목 | 값 |
|------|-----|
| Phase | 26 — BD Portfolio Management |
| F-items | F451~F460 (10건, 4개 서브페이즈) |
| Sprint | 219~224 |
| 기간 | 2026-04-08 (단일 세션) |
| Match Rate | 95% (iterate 후) |
| PRD 생성 | 12건 (4 아이템 × v1/v2/final) |
| Prototype | 3건 (KOAMI v1, Deny v1+v2) |

## 2. 서브페이즈별 성과

### Phase 26-A: 사업 아이템 일괄 등록 + 문서 연결 (F451~F453) ✅

| 작업 | 수량 | 상세 |
|------|------|------|
| Clean Sheet | 6→0 | 기존 biz_items 6건 + 관련 ~20 테이블 cascade 삭제 |
| biz_items 등록 | 4건 | KOAMI, XR Exhibition Studio, IRIS, Deny Semiconductor |
| business_plan_drafts | 4건 | HTML→D1 (XR/IRIS) + R2 참조 (KOAMI/Deny) |
| offerings | 4건 | KOAMI pitch + XR report + IRIS 2건 (고객오퍼링+프레젠테이션) |
| uploaded_files | 9건 | HTML/MD → R2 업로드 + D1 메타 등록 |
| prototypes | 1건 | Deny PoC v1 (기존 산출물 역분해) |
| pipeline_stages | 4건 | REGISTERED 초기 상태 |

### Phase 26-B: PRD 생성 파이프라인 (F454~F456) ✅

3단계 PRD 파이프라인: 사업기획서 HTML → 1차 PRD(자동) → 2차 PRD(AI 보강) → 최종 PRD(PDCA 정렬)

| 아이템 | v1 (1차) | v2 (2차) | Final (최종) | 핵심 내용 |
|--------|----------|----------|-------------|-----------|
| KOAMI | 16KB | 34KB | 34KB | Ontology 인과예측, TAM 5,000억+ |
| XR Studio | 19KB | 32KB | 51KB | AI 도슨트 VR 전시, JV 60:40 |
| IRIS | 15KB | 40KB | 45KB | 내부보안 AI, 3년차 BEP |
| Deny Semi | 16KB | 43KB | 52KB | 반도체 3-Panel SOC |

- 12건 모두 D1 `biz_generated_prds` (version 1/2/3) 등록
- 4건 병렬 에이전트 생성 × 3라운드 = 12건 PRD

### Phase 26-C: Prototype 생성 + 연결 (F457~F458) ✅

| Prototype | 파일 | 핵심 화면 |
|-----------|------|-----------|
| KOAMI v1 | prototype-koami.html | 대시보드 + Ontology 그래프 + 충격분석 + What-if + EWS + 취약품목 (6화면) |
| Deny v2 | prototype-deny-semi-v2.html | 3-Panel SOC: 모니터링 + 가설분석 + 플레이북 |

- R2 업로드 + D1 `prototypes` 테이블 등록
- Deny는 v1(원본 PoC) + v2(PRD 기반 신규) 2버전

### Phase 26-D: E2E 검색/편집 인프라 (F459~F460) ✅

**Sprint 223** (초기 구현):
- `PortfolioService` — 8테이블 병렬 조회 (Promise.all)
- `GET /biz-items/:id/portfolio` — Portfolio Graph API
- `PortfolioView` + `PortfolioGraph` + `PipelineProgressBar` 컴포넌트
- 테스트 15건 (service 6 + route 4 + web 5)
- Match Rate: 53%

**Sprint 224** (Gap 보강):
- Portfolio List API (`GET /biz-items/portfolio-list`) + coverage
- Reverse Lookup API (`GET /biz-items/by-artifact`)
- `ArtifactPreview` 컴포넌트 (PRD/사업기획서/Offering 요약)
- PortfolioGraph 편집 링크 추가
- Match Rate: 53% → **95%**

## 3. D1 데이터 현황 (최종)

| 테이블 | 건수 | 설명 |
|--------|------|------|
| biz_items | 4 | KOAMI, XR, IRIS, Deny |
| business_plan_drafts | 4 | 사업기획서 HTML (D1/R2) |
| offerings | 4 | Offering/Pitch 문서 |
| uploaded_files | 9 | R2 파일 참조 |
| biz_generated_prds | 12 | v1+v2+final × 4 |
| prototypes | 3 | KOAMI v1, Deny v1+v2 |
| pipeline_stages | 4 | REGISTERED |

## 4. 연결 구조 달성

```
사업아이템(4건)
  ├── 사업기획서(4건) — business_plan_drafts
  ├── Offering(4건) — offerings
  ├── 참고자료(9건) — uploaded_files (R2)
  ├── PRD 3단계(12건) — biz_generated_prds (v1/v2/final)
  ├── Prototype(3건) — prototypes
  └── 파이프라인(4건) — pipeline_stages (REGISTERED)
  
전체 연결 조회: GET /biz-items/:id/portfolio
포트폴리오 목록: GET /biz-items/portfolio-list
역조회: GET /biz-items/by-artifact
```

## 5. 기술적 특이사항

1. **D1 SQL 크기 제한**: 100KB 이상 HTML은 R2에 업로드 후 D1에 `[R2:key]` 참조 저장
2. **FK CASCADE 부재**: pipeline_stages 등 일부 테이블은 CASCADE 없어 수동 삭제 순서 필요
3. **병렬 에이전트**: PRD 12건 + Prototype 2건 = 14건 에이전트 병렬 실행 (총 ~100분)
4. **PDCA iterate**: Sprint 223 Match 53% → Sprint 224 보강 → Match 95% (1회 iteration)

## 6. Phase 26 F-item 전체 상태

| F-item | 내용 | Sprint | 상태 | Match |
|--------|------|--------|------|-------|
| F451 | Clean Sheet + 아이템 등록 | 219 | ✅ | - |
| F452 | 사업기획서/Offering 연결 | 219 | ✅ | - |
| F453 | Prototype 역등록 | 219 | ✅ | - |
| F454 | 1차 PRD 자동 생성 | 219 | ✅ | - |
| F455 | 2차 PRD 보강 | 219 | ✅ | - |
| F456 | 최종 PRD 확정 | 219 | ✅ | - |
| F457 | Prototype Builder | 219 | ✅ | - |
| F458 | Prototype 등록 | 219 | ✅ | - |
| F459 | 포트폴리오 검색 API | 223→224 | ✅ | 95% |
| F460 | 포트폴리오 대시보드 | 223→224 | ✅ | 95% |

**Phase 26 전체: 10/10 F-items 완료, Average Match 95%**
