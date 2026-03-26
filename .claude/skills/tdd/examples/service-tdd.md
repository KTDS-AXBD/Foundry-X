# TDD 예시: API 서비스

> Foundry-X `packages/api/` 서비스 파일에 대한 TDD 사이클 예시.

## 대상: `packages/api/src/services/bookmark.ts`

```typescript
// 구현할 서비스 인터페이스 (아직 미구현)
export function createBookmark(db: D1Database, data: { userId: string; itemId: string; note?: string }): Promise<Bookmark>;
export function getBookmarks(db: D1Database, userId: string): Promise<Bookmark[]>;
export function deleteBookmark(db: D1Database, id: string): Promise<void>;
```

---

## RED 단계

### 테스트 파일: `packages/api/src/services/__tests__/bookmark.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb } from '../../test-helpers';
import { createBookmark, getBookmarks, deleteBookmark } from '../bookmark';

describe('bookmark service', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = await getTestDb();
    // 테스트 유저 + 아이템 시드
    await db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').bind('u1', 'test@test.com').run();
    await db.prepare('INSERT INTO items (id, title) VALUES (?, ?)').bind('i1', 'Test Item').run();
  });

  describe('createBookmark', () => {
    it('유효 데이터 → 북마크 생성', async () => {
      const result = await createBookmark(db, { userId: 'u1', itemId: 'i1', note: 'memo' });
      expect(result).toMatchObject({ userId: 'u1', itemId: 'i1', note: 'memo' });
      expect(result.id).toBeDefined();
    });

    it('note 없이 → 북마크 생성 (note null)', async () => {
      const result = await createBookmark(db, { userId: 'u1', itemId: 'i1' });
      expect(result.note).toBeNull();
    });

    it('존재하지 않는 userId → 에러', async () => {
      await expect(
        createBookmark(db, { userId: 'invalid', itemId: 'i1' })
      ).rejects.toThrow();
    });
  });

  describe('getBookmarks', () => {
    it('북마크 존재 → 목록 반환', async () => {
      await createBookmark(db, { userId: 'u1', itemId: 'i1' });
      const result = await getBookmarks(db, 'u1');
      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('i1');
    });

    it('북마크 없음 → 빈 배열', async () => {
      const result = await getBookmarks(db, 'u1');
      expect(result).toEqual([]);
    });
  });

  describe('deleteBookmark', () => {
    it('존재하는 북마크 → 삭제 성공', async () => {
      const bm = await createBookmark(db, { userId: 'u1', itemId: 'i1' });
      await deleteBookmark(db, bm.id);
      const result = await getBookmarks(db, 'u1');
      expect(result).toHaveLength(0);
    });

    it('존재하지 않는 ID → 에러 없음 (idempotent)', async () => {
      await expect(deleteBookmark(db, 'nonexistent')).resolves.not.toThrow();
    });
  });
});
```

### 실행 결과 (예상)

```bash
$ pnpm test -- --grep "bookmark"

 FAIL  src/services/__tests__/bookmark.test.ts
  ✗ createBookmark > 유효 데이터 → 북마크 생성
    Error: createBookmark is not a function
  ✗ getBookmarks > 북마크 존재 → 목록 반환
    Error: getBookmarks is not a function
  ...

Tests: 6 failed, 0 passed
```

→ 모든 테스트 실패 확인. GREEN 단계로 진행.

---

## GREEN 단계

### 최소 구현: `packages/api/src/services/bookmark.ts`

```typescript
import { nanoid } from 'nanoid';

export interface Bookmark {
  id: string;
  userId: string;
  itemId: string;
  note: string | null;
  createdAt: string;
}

export async function createBookmark(
  db: D1Database,
  data: { userId: string; itemId: string; note?: string }
): Promise<Bookmark> {
  const id = nanoid();
  const now = new Date().toISOString();
  await db.prepare(
    'INSERT INTO bookmarks (id, user_id, item_id, note, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, data.userId, data.itemId, data.note ?? null, now).run();

  return { id, userId: data.userId, itemId: data.itemId, note: data.note ?? null, createdAt: now };
}

export async function getBookmarks(db: D1Database, userId: string): Promise<Bookmark[]> {
  const { results } = await db.prepare(
    'SELECT id, user_id as userId, item_id as itemId, note, created_at as createdAt FROM bookmarks WHERE user_id = ?'
  ).bind(userId).all();

  return (results ?? []) as unknown as Bookmark[];
}

export async function deleteBookmark(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run();
}
```

### 실행 결과

```bash
$ pnpm test -- --grep "bookmark"

 PASS  src/services/__tests__/bookmark.test.ts
  ✓ createBookmark > 유효 데이터 → 북마크 생성
  ✓ createBookmark > note 없이 → 북마크 생성
  ✓ createBookmark > 존재하지 않는 userId → 에러
  ✓ getBookmarks > 북마크 존재 → 목록 반환
  ✓ getBookmarks > 북마크 없음 → 빈 배열
  ✓ deleteBookmark > 존재하는 북마크 → 삭제 성공
  ✓ deleteBookmark > 존재하지 않는 ID → 에러 없음

Tests: 7 passed
```

→ 전체 통과. REFACTOR 단계로 진행.

---

## REFACTOR 단계

개선 사항:

1. `nanoid` → 프로젝트 공통 `generateId()` 유틸리티 사용
2. SQL 쿼리 → prepared statement 상수로 추출
3. 반환 타입 매핑 → `mapRow()` 헬퍼 함수

```typescript
// 리팩토링 후
const QUERIES = {
  insert: 'INSERT INTO bookmarks (id, user_id, item_id, note, created_at) VALUES (?, ?, ?, ?, ?)',
  selectByUser: 'SELECT id, user_id, item_id, note, created_at FROM bookmarks WHERE user_id = ?',
  deleteById: 'DELETE FROM bookmarks WHERE id = ?',
} as const;

function mapRow(row: Record<string, unknown>): Bookmark {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    itemId: row.item_id as string,
    note: (row.note as string) ?? null,
    createdAt: row.created_at as string,
  };
}
```

→ `pnpm test` + `pnpm typecheck` + `pnpm lint` 전부 통과 확인.

---

## 요약

| 단계 | 산출물 | 검증 |
|------|--------|------|
| RED | `__tests__/bookmark.test.ts` (7 테스트) | 7 FAIL |
| GREEN | `bookmark.ts` (최소 구현) | 7 PASS |
| REFACTOR | `bookmark.ts` (개선) | 7 PASS + typecheck + lint |
