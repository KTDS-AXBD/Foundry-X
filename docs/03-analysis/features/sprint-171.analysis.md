# Sprint 171 Gap Analysis — F378 + F379

> **문서코드:** FX-ANLS-S171
> **버전:** 1.0
> **작성일:** 2026-04-07

## 결과 요약

| 항목 | 값 |
|------|-----|
| Match Rate | 95% |
| 검증 항목 | 14/14 PASS |
| 차이점 | 5건 (Minor) + 1건 (Medium) |
| 판정 | PASS (>=90%) |

## 검증 항목별 결과

| # | 항목 | F-item | 결과 |
|---|------|--------|------|
| 1 | executive 톤 변환 | F378 | PASS |
| 2 | technical 톤 변환 | F378 | PASS |
| 3 | critical 톤 변환 | F378 | PASS |
| 4 | adapt API 동작 | F378 | PASS |
| 5 | preview API 동작 | F378 | PASS |
| 6 | ToneSelector UI | F378 | PASS |
| 7 | discovery.completed 이벤트 발행 | F379 | PASS |
| 8 | 자동 Offering 생성 | F379 | PASS |
| 9 | 섹션 프리필 | F379 | PASS |
| 10 | 중복 방지 | F379 | PASS |
| 11 | 수동 트리거 | F379 | PASS |
| 12 | 파이프라인 상태 | F379 | PASS |
| 13 | typecheck 통과 | Both | PASS |
| 14 | 테스트 통과 | Both | PASS |

## 차이점 (의도적 개선)

| 항목 | Design | 구현 | 심각도 |
|------|--------|------|--------|
| UI 경로 | `components/offerings/` | `components/feature/offering-editor/` | Low |
| Pipeline API 경로 | `/pipeline/trigger` | `/pipeline/shape/trigger` | Low |
| TonePreview | 별도 파일 | ToneSelector 내부 통합 | Low |
| adapt 응답 | `sourceItemId` | `sectionCount` | Low |
| Pipeline history API | 설계됨 | 미구현 (사용처 없음) | Medium |
