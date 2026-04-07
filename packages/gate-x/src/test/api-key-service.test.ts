import { describe, it, expect, vi } from "vitest";
import { ApiKeyService } from "../services/api-key-service.js";

interface StmtMock {
  bind: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
}

function makeDb(stmtOverrides?: Partial<StmtMock>) {
  const runResult = { meta: { changes: 1 } };
  const stmtMock: StmtMock = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue(runResult),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    ...stmtOverrides,
  };
  const prepare = vi.fn().mockReturnValue(stmtMock);
  return {
    db: { prepare } as unknown as D1Database,
    stmt: stmtMock,
  };
}

describe("ApiKeyService", () => {
  describe("create", () => {
    it("발급 시 key와 record를 반환해야 해요", async () => {
      const { db } = makeDb();
      const svc = new ApiKeyService(db);
      const { key, record } = await svc.create(
        "org-1",
        "Test Key",
        "member",
        "user-1",
      );

      expect(key).toMatch(/^gx_[0-9a-f]{64}$/);
      expect(record.orgId).toBe("org-1");
      expect(record.name).toBe("Test Key");
      expect(record.role).toBe("member");
      expect(record.keyPrefix).toBe(key.slice(0, 8));
      expect(record.revokedAt).toBeNull();
    });

    it("INSERT 쿼리를 실행해야 해요", async () => {
      const { db } = makeDb();
      const svc = new ApiKeyService(db);
      await svc.create("org-1", "Key", "admin", "user-1");
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO api_keys"),
      );
    });
  });

  describe("verify", () => {
    it("존재하지 않는 키는 null을 반환해야 해요", async () => {
      const { db } = makeDb();
      const svc = new ApiKeyService(db);
      const result = await svc.verify("gx_invalid");
      expect(result).toBeNull();
    });

    it("유효한 키는 ApiKey 객체를 반환해야 해요", async () => {
      const mockRow = {
        id: "key-id",
        org_id: "org-1",
        name: "Test",
        key_prefix: "gx_abcde",
        role: "member",
        scopes: "[]",
        last_used_at: null,
        expires_at: null,
        created_by: "user-1",
        created_at: new Date().toISOString(),
        revoked_at: null,
      };

      const { db } = makeDb({
        first: vi.fn().mockResolvedValue(mockRow),
      });
      const svc = new ApiKeyService(db);

      // rawKey를 넣어도 내부에서 SHA-256 해싱 후 DB 조회
      const result = await svc.verify("gx_somerawkey");
      expect(result).not.toBeNull();
      expect(result?.orgId).toBe("org-1");
      expect(result?.role).toBe("member");
      expect(result?.scopes).toEqual([]);
    });

    it("만료된 키는 null을 반환해야 해요", async () => {
      const mockRow = {
        id: "key-id",
        org_id: "org-1",
        name: "Expired Key",
        key_prefix: "gx_abcde",
        role: "member",
        scopes: "[]",
        last_used_at: null,
        expires_at: "2020-01-01T00:00:00.000Z", // 과거
        created_by: "user-1",
        created_at: new Date().toISOString(),
        revoked_at: null,
      };

      const { db } = makeDb({
        first: vi.fn().mockResolvedValue(mockRow),
      });
      const svc = new ApiKeyService(db);
      const result = await svc.verify("gx_expiredkey");
      expect(result).toBeNull();
    });
  });

  describe("list", () => {
    it("빈 목록을 반환해야 해요", async () => {
      const { db } = makeDb();
      const svc = new ApiKeyService(db);
      const keys = await svc.list("org-1");
      expect(keys).toEqual([]);
    });
  });

  describe("revoke", () => {
    it("폐기 쿼리를 실행해야 해요", async () => {
      const { db } = makeDb();
      const svc = new ApiKeyService(db);
      await svc.revoke("key-id", "org-1");
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE api_keys SET revoked_at"),
      );
    });
  });

  describe("recordUsage", () => {
    it("사용량 기록 쿼리를 실행해야 해요", async () => {
      const { db } = makeDb();
      const svc = new ApiKeyService(db);
      await svc.recordUsage("key-id", "/api/gate/decisions", 200);
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO api_key_usage"),
      );
    });
  });
});
