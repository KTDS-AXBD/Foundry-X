# Prototype Builder v2 — M0 PoC 실증 결과

**실측일:** 2026-04-07
**환경:** WSL2 (Linux 6.6.87), Claude Code 2.1.92
**API:** Anthropic API (claude-sonnet-4-20250514)

---

## 1. 종합 판정

| # | 검증 항목 | 결과 | 통과 기준 | 판정 |
|---|----------|------|----------|:----:|
| 1 | Vision API 비용 | $0.0096/회 (72KB), $0.0042/회 (16KB) | < $0.50/회 | **PASS** |
| 2 | API rate limit | 10회 연속 성공, 평균 2.0초, 429 없음 | 일 10회+ | **PASS** |
| 3 | impeccable 토큰 크기 | 7도메인 전체 ~8K 토큰 (30K 한도의 27%) | 시스템 프롬프트 내 수용 | **PASS** |
| 4 | LLM 판별 재현성 | 5회 반복 표준편차 0.0 (temp=0) | 표준편차 < 10점 | **PASS** |

**M0 판정: GO** — 4건 모두 통과. Sprint 203 착수 가능.

---

## 2. Vision API 비용 실측

### 테스트 조건
- 모델: claude-sonnet-4-20250514
- 평가 프롬프트: 5차원 UI 품질 평가 (JSON 출력)
- 가격: Sonnet input $3/1M, output $15/1M

### 측정 결과

| 이미지 | 크기 | Input 토큰 | Output 토큰 | 비용 |
|--------|------|-----------|------------|------|
| dashboard.png | 72KB | 1,507 | 339 | $0.0096 |
| dashboard-mobile.png | 16KB | 474 | 188 | $0.0042 |

### 분석
- 실패 조건($1/회)의 **1/100 수준** — 비용 리스크 완전 해소
- 프로토타입 스크린샷(예상 100~300KB)도 $0.02~0.05 범위로 추정
- O-G-D 루프 5라운드 × Vision 평가 = $0.05~0.25/빌드 → 경제적으로 충분히 가능
- **결론**: Vision API를 5차원 중 ui 차원 주평가로 적극 활용 가능

---

## 3. API Rate Limit 테스트

### 테스트 조건
- 모델: claude-sonnet-4-20250514
- 호출 방식: curl 연속 호출 (간격 없음)
- 호출 수: 10회

### 측정 결과

| Run | 응답 시간 | HTTP 코드 |
|-----|----------|----------|
| 1 | 1,550ms | 200 |
| 2 | 2,834ms | 200 |
| 3 | 1,578ms | 200 |
| 4 | 2,148ms | 200 |
| 5 | 1,479ms | 200 |
| 6 | 2,295ms | 200 |
| 7 | 2,053ms | 200 |
| 8 | 2,555ms | 200 |
| 9 | 2,042ms | 200 |
| 10 | 1,485ms | 200 |

- **성공률**: 10/10 (100%)
- **평균 응답**: 2,001ms
- **Rate limit 도달**: 없음
- **결론**: API 호출 기반으로는 rate limit 제약 없음. max-cli(Claude Code CLI) 인증 후 별도 테스트 필요

### max-cli 참고사항
- Claude Code CLI 2.1.92 설치 확인 완료
- CLI 인증(`claude auth login`) 미완 → 별도 세션에서 처리 필요
- Phase 19 PoC 문서(poc-cli.md)는 템플릿만 있고 실측 데이터 없었음

---

## 4. impeccable 참조문서 토큰 측정

### 소스
- 레포: https://github.com/pbakaus/impeccable
- 라이선스: Apache 2.0 (상업적 사용 가능)

### 전체 7개 도메인

| 도메인 | 파일명 | 단어 수 | 추정 토큰 |
|--------|--------|--------:|----------:|
| Typography | typography.md | 846 | ~1,100 |
| Color & Contrast | color-and-contrast.md | 810 | ~1,053 |
| Spatial Design | spatial-design.md | 531 | ~690 |
| Motion Design | motion-design.md | 649 | ~844 |
| Interaction Design | interaction-design.md | 971 | ~1,262 |
| Responsive Design | responsive-design.md | 459 | ~597 |
| UX Writing | ux-writing.md | 688 | ~894 |
| **참조문서 합계** | | **4,954** | **~6,440** |
| SKILL.md (스킬 본체) | SKILL.md | 1,250 | ~1,625 |
| **전체 합계** | | **6,204** | **~8,065** |

### 핵심 4개 도메인

| 도메인 | 추정 토큰 |
|--------|----------:|
| Typography | ~1,100 |
| Color & Contrast | ~1,053 |
| Spatial Design | ~690 |
| Responsive Design | ~597 |
| **4개 합계** | **~3,440** |

### 판단
- 7도메인 전체(~8K) = 시스템 프롬프트 30K 한도의 **27%** → 여유 있음
- 4도메인 축소 불필요 — **7도메인 전체 적용 가능**
- 기존 CLAUDE.md 체인(~15-20K)과 합산해도 30K 이내

---

## 5. LLM 판별 재현성 테스트

### 테스트 조건
- 모델: claude-sonnet-4-20250514
- Temperature: 0
- 입력: 고정된 HTML 프로토타입 코드 (AI Business Analytics 데모)
- 평가: 5차원 0-100점 (build, ui, functional, prd, code + 가중 total)
- 반복: 5회

### 측정 결과

| Run | build | ui | func | prd | code | total |
|-----|:-----:|:--:|:----:|:---:|:----:|:-----:|
| 1 | 85 | 75 | 40 | 70 | 60 | 66 |
| 2 | 85 | 75 | 40 | 70 | 60 | 66 |
| 3 | 85 | 75 | 40 | 70 | 60 | 66 |
| 4 | 85 | 75 | 40 | 70 | 60 | 66 |
| 5 | 85 | 75 | 40 | 70 | 60 | 66 |

- **평균**: 66.0
- **표준편차**: 0.0
- **범위**: 0
- **판정**: **PASS** (기준 < 10점, 실측 0점)

### 분석
- temperature=0 + structured JSON output으로 **완벽한 결정성** 확보
- 실패 조건(±20점 불안정)의 우려 완전 해소
- O-G-D 루프의 진동/비수렴 리스크 극히 낮음
- 다만, 더 복잡한 프로토타입이나 다른 모델에서는 재검증 필요

---

## 6. Phase 19 PoC 대비 변경점

| 항목 | Phase 19 PoC (F384/F385) | M0 실증 (2026-04-07) |
|------|--------------------------|---------------------|
| CLI 테스트 | 템플릿만, 실측 없음 | API 기반 10회 성공, CLI 인증 별도 |
| 스코어러 재현성 | 템플릿만, 실측 없음 | 5회 반복 표준편차 0 |
| Vision API | 언급만 (P1 로드맵) | 실측 완료, $0.01/회 |
| impeccable | 미존재 | 7도메인 ~8K 토큰, 수용 가능 |

---

## 7. 다음 단계

1. **max-cli CLI 인증** — `claude auth login` 으로 구독 계정 인증 후 CLI 빌드 테스트
2. **Sprint 203 착수** — F423(impeccable 통합) + F424(안티패턴 차단)
3. **Plan 반영** — M0 PoC 결과를 Plan 문서에 갱신 (제약 조건 완화)
