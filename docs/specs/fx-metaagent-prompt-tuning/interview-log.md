# Interview Log — fx-metaagent-prompt-tuning

**날짜**: 2026-04-14
**인터뷰어**: Claude (Opus 4.6 1M)
**응답자**: Sinclair Seo

---

## Part 1: 왜 (목적/문제)

**Q**: 어떤 프레이밍으로 핵심 문제를 잡을지 — Prompt/Model/Data 3축 진단+해소 / Prompt 유일 / Data 유일 / 선택하지 않음 중.

**A**: **세 가지 원인 진단+해소** (Recommended 채택)

**컨텍스트**
- Phase 43 Dogfood 3회 동일 증상: agent_run_metrics 27건 수집 성공, 6축 score 산출 성공, but agent_improvement_proposals 0건
- 원인 후보: (1) Prompt 품질 (2) Haiku 모델 역량 (3) rawValue=0 입력 데이터 질
- 세션: graph-bi-koami-001-1776130774847 등

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q1**: 주 사용자는? Sinclair(Dogfood) / 미래 AX BD팀 / KOAMI 고객

**A1**: **Sinclair 본인 (Dogfood)** — 범위 제일 좁게 확정

**Q2**: Apply 범위는? 생성만 / 생성+apply / 생성+apply+개선효과 검증

**A2**: **생성 + apply + 개선 효과 검증** — E2E 가치 증명까지

---

## Part 3: 무엇을 (범위/기능)

**제안한 Must Have 6개**:
1. MetaAgent systemPrompt 강화
2. META_AGENT_MODEL config flag
3. A/B 실험 기록 경로
4. Proposals 품질 rubric
5. Apply 경로 검증
6. 2차 Dogfood 점수 이동 실측

**Q1**: Must Have 조정 필요?

**A1**: **6개 그대로** 확정

**Q2**: Out-of-scope 후보 3개 중 포함시킬 것?

**A2**: **3개 모두 제외 유지**
- auto-apply (Human Approval 제거): 보안상 금지
- 타 agent tuning (Worker/Shaping): 별도 F-item
- 고객용 Proposal UI: KOAMI 본사업 시점

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**제안한 KPI 5종**: K1 생성건수 / K2 rubric / K3 apply 성공률 / K4 6축 이동 / K5 A/B 기록

**Q1**: MVP 기준?

**A1**: **K1≥1건 + K3=100%** — 최소 1건 생성 + apply 동작이 MVP

**Q2**: 실패 중단 기준?

**A2**: **5회 반복 후 중단** — Prompt 2 + Model 1 + Rubric 1 + Graph 재설계 1

---

## Part 5: 제약과 리소스

(제시한 조건 전부 수용: Sinclair 단독, W+6+ 구체화/W+8+ 착수, Sonnet 1회 ≤ $0.10, ANTHROPIC_API_KEY 등록됨)

**Q1**: F538(MSA)과 병행?

**A1**: **F542 먼저 단독 실행** — F538 뒤로 미루고 F542에 1 sprint 집중

**Q2**: META_AGENT_MODEL 기본값?

**A2**: **Sonnet 4.6 전환** — Haiku 역량 부족 가정으로 default Sonnet

---

## Risk Section (요약 확인 후 보강)

**제안한 리스크 8건** → **4건 선택**:
- R4 YAML 파싱 실패
- R5 Rubric 주관성
- R7 A/B 순환 논리
- R8 Phase Exit deadlock

**R6 (rawValue=0 근본원인) 처리**: **발견 시 F543으로 분리** (F542 중단 없이 병행)

---

## 인터뷰 종료

모든 Part 완료. PRD v1 생성 완료(`prd-v1.md`). 다음 단계: Phase 2 API 자동 검토.
