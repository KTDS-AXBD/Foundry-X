# Foundry-X 검토 종합 — Round 2

**날짜:** 2026-03-16
**검토 대상:** PRD v3

---

## 1. Round 2 착수 판정 요약

| AI | Round 1 | Round 2 | 변화 | 핵심 메시지 |
|----|---------|---------|------|------------|
| **ChatGPT** | Conditional | **Conditional (개선됨)** | ↑ | 4건 중 2건 해결, 2건 부분 해결. 내부 계약(.plumb 출력 형식 등) 문서화 + 멀티리포 문서 폐기 ADR 작성하면 Ready |
| **Gemini** | Conditional | **Ready** | ↑↑ | 5건 중 4건 해결, 1건 부분 해결. 즉시 착수 가능. Triangle Health Score를 status에 넣으라는 조언 |
| **Claude** | Conditional | **Ready (with minor)** | ↑↑ | Critical 3→0건. 신규 High 1건(Phase 1→2 단절). Sprint 1 내 4건 해결하면 Ready |
| **Grok** | Conditional | **Conditional** | → | 권고 6건 중 4건 반영됨, 2건 반쪽. 태그라인 과대 + Plumb 의존도 우려. 첫 4주가 생명줄 |

**Round 1: 0/4 Ready → Round 2: 2/4 Ready + 2/4 Conditional(개선됨)**

---

## 2. Round 1 → Round 2 이슈 추적

### Critical 이슈 (Round 1: 3건)

| ID | 이슈 | Round 1 | Round 2 | 해결 방법 |
|----|------|---------|---------|----------|
| S-01 | SDD↔API 통신 계약 | Critical | **해결** | Phase 1에서 API Server 제거. CLI→Plumb 직접 호출 |
| E-01 | 에이전트 충돌 전략 | Critical | **해결** | 브랜치 기반 격리 + Phase 1 단일 에이전트 |
| D-01 | Plumb↔TS 통합 | Critical | **부분 해결** | 2트랙 전략 확정. subprocess 오류 처리 상세화 필요 |

**Critical 3 → 0 (착수 차단 요소 제거)**

### 신규 이슈 (Round 2에서 발생)

| ID | 출처 | 심각도 | 이슈 | 반영 방안 |
|----|------|--------|------|----------|
| N-01 | Claude | High | Phase 1→2 아키텍처 단절 위험 | Phase 1 핵심 모듈을 독립 패키지로 분리 |
| N-02 | Claude | Medium | 모노리포 TS+Python 공존 | packages/plumb을 독립 빌드 단위로 |
| N-03 | Claude | Medium | Phase 1 메타데이터 저장 부재 | .foundry-x/ 디렉토리에 JSON 저장 |
| N-04 | ChatGPT | Medium | .plumb 출력/decisions.jsonl 내부 계약 미문서화 | Sprint 1에서 내부 계약 문서 작성 |
| N-05 | ChatGPT | Low | 멀티리포 문서 폐기 ADR 필요 | ADR-000 작성 |
| N-06 | Grok | Medium | 태그라인과 Phase 1 MVP 간 괴리 | Phase 1용 포지셔닝 별도 정의 |
| N-07 | Gemini | Low | status에 Triangle Health Score 포함 권고 | Phase 1 구현에 반영 |

---

## 3. 충분도 스코어카드

| 항목 | 배점 | R1 점수 | R2 점수 | 근거 |
|------|------|--------|--------|------|
| **신규 이슈 미발견** | 20 | 10 | **16/20** | Round 1에서 7건 공통 이슈 → v3에서 전량 반영. Round 2에서 신규 Critical 0건. 신규 High 1건(Phase 전환 리스크)은 구조적 결과이지 결함이 아님. |
| **Ready 판정 비율** | 30 | 15 | **23/30** | 2/4 Ready (Gemini, Claude) + 2/4 Conditional 개선됨 (ChatGPT, Grok). Round 1의 0/4 Ready에서 크게 진전. |
| **핵심 요소 커버리지** | 30 | 22 | **27/30** | 목적(명확), 사용자(Phase별 구분), 범위(극소 MVP), 성공기준(현실 지표 5개), 제약(하드 마일스톤), 기술(확정). 잔여: 내부 계약 문서화, 메타데이터 저장 방식. |
| **다관점 반영** | 20 | 16 | **18/20** | 개발자(Grok 현실 지표+채택 전략), PM(ChatGPT NL 계층), 아키텍트(Claude 구조+Phase 전환), 시장(Gemini SR 시나리오+Health Score). 잔여: 비기술자 관점은 Phase 2로 의도적 이관. |

### 총점: 84 / 100

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│   총점: 84 / 100  →  착수 준비 완료 ✅                    │
│                                                          │
│   80점 기준 달성 (+4점)                                    │
│   Round 1 (63점) → Round 2 (84점): +21점 개선             │
│                                                          │
│   Critical 이슈: 3건 → 0건                                │
│   Ready 판정: 0/4 → 2/4                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 착수 전 최종 체크리스트

4개 AI의 착수 조건을 통합하면, Sprint 1 시작 전 또는 Sprint 1 내에 해결할 항목은 다음과 같습니다:

### 착수 전 (Day 1 전)

| # | 항목 | 출처 | 소요 |
|---|------|------|------|
| 1 | ADR-000: v3가 기존 멀티리포/AI Foundry 문서를 대체한다는 선언 | ChatGPT | 30분 |
| 2 | Phase 1 Git provider 확정 (GitHub 또는 GitLab) | Claude D-02 | 결정 1건 |

### Sprint 1 내 (Week 1~2)

| # | 항목 | 출처 | 소요 |
|---|------|------|------|
| 3 | .plumb 출력 형식 + decisions.jsonl 필드 내부 계약 문서화 | ChatGPT | 반일 |
| 4 | subprocess 래퍼 오류 처리 계약 (timeout, exit code, stderr) | Claude D-01 | 반일 |
| 5 | Phase 1 메타데이터 저장 방식 결정 (.foundry-x/ JSON) | Claude N-03 | 2시간 |
| 6 | packages/cli 핵심 모듈을 독립 패키지로 분리 설계 | Claude N-01 | 반일 |
| 7 | TS+Python 빌드 파이프라인 검증 (Turborepo + Python 독립 빌드) | Claude N-02 | 반일 |
| 8 | status 커맨드에 Triangle Health Score 포함 | Gemini | 구현 시 반영 |

### Phase 1과 병행 (ADR 사전 준비)

| # | ADR | 내용 | 적용 시점 |
|---|-----|------|----------|
| ADR-001 | API Server 통신 계약 | OpenAPI 3.1 스키마 초안 | Phase 2 전 |
| ADR-002 | 복수 에이전트 충돌 전략 | rebase-first vs auto-merge | Phase 2 전 |
| ADR-003 | GitHub/GitLab 추상화 범위 | Adapter 패턴 vs Plugin | Phase 2 전 |
| ADR-004 | Git↔PostgreSQL reconciliation | 실제 구현 설계 | Phase 2 전 |
| ADR-005 | shared-auth 에이전트 인증 모델 | 검증 + 확장 | Phase 2 전 |
| ADR-006 | Plumb Track A→B 전환 기준 | 성능/안정성 임계치 | Month 2 |

---

## 5. 최종 판정

### 착수 준비 완료 (Ready to Launch Phase 1)

**근거:**
- 충분도 84/100 (80점 기준 달성)
- Critical 이슈 0건
- 4개 AI 중 2개 Ready, 2개 Conditional(개선됨)
- Conditional 2개(ChatGPT, Grok)의 잔여 조건이 모두 Sprint 1 내 해결 가능한 수준
- Phase 1 범위가 명확하고 실행 가능 (CLI 3개 커맨드 + Plumb 래퍼)
- Go/Kill 마일스톤이 확정되어 좀비 프로젝트 방지

**Grok의 경고를 기억할 것:**
> "착수 OK지만, 첫 4주가 생명줄. Plumb Track A가 5명에게 '쓸 만하다'는 판정을 받지 못하면 즉시 Pivot 또는 Kill."

**Gemini의 조언을 기억할 것:**
> "status 커맨드의 Triangle Health Score가 Foundry-X를 단순 CLI 툴에서 조직 관리 플랫폼으로 격상시키는 신의 한 수."
