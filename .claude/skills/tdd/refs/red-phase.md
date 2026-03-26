# RED Phase — 실패하는 테스트 먼저 작성

> "테스트가 실패하지 않으면, 아직 테스트를 작성하지 않은 것이다."

## 원칙

1. **테스트 먼저**: 구현 코드를 작성하기 전에 테스트를 먼저 작성한다
2. **실패 확인 필수**: 새 테스트는 반드시 실패해야 한다 — 실패하지 않는 테스트는 가치가 없다
3. **한 번에 하나**: 한 함수씩 테스트를 작성하고 실패를 확인한다

## 테스트 작성 규칙

### 1. 대상 분석

대상 파일을 읽고 아래를 추출한다:

```
- export된 함수 목록
- 함수 시그니처 (매개변수 타입, 반환 타입)
- 함수가 의존하는 외부 모듈 (mock 대상)
```

### 2. 테스트 케이스 분류

각 함수에 대해 최소 3가지 케이스:

| 분류 | 설명 | 예시 |
|------|------|------|
| **Happy path** | 정상 입력 → 기대 결과 | `createUser({name: "Kim"}) → {id: 1, name: "Kim"}` |
| **Edge case** | 경계값, 빈 입력, 극단값 | `createUser({name: ""}) → 기본값` 또는 에러 |
| **Error case** | 잘못된 입력, 예외 상황 | `createUser(null) → throws ValidationError` |

### 3. 테스트 파일 위치

```
소스: packages/api/src/services/foo.ts
테스트: packages/api/src/services/__tests__/foo.test.ts

소스: packages/cli/src/harness/bar.ts
테스트: packages/cli/src/harness/__tests__/bar.test.ts
```

### 4. 테스트 템플릿

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 대상 import
import { targetFunction } from '../target-file';

describe('targetFunction', () => {
  // Happy path
  it('유효 입력 → 기대 결과를 반환한다', () => {
    const result = targetFunction(validInput);
    expect(result).toEqual(expectedOutput);
  });

  // Edge case
  it('빈 입력 → 기본값을 반환한다', () => {
    const result = targetFunction('');
    expect(result).toEqual(defaultValue);
  });

  // Error case
  it('잘못된 입력 → 에러를 throw한다', () => {
    expect(() => targetFunction(invalidInput)).toThrow();
  });
});
```

### 5. API 서비스 테스트 패턴 (packages/api/)

```typescript
import { describe, it, expect } from 'vitest';
import { createTestApp } from '../../test-helpers';

describe('POST /api/resource', () => {
  it('201: 유효 요청 → 리소스 생성', async () => {
    const app = await createTestApp();
    const res = await app.request('/api/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('test');
  });

  it('400: 필수 필드 누락 → 에러', async () => {
    const app = await createTestApp();
    const res = await app.request('/api/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
```

### 6. 실패 확인

테스트 작성 후 반드시 실행:

```bash
pnpm test -- --grep "{테스트파일명}"
```

- **실패하면**: 정상 — GREEN 단계로 진행
- **통과하면**: 테스트가 충분히 엄격하지 않음 → 아래 조치:
  - 이미 구현된 함수라면: 더 엄격한 엣지케이스 추가
  - mock이 실제 동작을 우회하고 있다면: mock 범위 축소
  - assertion이 느슨하다면: 구체적인 값 비교로 변경

## 체크리스트

- [ ] 모든 export 함수에 테스트 존재
- [ ] 각 함수별 최소 happy + edge + error 3가지
- [ ] 테스트 파일이 `__tests__/` 디렉토리에 위치
- [ ] `pnpm test` 실행 시 새 테스트 실패 확인
- [ ] 기존 테스트는 여전히 통과
