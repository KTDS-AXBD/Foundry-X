# Foundry-X 검토 종합 분석 및 PRD v3 반영 사항

**날짜:** 2026-03-16
**검토 라운드:** Round 1
**검토 대상:** PRD v2

---

## 1. 4개 AI 검토 결과 종합

### 착수 판정 요약

| AI | 관점 | 판정 | 핵심 메시지 |
|----|------|------|------------|
| **ChatGPT** | 논리적 완결성 | **Conditional** | 컨셉은 강력하지만 핵심 계약 계층(Canonical Model, Spec DSL Schema, OpenAPI Contract)이 부재 |
| **Gemini** | 시장/트렌드 | **Conditional** | 트렌드 정합성 완벽. Plumb 미성숙도와 멀티리포 초기 부담이 걸림돌. MVP 범위 축소 필요 |
| **Claude** | 구조적 일관성 | **Conditional** | Critical 3건(SDD↔API 통신 계약, 에이전트 충돌 전략, Plumb↔TS 통합), High 5건 |
| **Grok** | 현실적 비판 | **Conditional** | 스코프 70% 삭감 필요. CLI 3개 커맨드만 먼저. "일정 유연 = 자연사" 경고. 실사용자 강제 온보딩 필수 |

**4/4 Conditional** — 방향은 전원 동의, 실행 조건이 미충족.

### 공통 지적사항 (3개 이상 AI가 동시 지적)

| # | 이슈 | 지적한 AI | 심각도 |
|---|------|----------|--------|
| **C1** | **MVP 범위가 너무 넓다** — 6개 리포 동시 개발 비현실적 | Gemini, Grok, ChatGPT | Critical |
| **C2** | **Plumb 미성숙도** — alpha PoC를 핵심 엔진으로 채택하는 리스크 | Gemini, Grok, Claude | Critical |
| **C3** | **SDD Engine ↔ API Server 통신 계약 부재** | ChatGPT, Claude | Critical |
| **C4** | **에이전트 충돌 해결 전략 없음** | ChatGPT, Claude, Grok | High |
| **C5** | **멀티리포 초기 부담** — 모노리포로 시작 후 분리 권장 | Gemini, ChatGPT | High |
| **C6** | **"일정 유연" = 모멘텀 상실 리스크** | Grok | High |
| **C7** | **실사용자 강제 온보딩 없이는 채택 실패** | Grok | High |

### AI별 고유 인사이트

| AI | 고유 인사이트 | 반영 여부 |
|----|-------------|----------|
| ChatGPT | NL → DSL 변환 계층이 아키텍처에 명시되지 않음 | ✅ 반영 |
| Gemini | MCP(Model Context Protocol) 지원 필요, KT DS 특화 시나리오(SR 처리) 먼저 | ✅ 반영 |
| Claude | Git ↔ PostgreSQL 정합성 reconciliation 전략 필요, 5축 순환 의존 DAG 필요 | ✅ 반영 |
| Grok | 현실 지표로 전환 (CLI 호출 비율, --no-verify 사용률, sync 후 수동 수정 수) | ✅ 반영 |

---

## 2. PRD v2 → v3 변경 사항

### 변경 1: MVP 범위 70% 축소 (C1, Grok 핵심 권고)

**v2:** 4개 리포(cli, api, web, sdd) 동시 개발
**v3:** 단일 리포에서 Core Loop 증명 → 검증 후 분리

```
Phase 1 MVP (극소 범위):
- foundry-x-cli 단일 패키지에서 시작
- 커맨드 3개만: init, sync, status
- Plumb를 직접 호출하는 래퍼 수준
- 웹 대시보드, API Server, 에이전트 오케스트레이션 전부 Phase 2로 이관
- 목표: 개발자 5명이 실제 프로젝트에서 3주 이상 사용
```

### 변경 2: Plumb 의존 전략 명확화 (C2)

**v2:** "Plumb 확장/Fork"으로 모호
**v3:** 2트랙 전략

```
Track A (즉시): Plumb를 CLI의 subprocess로 호출하는 래퍼
  - pip install plumb-dev를 사전 요구사항으로
  - foundry-x sync = plumb review + 추가 메타데이터 수집
  - Plumb의 한계가 드러나면 Track B로 전환

Track B (대기): SDD 로직 자체 구현
  - Plumb의 핵심 알고리즘(결정 추출, 명세 업데이트)을 이해한 후
  - TypeScript로 재구현하여 Python 의존성 제거
  - Track A에서 실사용 데이터를 충분히 모은 후 판단
```

### 변경 3: SDD Engine ↔ API 통신 계약 정의 (C3, Claude S-01)

**v2:** 미정의
**v3:** Phase 1에서는 API Server 없음 (CLI가 직접 Plumb 호출). Phase 2에서 API Server 도입 시 OpenAPI 3.1 계약 필수 선행.

```
Phase 1: CLI → Plumb (subprocess, 직접 호출)
Phase 2: CLI → API Server → SDD Engine (REST, OpenAPI 3.1)
  - foundry-x-api/docs/sdd-engine-contract.yaml 선 작성 후 구현
```

### 변경 4: 에이전트 충돌 전략 확정 (C4, Claude E-01)

**v2:** 미정의
**v3:** 브랜치 기반 격리 (Optimistic)

```
전략: 에이전트별 독립 브랜치
- 각 에이전트 작업 = 별도 feature branch
- 작업 완료 후 main에 PR → SDD sync 검증 → merge
- 충돌 발생 시 에이전트가 자동 rebase 시도 (최대 3회)
- 실패 시 human escalation (PR에 "충돌 해결 필요" 라벨)
- Phase 1에서는 단일 에이전트만 지원하므로 충돌 없음
```

### 변경 5: 멀티리포 → 모노리포로 시작 (C5, Gemini/ChatGPT 권고)

**v2:** 멀티리포 6개
**v3:** 모노리포로 시작, 안정화 후 분리

```
Phase 1~2: 모노리포
foundry-x/
├── packages/
│   ├── cli/          # foundry-x CLI
│   ├── sdd/          # SDD Engine (Python, Plumb 래퍼)
│   └── shared/       # 공유 타입, 설정
├── docs/             # 문서, ADR
├── templates/        # 하네스 템플릿
└── examples/         # 예제 프로젝트

Phase 3+: 사용자/팀 규모 증가 시 멀티리포로 분리
```

### 변경 6: 하드 마일스톤 도입 (C6, Grok 핵심 권고)

**v2:** "일정 유연"
**v3:** 3개월 단위 Go/Kill 판정

```
Month 1 (4주): CLI MVP 완성 + 내부 개발자 5명 온보딩
  Kill 조건: CLI 완성 불가 또는 온보딩 대상자 확보 불가

Month 2~3 (8주): 실사용 + 피드백 수집 + 개선
  Kill 조건: 주간 CLI 사용률 30% 미만 (5명 중 2명 미만 활성)

Month 3 판정: 계속 / 피벗 / 중단
  계속 조건: NPS 6+ 또는 CLI 사용률 60%+ 
  피벗: Plumb 포크만으로 축소
  중단: 채택 실패 인정
```

### 변경 7: 현실 지표 도입 (Grok 권고)

**v2:** 의도 정렬률 90% 등 추상적 KPI
**v3:** 현실 측정 가능 지표 추가

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| CLI 주간 호출 횟수 / 사용자 | `foundry-x` 실행 로그 | 주 10회+ |
| `--no-verify` 우회 비율 | Git hook 로그 | < 20% |
| sync 후 수동 수정 파일 수 | SDD 리포트 diff | 감소 추세 |
| 결정 승인/거부 비율 | Plumb decisions.jsonl | 승인 > 70% |
| "기존 방식으로 복귀" 횟수 | 사용자 인터뷰 | 0건 |

### 변경 8: KT DS 특화 시나리오 정의 (Gemini 권고)

**v2:** 범용 협업 플랫폼
**v3:** 첫 타겟 시나리오 확정

```
Phase 1 타겟 시나리오: SM 변경 요청(SR) 처리 자동화
- 변경 요청 → 스펙 작성 → 에이전트 구현 → 검증 → 머지
- KT DS 내부에서 가장 반복적이고 규모가 큰 업무
- 성공 시 즉시 ROI 입증 가능
```

### 변경 9: Git ↔ PostgreSQL 정합성 전략 (Claude S-03)

```
전략: Git 우선, DB는 비동기 동기화
- Git push가 항상 먼저 (Git = 진실)
- Git webhook → API Server → DB 업데이트
- DB 업데이트 실패 시: 재시도 3회 → 실패 시 reconciliation job
- reconciliation: 주기적(5분) Git 상태 스캔 → DB 정합성 확인 및 복구
- 불일치 발견 시 Git 기준으로 DB 덮어쓰기 (Git이 항상 승리)
```

### 변경 10: NL → Spec 변환 계층 명시 (ChatGPT 지적)

**v2:** "자연어→Spec 자동 변환 (Phase 2)"로만 언급
**v3:** 아키텍처에 변환 레이어 명시

```
자연어 → [NL-to-Spec Layer (LLM)] → Spec Markdown → [SDD Engine] → Git

NL-to-Spec Layer:
- Phase 2에서 구현
- LLM(Claude/GPT)이 자연어를 구조화된 Spec Markdown으로 변환
- 변환 결과를 사람이 리뷰/승인한 후에만 Git에 커밋
- 자동 커밋 금지 — 반드시 human-in-the-loop
```

---

## 3. 충분도 스코어카드

| 항목 | 배점 | 점수 | 근거 |
|------|------|------|------|
| **신규 이슈 미발견** | 20 | **10/20** | 4개 AI에서 총 7건 공통 이슈 + 다수 고유 이슈 식별. 10건 중 10건 전량 반영 완료. 그러나 첫 라운드이므로 "이전 회차 대비" 비교 불가. |
| **Ready 판정 비율** | 30 | **15/30** | 4/4 Conditional — Ready 0건. 전원이 "조건부 추진"으로 판정. 무조건 Ready가 0건이므로 절반 점수. |
| **핵심 요소 커버리지** | 30 | **22/30** | 목적(명확), 사용자(명확), 범위(축소 반영), 성공 기준(현실 지표 전환), 제약(마일스톤 도입). 기술 계약(SDD↔API)은 Phase 구분으로 해결. 멀티테넌시 상세 미정. |
| **다관점 반영** | 20 | **16/20** | 개발자(Grok 현실 지표), PM(ChatGPT NL 계층), 아키텍트(Claude 구조), 시장(Gemini 경쟁). 고객사 관점은 KT DS SR 시나리오로 부분 반영. |

### 총점: 63 / 100

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   총점: 63 / 100  →  추가 검토 필요              │
│                                                  │
│   80점 미달. Round 2 검토 필요.                   │
│                                                  │
│   미달 항목:                                      │
│   - Ready 판정 0/4 (조건부만 4건)                │
│   - 첫 라운드이므로 이전 대비 비교 불가            │
│                                                  │
│   권고: v3 반영 후 Round 2 검토 실시              │
│   또는: v3 반영사항이 조건을 충족하면              │
│         추가 라운드 없이 착수 가능                │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 4. Round 2 진행 여부 판단

### 옵션 A: Round 2 검토 실시
- v3 반영 후 동일 4개 AI에 재검토 요청
- 80점 이상 달성 목표
- 추가 1~2일 소요

### 옵션 B: 조건부 착수
- v3 반영사항이 4개 AI의 조건을 대부분 충족하므로
- Grok의 "4주 Plumb PoC → 5명 실사용 → NPS 6+" 조건을 첫 마일스톤으로 설정
- 바로 Phase 1 착수하되, Month 1 종료 시 Kill 판정

### 권고: 옵션 B (조건부 착수)
- 검토 라운드를 더 돌리는 것보다 실제 PoC를 빨리 시작하는 것이 Grok의 핵심 메시지
- "완벽한 PRD보다 불완전한 MVP가 더 많은 것을 알려준다"
- v3 반영사항으로 Critical 이슈 3건 모두 해결 방안이 정의됨
