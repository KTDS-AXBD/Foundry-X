# Foundry-X 개발 착수 패키지

**프로젝트:** Foundry-X 파운드리엑스
**태그라인:** 동료와 에이전트가 함께 만드는 곳
**상태:** 착수 준비 완료 (충분도 84/100)
**날짜:** 2026-03-16

---

## 패키지 구성

### 핵심 문서 (이것부터 읽으세요)

| 파일 | 내용 |
|------|------|
| `Foundry-X_Integrated_Plan.docx` | **통합 개발계획서** — 이 문서 하나로 전체 파악 가능 |
| `Foundry-X/prd-v3.md` | **PRD 최종본** (정본) — 전체 상세 스펙 |

### 보충 스펙

| 파일 | 내용 |
|------|------|
| `Foundry-X/docs/02-design/features/tech-stack-review.md` | 기술 스택 검토서 (TS+Python, 모노리포, Git SSOT) |
| `Foundry-X/dev-transparency-spec.md` | 투명성 스펙 (GitHub Projects + Wiki + Discussions + BluePrint + WBS) |

### 진화 이력

| 파일 | 내용 |
|------|------|
| `Foundry-X/interview-log.md` | 5파트 인터뷰 원문 기록 |
| `Foundry-X/prd-v1.md` | 인터뷰 기반 초안 |
| `Foundry-X/prd-v2.md` | 기술 스택 확정본 |

### 다중 AI 검토 기록

| 폴더 | 내용 |
|------|------|
| `Foundry-X/review/round-1/` | Round 1: 프롬프트 4개 + 피드백 4개 + 종합 분석 (63/100) |
| `Foundry-X/review/round-2/` | Round 2: 프롬프트 4개 + 피드백 4개 + 종합 분석 (84/100 ✅) |

---

## 다음 단계

### 착수 전 (Day 1 전)
1. ADR-000: 기존 AI Foundry 문서 대체 선언
2. Git provider 확정 (GitHub 또는 GitLab)

### Sprint 1 (Week 1~2)
- .plumb 내부 계약 문서화
- subprocess 오류 처리 계약
- 메타데이터 저장 방식 결정
- 핵심 모듈 패키지 분리
- TS+Python 빌드 검증
- Triangle Health Score 설계
