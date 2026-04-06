# Sprint 176 Plan — M1: 5차원 스코어링 엔진

> **Sprint**: 176
> **F-items**: F386, F387
> **Phase**: 19 (Builder Evolution)
> **선행**: F384 CLI PoC ✅, F385 5차원 재현성 PoC ✅ (Sprint 175)
> **PRD**: `docs/specs/fx-builder-evolution/prd-final.md`
> **Design**: `docs/02-design/features/fx-builder-evolution.design.md` §6 Sprint 176

---

## 1. 목표

M0 PoC(Sprint 175)에서 검증한 5차원 스코어러를 **본구현**으로 전환하고, 점수 데이터를 **D1에 저장**하여 API로 조회할 수 있게 한다.

| F-item | 제목 | 핵심 산출물 |
|--------|------|------------|
| F386 | 5차원 품질 스코어러 구현 | `scorer.ts` prdScore LLM 통합 + 테스트 보강 |
| F387 | 베이스라인 측정 + D1 저장 | D1 migration + API service/route + Zod schema |

---

## 2. 변경 범위

### F386: 스코어러 본구현

| 파일 | 변경 내용 |
|------|----------|
| `prototype-builder/src/scorer.ts` | `prdScoreWithLlm()` 실제 Claude Sonnet API 구현 |
| `prototype-builder/src/__tests__/scorer.test.ts` | LLM 모드 테스트 + 통합 테스트 보강 |

### F387: D1 + API

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/db/migrations/0110_prototype_quality.sql` | D1 테이블 생성 |
| `packages/api/src/services/prototype-quality-service.ts` | CRUD + 통계 조회 서비스 |
| `packages/api/src/schemas/prototype-quality-schema.ts` | Zod 스키마 |
| `packages/api/src/routes/builder.ts` | quality 엔드포인트 추가 |
| `packages/api/src/__tests__/prototype-quality.test.ts` | API 테스트 |

---

## 3. 리스크

| Risk | Mitigation |
|------|-----------|
| prdScore LLM 재현성 | temperature 0 + JSON 구조화 응답 |
| D1 migration 번호 충돌 | 0109 다음 0110 사용 (확인 완료) |

---

## 4. 완료 기준

- [ ] scorer.ts prdScoreWithLlm() 실제 구현
- [ ] D1 migration 작성
- [ ] API service + route + schema 작성
- [ ] 전체 테스트 통과
- [ ] Gap Analysis >= 90%
