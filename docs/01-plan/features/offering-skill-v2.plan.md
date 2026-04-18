# Offering Skill v2 Planning Document

> **Summary**: AX BD팀 사업기획서 생성 스킬을 표준 가이드 기반으로 고도화 — 품질 균일화 + GAN 교차검증 자동화
>
> **Project**: Foundry-X
> **Author**: AX BD팀
> **Date**: 2026-04-07
> **Status**: Draft
> **PRD**: `docs/specs/axbd-offering/prd-final.md`
> **SPEC**: Phase 22, F414~F422 (Sprint 198~202)

---

## 1. Overview

### 1.1 Purpose

기존 offering-html 스킬(v1)을 `AX BD팀 사업기획서 생성 스킬.md` 가이드 기반으로 고도화하여, 담당자별 품질 편차를 제거하고 임원 보고 시 포맷/톤 수정 사이클을 최소화한다.

### 1.2 Background

- v1 스킬: 18섹션 목차 + base.html + 17종 컴포넌트 + design-tokens 보유
- 문제: 가이드의 작성 원칙(경영 언어, KT 연계, 고객 유형별 톤)이 스킬 로직에 미반영
- 결과: 담당자별 품질 불균일 → 임원 보고 때마다 목차/포맷/톤 수정 반복 (1건당 2~3회)
- 기회: 가이드 문서가 정립되어 있으므로, 스킬에 내장하면 즉시 효과

### 1.3 Related Documents

- PRD: `docs/specs/axbd-offering/prd-final.md`
- 참고자료: `docs/specs/axbd-offering/AX BD팀 사업기획서 생성 스킬.md`
- 기존 스킬: `docs/specs/axbd/shape/offering-html/SKILL.md`
- 디자인 토큰: `docs/specs/axbd/shape/offering-html/design-tokens.md`
- 기존 예시: `docs/specs/axbd/shape/offering-html/examples/KOAMI_v0.5.html`

---

## 2. Scope

### 2.1 In Scope

- [x] F414: 표준 목차 엔진 — 가이드 §3 기준 18→20섹션 목차 + 필수/선택 자동 판단
- [x] F415: 디자인 시스템 v2 — 가이드 §5 기준 컬러/타이포/레이아웃/컴포넌트 12종
- [x] F416: 발굴 산출물 자동 매핑 — 가이드 §2 매핑 테이블 기반 2-0~2-8 연동
- [x] F417: 경영 언어 원칙 — 가이드 §6 톤/표현 규칙 스킬 로직 내장
- [x] F418: KT 연계 원칙 강제 — 추진배경 3축 필수 + KT 미연계 경고
- [x] F419: GAN 교차검증 자동화 — 가이드 §4(05-4) 표준 질문 풀 기반
- [x] F420: PPTX 변환 — offering-pptx 스킬 체이닝
- [x] F421: 버전 이력 추적 — v0.1→v1.0 변경 기록 + diff
- [x] F422: 피드백 반영 자동화 — 섹션별 자동 수정 + 변경 마커

### 2.2 Out of Scope

- 외부 플랫폼(SharePoint, Teams) 자동 배포
- Foundry-X 웹 대시보드 시각적 편집/미리보기
- 다국어 지원 (한국어 전용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | F-item |
|----|-------------|----------|--------|
| FR-01 | 가이드 §3 표준 목차 20섹션을 SKILL.md에 내장, 고객 유형별 선택 섹션 자동 분기 | P0 | F414 |
| FR-02 | 가이드 §5 디자인 시스템을 CSS variable + HTML 템플릿으로 구현, 기존 17종 컴포넌트 갱신 | P0 | F415 |
| FR-03 | 발굴 산출물(2-0~2-8) 파일을 읽어 섹션별 자동 매핑 (가이드 §2 매핑 테이블) | P0 | F416 |
| FR-04 | 경영 언어 원칙을 프롬프트/체크리스트에 내장: "~할 수 있다"→"~를 추진", "최초" 금지, 금액 "약" 등 | P0 | F417 |
| FR-05 | 추진배경 3축(수익성/KT적합성/실행력) 필수 체크, KT 연계 없으면 경고 메시지 | P0 | F418 |
| FR-06 | GAN 교차검증: 표준 질문 풀(7개) 기반 추진론/반대론/판정 자동 생성, 냉철한 톤 | P0 | F419 |
| FR-07 | HTML→PPTX 변환, 기존 offering-pptx 스킬 체이닝 인터페이스 | P1 | F420 |
| FR-08 | v0.1→v1.0 버전 이력 자동 기록, 버전 간 diff 조회 | P1 | F421 |
| FR-09 | 임원 피드백 입력→해당 섹션 자동 수정 + `<!-- CHANGED -->` 마커 삽입 | P1 | F422 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| 품질 준수 | 필수 섹션 + 디자인 시스템 준수율 100% | 생성 HTML 자동 검증 |
| UX | Claude Code 초보도 단일 명령으로 실행 가능 | BD팀 전원 테스트 |
| 성능 | 초안 생성 30분 이내 | 스킬 실행~HTML 완성 시간 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 가이드 §3 표준 목차 20섹션 HTML 정상 생성
- [ ] 가이드 §5 디자인 시스템(컬러/타이포/레이아웃/12종 컴포넌트) 적용
- [ ] 발굴 산출물 2-0~2-8 자동 매핑 동작
- [ ] 경영 언어 원칙 체크리스트 10항목 통과
- [ ] KT 연계 원칙 강제 (3축 미충족 시 경고)
- [ ] GAN 교차검증 자동 생성 (No-Go 판정 가능)
- [ ] 기존 KOAMI 예시 대비 품질 동등 이상

### 4.2 Quality Criteria

- [ ] 기존 v1 기능 회귀 없음 (8단계 생성 프로세스 유지)
- [ ] ax-bd-offering-agent 연동 정상
- [ ] BD팀 1명 이상 실제 사업기획서 생성 테스트 통과

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 가이드 §3 목차와 기존 v1 목차 차이가 커서 대규모 수정 필요 | High | Medium | v1 목차(18섹션) vs 가이드 목차(20섹션) 매핑 테이블 선작성 |
| GAN 교차검증 품질이 "냉철함" 수준에 미달 | Medium | Medium | 프롬프트 튜닝 + 실제 사업 아이템으로 PoC |
| 발굴 산출물 포맷이 사업마다 다름 | Medium | High | 입력 유효성 체크 + 부분 생성 모드 지원 |
| CSS variable 변경이 기존 예시 HTML 깨뜨림 | Low | Medium | KOAMI 예시로 회귀 테스트 |

---

## 6. Architecture Considerations

### 6.1 구현 범위

이 기능은 **Claude Code 스킬 파일 개선**이므로 별도 패키지/서버 구현이 아님.
변경 대상은 `docs/specs/axbd/shape/offering-html/` 디렉토리 내 파일.

### 6.2 변경 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `SKILL.md` | 표준 목차 엔진 + 경영 언어 원칙 + KT 연계 원칙 + 교차검증 로직 |
| `design-tokens.md` | 가이드 §5 디자인 시스템 반영 (컬러/타이포/레이아웃) |
| `templates/base.html` | 새 디자인 시스템 CSS variable 적용 |
| `templates/components/` | 12종 컴포넌트 갱신/추가 |
| (신규) `section-mapping.md` | 가이드 §2 발굴 산출물→섹션 매핑 테이블 |
| (신규) `writing-rules.md` | 경영 언어 + KT 연계 + 고객 톤 규칙 상세 |
| (신규) `cross-validation.md` | GAN 교차검증 표준 질문 풀 + 판정 로직 |

### 6.3 의존성

| 의존 대상 | 용도 | 필수 |
|-----------|------|------|
| ax-bd-offering-agent | 에이전트 호출 (교차검증 등) | 필수 |
| ogd-orchestrator | GAN 교차검증 | 필수 |
| offering-pptx 스킬 | PPTX 변환 체이닝 | 선택 (F420) |
| six-hats-moderator | 6색 모자 토론 | 선택 |

---

## 7. Implementation Strategy

### 7.1 Sprint 배정

| Sprint | F-items | 마일스톤 | 핵심 산출물 |
|--------|---------|---------|-----------|
| **198** | F414, F415 | M1-A | SKILL.md 목차 엔진 + design-tokens v2 + base.html 교체 |
| **199** | F416, F417 | M1-B | section-mapping.md + writing-rules.md + 프롬프트 튜닝 |
| **200** | F418, F419 | M2 | KT 연계 3축 체크 + cross-validation.md + GAN 자동화 |
| **201** | F420, F421 | M3-A | PPTX 체이닝 + 버전 이력 자동 기록 |
| **202** | F422 | M3-B | 피드백 반영 자동화 + 고객 톤 자동 조정 |

### 7.2 구현 순서

```
[Sprint 198] 기반 구조
├── F414: SKILL.md 목차 섹션 갱신 (18→20섹션, 필수/선택 분기 로직)
└── F415: design-tokens.md + base.html + components/ 갱신

[Sprint 199] 입력/출력 품질
├── F416: section-mapping.md 생성 + SKILL.md에 매핑 참조 추가
└── F417: writing-rules.md 생성 + SKILL.md 프롬프트에 규칙 내장

[Sprint 200] 검증 계층 ← MVP 완료 지점
├── F418: SKILL.md에 KT 3축 체크 + 경고 로직 추가
└── F419: cross-validation.md + ogd-orchestrator 연동 강화

[Sprint 201] 확장 기능
├── F420: offering-pptx 체이닝 인터페이스
└── F421: 버전 이력 자동 기록 (review-history.md 패턴)

[Sprint 202] 피드백 루프
└── F422: 임원 피드백→섹션 수정 자동화 + 톤 자동 조정
```

### 7.3 병렬 가능성

- Sprint 198의 F414(목차)와 F415(디자인)는 **순차** (목차 확정 후 디자인 적용)
- Sprint 199의 F416(매핑)과 F417(작성 규칙)은 **병렬 가능**
- Sprint 200의 F418(KT 연계)과 F419(교차검증)은 **병렬 가능**
- Sprint 201의 F420(PPTX)과 F421(이력)은 **병렬 가능**

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`offering-skill-v2.design.md`)
2. [ ] 기존 v1 목차 vs 가이드 목차 diff 분석
3. [ ] Sprint 198 착수 (`/ax:sprint 198`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-07 | 인터뷰 기반 초안 | AX BD팀 |
