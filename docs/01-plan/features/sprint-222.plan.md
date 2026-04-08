---
code: FX-PLAN-S222
title: "Sprint 222 — Prototype Builder + Offering 연동"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]]"
---

# Sprint 222: Prototype Builder + Offering 연동

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F457 (Prototype Builder 실행) + F458 (Prototype 등록 + Offering 연동) |
| Sprint | 222 |
| 우선순위 | P1 |
| 의존성 | Sprint 221 (F456 PRD 확정) 선행 완료 |
| Design | docs/02-design/features/sprint-222.design.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | PRD 확정 후 Prototype 수동 생성 + Offering 수동 연결 — 시간 소요 + 연동 누락 |
| Solution | LLM 기반 Prototype 자동 생성 (2건) + offering_prototypes 자동 연결 |
| Function UX Effect | PRD → Prototype → Offering 파이프라인 완성, UI에서 즉시 확인 |
| Core Value | BD 라이프사이클 자동화 — 형상화 산출물이 포트폴리오에 바로 반영 |

---

## 작업 목록

### F457: Prototype Builder 실행

| # | 작업 | 설명 | 산출물 |
|---|------|------|--------|
| 1 | PRD 입력 파싱 | F456 확정 PRD(v3)에서 title, 핵심 기능, 기술 스택 추출 | prd-parser 유틸 |
| 2 | Deny v2 Prototype 생성 | 기존 bi-deny-semi-001 (v1) 기반 개선 — PRD v3 반영, UI/UX 고도화 | prototypes 테이블 v2 row |
| 3 | 추가 아이템 Prototype 생성 | KOAMI or XR 대상 1건 신규 Prototype 자동 생성 | prototypes 테이블 신규 row |
| 4 | prototype_jobs 큐 등록 | 2건 모두 prototype_jobs 테이블에 job 생성 → status flow 추적 | queued → building → live |
| 5 | R2 업로드 | 생성된 HTML/React 코드를 R2 버킷에 저장 | R2 object key |
| 6 | prototypes 테이블 등록 | content(R2 URL), format, model_used, tokens_used 기록 | prototype row |

### F458: Prototype 등록 + Offering 연동

| # | 작업 | 설명 | 산출물 |
|---|------|------|--------|
| 7 | offering_prototypes 연결 | 생성된 Prototype을 해당 Offering에 자동 연결 | offering_prototypes row |
| 8 | Prototype 목록 UI 갱신 | /shaping/prototype 페이지에서 신규 2건 표시 | UI 확인 |
| 9 | biz item 이름 표시 | Prototype 상세에서 원본 biz_items.title JOIN 표시 (S229 gap H4 해소) | API 응답 + UI |
| 10 | 리뷰 진행률 분모 수정 | ReviewSummaryBar의 total 계산 로직 수정 (S229 gap M5 해소) | 컴포넌트 수정 |
| 11 | Prototype 상세 Offering 링크 | Prototype 상세에서 연결된 Offering으로 이동 링크 추가 | UI 링크 |

---

## 사전 조건

- [x] Sprint 221 (F456 PRD 확정) merge 완료
- [ ] ANTHROPIC_API_KEY 또는 OPENROUTER_API_KEY Workers secret 설정 확인
- [ ] R2 버킷 접근 권한 확인

## 성공 기준 (MVP)

- [ ] Deny v2 Prototype 생성 완료 (prototypes 테이블 v2 row 존재)
- [ ] 추가 1건 Prototype 생성 완료 (신규 row 존재)
- [ ] prototype_jobs 2건 모두 status=live 도달
- [ ] offering_prototypes 연결 2건 존재
- [ ] /shaping/prototype UI에서 3건 (기존 v1 + 신규 v2 + 추가 1건) 표시
- [ ] Prototype 상세에서 biz item 이름 표시 (gap H4 해소)
- [ ] ReviewSummaryBar 진행률 정확 (gap M5 해소)

## 성공 기준 (Stretch)

- [ ] Prototype 상세에서 Offering 링크 클릭 시 이동
- [ ] prototype_jobs 비용 추적 (cost_usd, tokens_used) 정확

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| LLM 생성 품질 불안정 | Prototype HTML이 깨질 수 있음 | fallback 모델 + retry (기존 prototype-fallback.ts 활용) |
| R2 업로드 실패 | Prototype content 손실 | content를 prototypes.content에도 저장 (듀얼 저장) |
| PRD 파싱 실패 | 입력 데이터 부족 | 최소 title + description만으로 생성 가능하도록 graceful fallback |

## 일정 (추정)

| 단계 | 시간 |
|------|------|
| F457 Prototype Builder (작업 1~6) | ~25분 |
| F458 등록 + 연동 (작업 7~11) | ~15분 |
| 통합 검증 + 테스트 | ~10분 |
| **합계** | **~50분** |
