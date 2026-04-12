# Self-Evolving Harness → 스킬 운영 적용 방안

> **문서코드:** FX-STRT-016
> **작성일:** 2026-04-12
> **근거:** FX-STRT-015 (self-evolving-harness-strategy v3.0), FX-ANLS-OPENSPACE-001

---

## 1. 현황: 프로덕트 vs 스킬 운영의 갭

| Harness 원칙 | 프로덕트 코드 (구현됨) | 스킬 운영 (미적용) | 이번 세션 적용 |
|-------------|---------------------|------------------|:------------:|
| 원칙 2: 실패가 데이터 | EventBus + execution_events D1 | autopilot 실패 로그 WT와 삭제 | — |
| 원칙 4: 측정 없이 진화 없다 | Skill Execution Tracker (F274) | sf-usage 데이터 0 | ✅ P1 |
| 원칙 5: 기준과 정렬 | O-G-D Discriminator (Rubric) | sf-lint 자동 실행 안 됨 | ✅ P3 |
| Stage 3: Guard Rail Refine | Rules 5종 정적 배치 | 스킬 변경 시 lint 없음 | ✅ P3 |
| OpenSpace FIX | ogd fix 모드 | 스킬 실패 시 자동 수리 없음 | — |
| OpenSpace DERIVED | F276 DERIVED 엔진 | 성공 패턴 자동 추출 없음 | — |
| OpenSpace CAPTURED | F277 CAPTURED 엔진 | 워크플로우 캡처 없음 | — |

## 2. 이번 세션 달성 (P1 + P3)

### session-end Phase 5b (P1)
- 스킬 파일 변경 시 sf-scan + sf-lint + source↔cache drift 자동 점검
- **Harness 원칙 4 적용**: 매 세션 카탈로그 갱신으로 데이터 축적 시작

### code-verify Step 6b (P3)
- 스킬 파일이 변경 파일에 포함될 때 sf-lint 자동 실행
- **Harness 원칙 5 적용**: sf-lint = 스킬의 Discriminator

## 3. 후속 로드맵

### Phase A: 데이터 축적 (현재 ~ 5 Sprint)
- session-end Phase 5b가 매 세션 sf-scan 실행
- sf-usage 데이터가 자연스럽게 쌓임
- 5 Sprint 후 "어떤 스킬이 자주 쓰이고 어떤 스킬이 죽어있는지" 판단 가능

### Phase B: 실패 로그 누적 (후속 C-track)
- sprint-autopilot 실패 시 `.sprint-context`의 `ERROR_STEP` + `ERROR_MSG`를 master의 JSONL에 누적
- task-daemon의 `task-log.ndjson`과 통합 또는 별도 `autopilot-failures.ndjson` 생성
- **Harness 원칙 2 적용**: 실패 패턴 분석의 데이터 기반 구축

### Phase C: Guard Rail 자동 제안 (Phase B 데이터 축적 후)
- 반복 실패 패턴에서 새 .claude/rules/ 규칙 자동 제안
- 현재 5종 rules가 정적 → 데이터 기반 동적 확장
- **Harness Stage 3 Layer 5 완성**

### Phase D: OpenSpace 패턴 검토 (장기)
- FIX: 스킬 실행 실패 시 자동 수리 → sf-lint --fix가 부분 대응
- DERIVED: 성공적 세션에서 반복 패턴 추출 → feedback memory가 수동 대응
- CAPTURED: 스킬 체이닝 패턴 기록 → sprint-autopilot이 암묵적 대응
- **판단**: 현재 1인 개발 규모에서는 수동/반자동으로 충분. 팀 확장 시 재검토

## 4. 판단 기준 (Harness v2.0 §0 유지)

모든 적용 결정은 3가지로 검증:
1. 이것 없이도 돌아가는가?
2. 운영 비용이 얻는 가치보다 작은가?
3. 팀원 1명이 이해하고 수정할 수 있는가?

Phase A~B는 3가지 모두 통과. Phase C~D는 데이터 확인 후 판단.
