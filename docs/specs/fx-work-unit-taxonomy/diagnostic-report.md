# Foundry-X 작업 단위 체계 진단 보고서

**날짜:** 2026-04-12  
**세션:** S265  
**상태:** 진단 완료, 실행 대기

---

## 1. 현재 7개 작업 단위 개념

| 개념 | 정의 위치 | 현재 건수 | 라이프사이클 |
|------|----------|----------|-------------|
| **F-item** | SPEC.md §5 | 515건 | idea→groomed→plan→design→impl→review→test→deployed |
| **Sprint** | SPEC.md §2 | 264개 | Plan→Impl→Gap→Report→Deploy |
| **Phase** | SPEC.md §3, BLUEPRINT | 36개 | PRD→Sprint 묶음→완료 |
| **Milestone** | SPEC.md §3 | ~25개 | Phase 완료→SemVer 태그 |
| **REQ** | SPEC.md §5 주석 | 538건 | F-item과 1:1 매핑 |
| **Backlog (B/C/X)** | SPEC.md Task Orchestrator | 37건 완료 | task-start→WT→PR→merge |
| **Roadmap** | ROADMAP.md (신규) | 1건 | Phase 36-A에서 도입 |

## 2. 교차 관계

```
Roadmap (시간축)     BLUEPRINT (비전)
    │                    │
    └── Phase (36개) ────┘
         │       │
         │    Milestone (SemVer, v0.1~v2.5 이후 중단)
         │
     Sprint (264개, 1 Phase = 1~15 Sprints)
         │
     F-item (515건, 1 Sprint = 1~5 F-items)
         ├── FX-REQ (538건, 1:1)
         └── GitHub Issue (1:1)
         
     Backlog B/C/X (별도 트랙, F-item과 독립)
         └── 승격 시 F-item으로 전환 (예: C11→F500)
```

## 3. 진단된 모호점 5건

### M1. Phase ↔ Milestone 이중 구조 (HIGH)
- SPEC §3에 Phase와 Milestone이 혼재
- v2.5 이후 프로젝트 레벨 SemVer 중단, Phase가 Milestone 역할 흡수
- git tag v1.8.0이 최신이지만 Phase 36 진행 중 — 둘의 관계 단절

### M2. REQ ↔ F-item 1:1 중복 (HIGH)
- FX-REQ-535 = F512 내용 동일
- REQ가 F-item의 alias로만 기능, 독자적 요구사항으로 기능하는 건 극소수
- 3중 관리 부담: SPEC F-item + FX-REQ + GitHub Issue

### M3. Sprint 번호 폭발 (MEDIUM)
- 264개 Sprint가 §2에 나열 — SPEC.md 비대화 주범 (~200줄)
- Sprint가 "실행 단위"와 "이력 기록" 이중 역할
- Phase 36 A-3에서 경량화 진행 중 (경합 주의)

### M4. Backlog ↔ F-item 승격 경계 (MEDIUM)
- C11→F500 승격 사례: 기준 불명확
- "코드 변경 규모"인지 "Sprint 배정 여부"인지 모호
- 현재 암묵적 규칙: D1 migration 포함 또는 3파일+ 변경 시 F 승격

### M5. Milestone 버전 정책 단절 (LOW)
- v2.5 이후 "패키지별 Independent SemVer" 선언
- 프로젝트 레벨 Milestone이 사실상 폐지되었으나 §3 표는 잔존
- gov-version 스킬이 태그 관리하지만 활용도 낮음

## 4. 개선안

| ID | 개선안 | 대상 모호점 | Phase 36 충돌 | 유형 |
|----|--------|-----------|-------------|------|
| **A** | Milestone = Phase로 통합 — §3을 Phase 진행 표로 전환 | M1, M5 | ✅ 무충돌 | meta |
| **B** | REQ 경량화 — F-item 속성(P0~P3 + source)으로 흡수 | M2 | ✅ 무충돌 | meta + governance |
| **C** | Sprint 이력 아카이브 — §2 완료 Sprint 제거 | M3 | ⚠️ 경합 (A-3) | meta |
| **D** | Backlog 승격 기준 명문화 | M4 | ✅ 무충돌 | rules |
| **E** | 용어 사전 (Taxonomy) 문서 작성 | 전체 | ✅ 무충돌 | docs 신규 |

## 5. 실행 계획

### 즉시 착수 가능 (Sprint 264 무충돌)
1. **E**: 용어 사전 작성 → `docs/specs/fx-work-unit-taxonomy/taxonomy.md`
2. **D**: 승격 기준 → `.claude/rules/` 또는 task skill 갱신
3. **A**: §3 Milestone 표 정리 (Sprint 264 merge 후)

### Sprint 264 완료 후 착수
4. **B**: REQ 경량화 — governance 표준 변경 수반, 별도 검토 필요
5. **C**: Sprint 264 A-3과 통합 실행

### 의존성
- A, D, E는 독립 (병렬 가능)
- C는 Sprint 264 A-3 완료 대기
- B는 A 완료 후 진행 (§3 정리 선행)
