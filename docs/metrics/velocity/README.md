# Velocity Metrics (F505)

Sprint 완료 시 정량 지표를 JSON으로 기록하고 Phase 단위로 집계해요.
거버넌스 갭 **G5**(Sprint 완료 시 정량 지표 미구조화) 해소용.

## 파일 스키마

각 Sprint 완료 시 `sprint-{N}.json` 파일 1개 생성:

```json
{
  "sprint": 247,
  "phase": 31,
  "f_items": "F505,F506",
  "f_count": 2,
  "match_rate": 95.0,
  "duration_minutes": 42,
  "test_result": "pass",
  "created": "2026-04-11T13:07:13+09:00",
  "recorded_at": "2026-04-11T13:50:00+09:00"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `sprint` | int | Sprint 번호 |
| `phase` | int/null | 해당 Sprint가 속한 Phase |
| `f_items` | string | 쉼표로 구분된 F-item 목록 |
| `f_count` | int | F-item 개수 |
| `match_rate` | number/null | PDCA Gap Analysis Match Rate (%) |
| `duration_minutes` | int | Sprint 브랜치 첫 커밋 ~ 마지막 커밋 간 경과(분) |
| `test_result` | string | `pass` / `fail` / `skipped` / `unknown` |
| `created` | ISO8601 | Sprint worktree 생성 시각 |
| `recorded_at` | ISO8601 | JSON 기록 시각 |

## 기록

### 자동 (권장)

Sprint autopilot Step 7(session-end) 직전에 실행돼요:

```bash
bash scripts/velocity/record-sprint.sh
# .sprint-context에서 SPRINT_NUM을 읽어 기록
```

### 수동 (소급 또는 재기록)

```bash
bash scripts/velocity/record-sprint.sh 245
```

## 집계

Phase 단위 velocity 트렌드:

```bash
bash scripts/velocity/phase-trend.sh 31
```

출력 예시:
```
Phase 31 Velocity
- Sprints: 4 (241, 244, 245, 247)
- F-items: 8
- Match Rate 평균: 94.5%
- 평균 소요: 32분
- Test pass rate: 4/4
```

## gov-retro 연동

마일스톤 회고(`/ax:gov-retro phase-31`) 시 이 디렉터리의 JSON을
집계해 회고 섹션에 주입할 예정이에요.

**현재 상태**: 스크립트만 제공. gov-retro 스킬(플러그인) 본문 수정은 별도 세션에서 진행.

**임시 수동 주입 스니펫** (gov-retro 실행 중 수동 실행):
```bash
bash scripts/velocity/phase-trend.sh 31 >> docs/05-retros/phase-31.retro.md
```

## 갱신 규칙

- **SPEC.md §5의 Phase 번호가 바뀌면** `.github/phase-config.yml`과 함께 갱신 필수
- **파일 삭제 금지**: 과거 Sprint JSON은 append-only (재기록은 허용)
- **민감 정보 금지**: 메트릭만, 커밋 메시지/이슈 내용 포함 금지
