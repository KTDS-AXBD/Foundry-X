# QSA PoC PRD — Prototype 품질 검증 + 개선

**버전:** v1
**날짜:** 2026-04-09
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Phase 27에서 구축한 QSA 품질 체계를 실제 Prototype 3건(KOAMI/XR/Deny)에 적용하여, "AI가 만들었다는 느낌 탈피" 효과를 검증하고 품질을 개선하는 PoC.

**배경:**
Phase 27에서 Prototype QSA(5차원 판별), CSS Anti-Pattern Guard, DesignToken 인터페이스를 구축했으나, 실제 산출물에 한 번도 적용하지 않은 상태. 품질 체계의 실효성을 검증하고, 개선 루프가 실제로 동작하는지 확인 필요.

**목표:**
1. 기존 Prototype 3건에 QSA를 적용하여 현재 품질 수준을 측정
2. CSS Anti-Pattern Guard로 AI 느낌 자동 제거
3. 개선 후 QSA 재평가로 품질 향상 정량화
4. F465 DesignToken 연결의 실전 효과 확인

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- Prototype 3건(KOAMI/XR/Deny)이 D1+R2에 등록되어 있으나 품질 미측정
- CSS Anti-Pattern Guard가 구현되어 있으나 실제 적용 안 됨
- QSA 점수 기준이 없어 "좋은 Prototype"의 정량적 판단 불가

### 2.2 목표 상태 (To-Be)
- 3건 모두 QSA PASS (quality_score ≥ 0.85)
- CSS 안티패턴 0건 (AI 기본 폰트, 순수 흑백 제거)
- 보안 이슈 0건 (내부 정보 노출 없음)
- 개선 전후 점수 비교 데이터 확보

### 2.3 시급성
- Phase 27 완료 직후가 PoC 최적 시점 — 코드가 신선하고 컨텍스트가 풍부
- 실전 검증 없이 Phase 28로 넘어가면 품질 체계가 "이론만"으로 남을 위험

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| BD팀 (Sinclair) | QSA 결과를 보고 품질 개선 방향 결정 | 정량적 품질 점수 + 구체적 개선 피드백 |

### 3.2 사용 환경
- CLI: PrototypeQsaAdapter 직접 호출 또는 API 엔드포인트
- 대상: D1 prototypes 테이블의 HTML 콘텐츠

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have — P0)

| # | 기능 | 설명 |
|---|------|------|
| 1 | **QSA 실행 스크립트** | D1에서 Prototype HTML을 가져와 PrototypeQsaAdapter에 전달, 5차원 결과 출력 |
| 2 | **CSS Anti-Pattern Guard 적용** | 3건 HTML에 guardCss() 실행, 수정된 HTML 생성 |
| 3 | **개선 후 재평가** | Guard 적용 후 QSA 재실행, 전후 점수 비교 |
| 4 | **결과 보고서** | 3건의 QSA 점수 + 발견 항목 + 개선 내역을 문서화 |

### 4.2 부가 기능 (Should Have — P1)

| # | 기능 | 설명 |
|---|------|------|
| 1 | **DesignToken 적용 테스트** | F465 인터페이스를 통해 실제 토큰을 Prototype에 적용 |
| 2 | **Offering QSA 병행** | 대응하는 Offering HTML에도 QSA 실행 |

### 4.3 제외 범위 (Out of Scope)
- Prototype HTML 자체의 재생성 (기존 HTML에 Guard만 적용)
- PPTX Offering 판별
- 산업별 DESIGN.md 프리셋 (별도 Phase)

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| QSA quality_score 평균 | 측정 안 됨 | ≥ 0.85 | 3건 QSA 결과 평균 |
| CSS 안티패턴 검출 수 | 측정 안 됨 | 0건 (Guard 적용 후) | guardCss() corrections 수 |
| 보안 이슈 (SECURITY_FAIL) | 측정 안 됨 | 0건 | QSA-R1 결과 |
| 개선 전후 점수 차이 | N/A | +0.10 이상 | before - after 비교 |

### 5.2 MVP 최소 기준
- [ ] 3건 Prototype 모두에 QSA 실행 성공
- [ ] CSS Guard 적용 후 안티패턴 0건
- [ ] 결과 보고서 생성

---

## 6. 제약 조건

### 6.1 기술 스택
- Workers AI (Llama-3.1-8b) — QSA Discriminator
- 기존 PrototypeQsaAdapter + CssAntiPatternGuard
- D1 prototypes 테이블에서 HTML 조회

### 6.2 인력/일정
- 1 Sprint (Sprint 232)
- 1명 (Sinclair) + Agent

---

## 7. 오픈 이슈

| # | 이슈 | 담당 |
|---|------|------|
| 1 | Workers AI 모델의 QSA 판별 정확도가 충분한지 | PoC에서 확인 |
| 2 | 개선된 HTML을 D1에 업데이트할지 원본 유지할지 | Sinclair |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-09 | 인터뷰 기반 최초 작성 | - |
