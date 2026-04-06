# CLI `--bare` PoC 결과 (F384)

> 측정 시각: (실행 후 자동 기록)
> CLI 경로: `claude`
> CLI 버전: (실행 후 자동 기록)

---

## 1. 요약

| 항목 | 결과 |
|------|------|
| CLI 가용 | (측정 대기) |
| 코드 생성 | (측정 대기) |
| 시간당 호출 가능 | (측정 대기) |
| 평균 응답 시간 | (측정 대기) |
| **판정** | **(측정 대기)** |
| 사유 | (측정 대기) |

---

## 2. 테스트 항목

| # | 테스트 | 내용 | 통과 기준 |
|---|--------|------|-----------|
| 1 | 기본 실행 | `claude --bare -p "Say hello" --max-turns 1` | 응답 수신 |
| 2 | 코드 생성 | React Counter 컴포넌트 생성 요청 | tsx 코드 블록 포함 |
| 3 | 반복 호출 | 10회 연속, 1초 간격 | 성공률 100% |
| 4 | Rate limit | 연속 호출 시 제한 발생 시점 | 시간당 10회+ |
| 5 | 장시간 | 30분 연속 (5분 간격 6회) | 전체 성공 |

---

## 3. 실행 방법

```bash
# prototype-builder 디렉토리에서
npx tsx -e "
import { runCliPoc, formatPocReport } from './src/cli-poc.js';
import fs from 'node:fs';
const report = await runCliPoc('claude', { rateLimitCalls: 10 });
fs.writeFileSync(
  'docs/specs/fx-builder-evolution/poc-cli.md',
  formatPocReport(report),
);
console.log('PoC report written.');
"
```

---

## 4. PoC 통과 기준 (Plan §8)

| 기준 | 목표 | 결과 | 판정 |
|------|------|------|:----:|
| CLI 코드 생성 | 동작 | (측정 대기) | — |
| 시간당 호출 | 10회+ | (측정 대기) | — |

---

## 5. 다음 단계

- **Go**: M2(Sprint 177)에서 CLI primary / API fallback 듀얼 모드 구현
- **Conditional**: 호출 간 딜레이 추가, API primary + CLI secondary 대안
- **No-go**: CLI 제거, API only + haiku 비용 최적화

---

## 코드 위치

- PoC 러너: `prototype-builder/src/cli-poc.ts`
- 타입: `CliPocReport`, `RateLimitResult`, `CliPocSummary`
- 테스트: `prototype-builder/src/__tests__/cli-poc.test.ts`
