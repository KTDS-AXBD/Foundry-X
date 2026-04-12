<!-- CHANGED: 버전 번호 1 증가 -->
# Foundry-X TDD Workflow 도입 작업 계획서 (v2)

> **목적**: Anthropic 내부 TDD 패턴(Red→Green→Commit)을 Foundry-X에 체계적으로 도입
> **작성일**: 2026-04-12 | **대상 환경**: WSL + Claude Code
> **적용 시점**: 다음 Sprint(S262~)부터 F-item 신규 개발에 적용

---

## 1. 현황 요약

| 항목 | 현재 상태 |
|------|----------|
| 테스트 총 파일 수 | 514 (unit/integration) + 54 (E2E) |
| 프레임워크 | Vitest 3.x + Playwright 1.58 |
| 테스트 데이터 | make*() 팩토리 패턴 (test-data.ts, mock-factory.ts) |
| TDD 적용 | 부분적 — 체계적 강제 메커니즘 없음 |
| shared 패키지 | 테스트 0개 (타입 의존) |

**핵심 갭**: 테스트-먼저(test-first) 커밋 분리가 규칙화되지 않음. 구현과 테스트가 같은 커밋에 섞이는 경우가 다수.

<!-- CHANGED: shared 패키지 테스트 부재에 대한 개선 방안 및 향후 방침 명확화 -->
**shared 패키지 테스트 부재 이슈**: shared 패키지는 현재 타입 의존성만을 검증하며, 런타임 테스트가 존재하지 않음. 이는 타입스크립트 strict mode로도 런타임 오류를 완전히 방지할 수 없으므로, 향후 shared 패키지에 대해서도 최소한의 런타임 테스트 케이스(예: 타입 유효성 검증, 런타임 타입 체크, 주요 유틸 함수 smoke test)를 단계적으로 도입할 방침임. TDD 사이클의 필수 대상은 아니나, 신규 유틸 추가 시 "테스트 0개" 상태가 지속되지 않도록 관리한다.

---

## 2. 도입할 TDD 사이클: Red-Green-Commit

Anthropic이 Claude Code에서 권장하는 정확한 흐름:

```
┌─────────────────────────────────────────────────────┐
│  SPEC.md F-item 등록 (기존 SDD Triangle 유지)       │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ① Red: 테스트만 작성 (구현 코드 zero)              │
│     → vitest run --reporter=verbose 으로 FAIL 확인  │
│     → 만족하면 커밋: test(scope): F### red — ...    │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ② Green: 테스트 통과시키는 최소 구현               │
│     → 테스트 파일 수정 금지                          │
│     → vitest run 으로 PASS 확인                     │
│     → 커밋: feat(scope): F### green — ...           │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ③ Refactor (선택): 구현 정리, 테스트 여전히 PASS   │
│     → 커밋: refactor(scope): F### — ...             │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ④ PR → --auto --squash (기존 git-workflow 유지)    │
└─────────────────────────────────────────────────────┘
```

---

## 3. 작업 항목 (WSL Claude Code에서 실행)

### 작업 A: `.claude/rules/tdd-workflow.md` 신규 생성

아래 내용을 그대로 파일로 생성:

```markdown
# Foundry-X TDD Workflow

> Red-Green-Commit: Anthropic 권장 TDD 사이클

## 적용 범위

| 등급 | 대상 | TDD 적용 |
|------|------|---------|
| **필수** | 새 F-item 서비스 로직 (api), 새 E2E 시나리오 | Red→Green 풀 사이클 |
| **권장** | CLI UI 컴포넌트, Web 컴포넌트 | 가능하면 Red 먼저 |
| **선택** | D1 마이그레이션, 리팩토링, 버그픽스 | 회귀 테스트만 |
| **면제** | shared 타입, meta-only, docs | 해당 없음 |

<!-- CHANGED: shared 패키지에 대한 향후 테스트 방침 명시 -->
> **shared 패키지 방침**: shared는 타입 기반 개발을 전제로 하지만, 향후 신규 유틸 함수 또는 주요 타입 변환 로직에는 최소한의 런타임 테스트를 점진적으로 도입할 예정입니다. 기존 shared 전체에 대한 일괄 적용은 아니나, smoke test 수준의 커버리지 목표를 둡니다.

## Red Phase (테스트만 작성)
...
```

(이하 동일, 변경 없음)

---

### 작업 B: `testing.md` 에 TDD 섹션 추가

기존 내용 하단에 아래 추가:

```markdown
## TDD 사이클 (Red-Green-Commit)
- 신규 F-item 서비스 로직과 E2E 시나리오에 필수 적용
- 상세 절차: `.claude/rules/tdd-workflow.md` 참조
- Claude Code 지시 패턴:
  - Red: "TDD Red phase — 테스트만 작성, 구현 금지"
  - 확인: "구현하지 말고 테스트만 실행해서 실패 확인"
  - Green: "이 테스트를 통과시키는 코드 작성, 테스트 수정 금지"
```

---

### 작업 C: `sdd-triangle.md` 에 TDD 순서 원칙 추가

기존 "F-item 등록 선행 원칙" 뒤에 아래 추가:

```markdown
## TDD 순서 원칙
- SPEC 등록 → Red(테스트) → Green(구현) → Gap Analysis
- Spec↔Code↔Test 동기화의 **순서**를 명시: Test가 Code보다 먼저
- 상세: `.claude/rules/tdd-workflow.md`
```

---

## 4. 패키지별 TDD 구체적 사례

<!-- CHANGED: E2E 테스트의 Red Phase 한계 및 현실적 예외 처리에 대한 보완 -->
### 4-1. API 서비스 테스트 (필수 적용)

(동일, 변경 없음)

---

### 4-2. E2E 테스트 (필수 적용)

**시나리오**: `F510 — 초대 관리 페이지 E2E`

<!-- CHANGED: Playwright 기반 E2E에서 Red Phase의 "구현 zero" 한계 및 예외 처리 방침 명시 -->
> **E2E Red Phase 실현 한계**: Playwright E2E 테스트에서 mock/route 설정은 실제 구현 일부(네트워크 응답 스텁)를 포함할 수밖에 없음. "구현 zero" 원칙은 API/단위 테스트에 우선적으로 적용하되, E2E는 테스트 스텁/route 수준의 구현을 예외로 허용. 실제 페이지/컴포넌트/비즈니스 로직 구현은 금지함.

(예시 동일)

---

### 4-3. CLI UI 테스트 (권장 적용)

<!-- CHANGED: Ink-testing-library 환경의 신뢰성 한계 및 예외적 실패 검증 처리 보완 -->
> **Ink-testing-library 신뢰성 주의사항**: Ink-testing-library + Vitest 조합은 실제 터미널 렌더링과 일부 차이가 있을 수 있으므로, Red Phase의 실패 검증은 "논리상 실패" 위주로 판단. 환경 특성상 flaky test 발생시 수동 확인 및 임시 예외 인정.

(예시 동일)

---

## 5. 과적합 검증 패턴

(동일, 변경 없음)

---

## 6. 적용 등급 상세 가이드

<!-- CHANGED: shared 패키지의 향후 테스트 도입 방안 추가 -->
### 필수 (새 F-item 서비스 + E2E)

(동일)

### 권장 (CLI UI + Web 컴포넌트)

(동일)

### 선택 (버그픽스, 리팩토링)

(동일)

### 면제 (shared 타입, meta, docs)

**왜**: 런타임 로직이 없어서 TDD 대상이 아님.
shared는 TypeScript strict mode가 실질적 "테스트" 역할을 하지만, 신규 유틸/함수 등 런타임 부가 로직이 추가될 경우 smoke test 수준의 테스트를 점진적으로 도입한다.

---

## 7. Git Workflow 연동

<!-- CHANGED: 커밋/PR 규칙 미준수 및 예외(Hotfix 등) 처리 방침, Git Workflow와의 충돌 방지 방안 명문화 -->
기존 `git-workflow.md` 규칙과 충돌 없이 통합:

```
기존 흐름:
  feature 브랜치 → commit → push → gh pr create → --auto --squash

TDD 흐름 (브랜치 내부):
  feature 브랜치 → [Red 커밋] → [Green 커밋] → [Refactor 커밋] → push → PR

최종 결과:
  squash merge 되므로 master에는 1커밋
  but 브랜치 이력에 Red→Green 순서가 남아있어 나중에 참조 가능
```

**커밋 메시지 컨벤션:**

(동일)

<!-- CHANGED: Hotfix, legacy 대규모 변경 등 예외적 상황에 대한 처리 방침 추가 -->
**예외/Hotfix 정책**:
- **급한 Hotfix 혹은 Legacy 대규모 변경**의 경우, TDD 커밋 분리 원칙을 "권장"으로 완화할 수 있음. 반드시 PR 설명에 "TDD 예외(Hotfix/Legacy)" 사유와 테스트 커버리지 보장 방안을 명시.
- PR Reviewer가 예외 허용 여부를 검토함.
- TDD 커밋 분리 규칙 미준수 건은 Sprint 회고에서 별도 목록화하여 사유 및 개선 방안 논의.

---

## 8. 실행 체크리스트

WSL Claude Code 세션에서 아래 순서대로 진행:

### Phase 1: 규칙 파일 생성 (meta-only → master 직접 push)

(동일)

### Phase 2: 첫 번째 F-item에서 실전 적용

(동일)

### Phase 3: 회고 및 조정 (2~3 Sprint 후)

<!-- CHANGED: 생산성 저하, Story Point 소화량, PR cycle time 등 정량적 성공/실패 기준 및 검증 항목 보완 -->
- Red 커밋이 실제로 분리되고 있는지 git log 검토
- 생산성에 부정적 영향이 있는 영역 → 등급 조정 (필수→권장 등)
- 과적합 검증이 실제로 유용한 피드백을 주는지 평가
- **Sprint별 Story Point 소화량 변화, PR cycle time, WIP 건수 등 주요 생산성 지표를 기존 평균 대비 ±10% 이내로 유지하는지 검증**
- **TDD 커밋 분리율, T-NN 계약 이행률(목표: 90% 이상), 테스트 커버리지(기존 대비 95% 이상 유지) 등 정량적 성공기준을 Sprint 회고에서 보고**

---

## 9. 요약: Claude Code에 주는 핵심 지시문

(동일)

---

## 10. 기존 `/tdd` 스킬 활용

(동일)

---

## 11. PDCA 연동: 단계별 영향 분석

(동일)

---

## 12. PDCA 연동 요약 매트릭스

(동일)

---

## 13. 실행 체크리스트 (PDCA 연동 포함, 최종)

(동일)

---

<!-- CHANGED: 성공기준(정량/정성), 예외상황(Hotfix 등), 생산성 지표, 적용 우선순위, 자동화 지원 도구 설계, 교육/온보딩 및 Change Management, 실행 후 검증 체계, Rollback/Fail-safe 등 리스크 관리 및 피드백 루프 관련 신규 섹션 대폭 추가 -->
## 14. 성공기준 및 성과 측정

### 정량적 성공기준

| 항목 | 측정 방법 | 목표 |
|------|----------|------|
| T-NN 테스트 계약 이행률 | Design/Analysis 문서 기준 | 90% 이상 |
| TDD 커밋 분리율 | 전체 F-item 중 Red→Green 커밋 분리 적용 비율 | 85% 이상 |
| Sprint별 Story Point 소화량 | 기존 3 Sprint 평균과 비교 | ±10% 이내 변화 |
| PR Cycle Time | PR 생성~Merge 평균 | 기존 대비 +10% 이내 |
| 테스트 커버리지 | vitest/Playwright 기준 | 기존 대비 95% 이상 유지 |

### 정성적 성공기준

- 개발자 설문(2 Sprint 후)에서 "TDD 사이클이 실제로 업무 효율과 품질에 기여" 문항에 4점(5점 만점) 이상
- 회고에서 "테스트-먼저 커밋 분리가 업무 혼란/지연을 유발하지 않는다" 피드백 다수 확보
- 주요 Hotfix/Legacy 작업에서 예외 적용이 무분별하게 확산되지 않음

---

## 15. Change Management, 교육 및 온보딩

- **도입 Kick-off 세션**: TDD 워크플로우/PDCA 연동/커밋 컨벤션 등 실습형 오리엔테이션 1회
- **.claude/rules/tdd-workflow.md** 등 규칙 문서화 및 팀별 공유 세션
- **신규 입사자 온보딩**: TDD 사이클, 예시, `/tdd` 스킬 활용법을 포함한 별도 온보딩 자료 제공
- **정기 FAQ/피드백 루프**: 월 1회 TDD 적용 Q&A 세션, FAQ 문서 최신화

---

## 16. 자동화 지원 도구 및 Fail-safe

- **PR Linter**: Red/Green 커밋 메시지 규칙, TDD 예외(PR 설명 필드) 자동 감지, 미준수 시 CI 경고
- **/tdd check 자동화**: Analyze 단계에서 미커버 함수/시나리오 자동 추출 보고 기능
- **T-NN/TDD Rule Dashboard**: Sprint별 T-NN 이행률, 커밋 분리율, PR 예외 사유 통계 시각화 대시보드
- **Rollback/Fail-safe**: TDD 적용 강제 시 대규모 장애/생산성 급감 발생시, PL/팀장이 Sprint 레벨에서 "TDD 일시 중단/완화" 선언 가능. 예외시 반드시 영향분석 및 회고에 사유 기록

---

## 17. 예외/롤백/Hotfix 정책

- **Hotfix/긴급패치/Legacy Refactoring**: TDD 커밋 분리 및 Red-먼저 원칙 "권장"으로 완화, PR 설명에 사유 필수
- **예외 승인 프로세스**: Reviewer/PL/팀장이 예외 승인, 별도 레이블 및 보고서에 이력화
- **예외/롤백 사례 추적**: Sprint 회고 때 예외/롤백 사례 목록화, 시스템적 개선(규칙/자동화/교육) 피드백

---

## 18. 적용 범위/우선순위 명확화

- **적용 1순위**: 신규 F-item 서비스 로직, 신규 E2E 시나리오(§6 "필수" 대상)
- **적용 2순위**: 신규 CLI UI/Web 컴포넌트(§6 "권장" 대상)
- **적용 유보/면제**: shared 패키지 전면, meta-only, docs, 기존 코드 리팩토링
- **적용 제외(Out-of-scope)**: 
    - 대규모 Legacy 시스템 일괄 변경
    - 외부 벤더/패키지 연동 코드
    - Playwright, Ink 등 테스트 환경의 구조적 한계로 Red-먼저 원칙 적용 불가 영역

---

## 19. 리스크 및 대응 방안

### 주요 리스크 및 대응

| 리스크 | 대응 방안 |
|--------|----------|
| 팀/조직 저항, 생산성 저하 | 단계적 적용 등급(필수/권장/선택/면제) 운영, Sprint별 성과/피드백 루프, 예외/완화 정책 명시 |
| 커밋/PR 규칙 미준수 | PR linter, Reviewer 검증, 예외/회고 이력화 |
| shared 패키지 테스트 부재 | 신규 유틸/함수부터 smoke test 방식 점진 도입, TDD 강제 대상 아님 명시 |
| E2E/컴포넌트 환경 Red phase 한계 | 원칙적용 불가영역 Out-of-scope 명시, 논리상 Red-먼저/FAIL 확인만 요구 |
| 동시성/상태 관리 테스트 누락 | Design 단계의 "테스트 계약" 테이블에 edge case/동시성/에러 경로 명시 강제 |
| 테스트 데이터 관리 복잡도 | make*() 팩토리 패턴 표준화, 예시/도구화 문서 추가 |
| 자동화 도구 부재 | PR linter, /tdd check, T-NN Dashboard 등 자동화 우선 도입 |
| 기존 코드와 신규 코드 혼재 | 신규 F-item/시나리오 우선, 기존 코드는 회귀 테스트/버그 재현 케이스만 추가 |
| 테스트 품질의 형식화(무의미한 assertion, 과적합 검증 형식화) | 과적합 검증 프롬프트, Reviewers의 assertion 의미 검토, Sprint 회고 품질 피드백 |
| Git Workflow와의 충돌 | squash merge로 master 이력 단순화, feature branch에는 Red→Green 순서 보존 |
| 규칙 파일 분산/복잡 | .claude/rules/tdd-workflow.md에 정책 통합, 각 파일 참조 명확화 |

---

## 20. 성과 측정 및 피드백 루프

- **Sprint별 T-NN/TDD 커밋 분리율, Story Point, PR cycle time** 등 성과 대시보드 운영
- **월간/분기별 회고**: 성공/실패사례, 예외 처리, 자동화 도구 개선점 피드백
- **교육/온보딩 개선**: 신규 입사자/팀원 설문/회고 반영, FAQ/규칙 문서 최신화
- **Stakeholder Alignment 정례화**: PL/팀장/QA/DevOps 등과 월 1회 TDD 적용 현황 공유, 이견/저항/피드백 즉시 반영

---

## 21. Out-of-scope

<!-- CHANGED: Out-of-scope 항목 신규 명시 -->
- 대규모 Legacy 시스템 일괄 변경(전체 TDD 강제 적용 아님)
- 외부 벤더/패키지 연동 코드(외부 라이브러리 API 등)
- Playwright, Ink 등 테스트 환경 구조적 한계로 Red-먼저/구현 zero 원칙 적용 불가한 테스트
- shared 패키지 전면(신규 유틸/함수 smoke test만 점진 도입)
- 기존 코드 리팩토링(회귀 테스트만 요구)

---

<!-- CHANGED: 주요 리스크와 Out-of-scope에 대한 보완, 교육/자동화/피드백/예외/성과 기준 등 결함 및 누락사항 전반 보완 완료 -->