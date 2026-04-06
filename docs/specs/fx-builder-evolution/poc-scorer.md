# 5차원 평가 재현성 PoC 결과 (F385)

> 측정 시각: (실행 후 자동 기록)
> 대상: 기존 프로토타입 코드

---

## 1. 5차원 스코어러 구성

| 차원 | 가중치 | 평가 방법 | 비용 |
|------|:------:|-----------|:----:|
| build | 20% | `vite build` 성공 + warning 감점 | $0 |
| ui | 25% | DOM 구조 분석 (태그 다양성/시맨틱/접근성) | $0 |
| functional | 20% | 정적 분석 (핸들러/hooks/라우팅) | $0 |
| prd | 25% | 키워드 매칭 (PoC) / LLM 비교 (M1) | $0 (PoC) |
| code | 10% | ESLint + TypeScript 에러 수 | $0 |

---

## 2. 단일 평가 결과

**총점: (측정 대기)/100**

| 차원 | 점수 | 가중 점수 | 상세 |
|------|:----:|:--------:|------|
| build | — | — | — |
| ui | — | — | — |
| functional | — | — | — |
| prd | — | — | — |
| code | — | — | — |

---

## 3. 재현성 측정

| 항목 | 값 |
|------|-----|
| 실행 횟수 | 3 |
| 점수 | (측정 대기) |
| 평균 | — |
| 표준편차 | — |
| 최대 편차 | — |
| **판정** | **(측정 대기)** (±10점 기준) |

---

## 4. 실행 방법

```bash
# prototype-builder 디렉토리에서, 프로토타입 코드가 있는 workDir 지정
npx tsx -e "
import { evaluateQuality, measureReproducibility, formatScorerPocReport } from './src/scorer.js';
import fs from 'node:fs';

const job = {
  id: 'poc-test',
  projectId: 'foundry-x',
  name: 'Self-Evolving Harness',
  prdContent: fs.readFileSync('../docs/specs/fx-harness-evolution/prd-final.md', 'utf-8'),
  feedbackContent: null,
  workDir: '/path/to/proto-self-evolving-harness-v2',
  round: 0,
};

const score = await evaluateQuality(job, job.workDir, { skipBuild: true });
const repro = await measureReproducibility(job, job.workDir, 3);
fs.writeFileSync(
  'docs/specs/fx-builder-evolution/poc-scorer.md',
  formatScorerPocReport(score, repro),
);
console.log('Scorer PoC report written.');
"
```

---

## 5. PoC 통과 기준 (Plan §8)

| 기준 | 목표 | 결과 | 판정 |
|------|------|------|:----:|
| 재현성 | ±10점 이내 | (측정 대기) | — |
| 5차원 분리 | 차원별 독립 점수 | 5개 차원 구현 완료 | PASS |

---

## 6. 다음 단계

- **PASS**: M1(Sprint 176)에서 prdScore LLM 통합 + D1 저장 본구현
- **FAIL**: prdScore를 키워드 매칭 고정, 빌드+정적분석 3차원 축소 검토

---

## 코드 위치

- 스코어러: `prototype-builder/src/scorer.ts`
- 타입: `QualityScore`, `DimensionScore`, `ScoreDimension`, `TargetFeedback`
- 가중치: `DIMENSION_WEIGHTS` (types.ts)
- 재현성 측정: `measureReproducibility()` (scorer.ts)
- 피드백 생성: `generateTargetFeedback()` (scorer.ts)
- 테스트: `prototype-builder/src/__tests__/scorer.test.ts`
