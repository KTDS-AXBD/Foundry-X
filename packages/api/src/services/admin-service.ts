import { hashPassword } from "../utils/crypto.js";

interface BulkAccountInput {
  email: string;
  name: string;
  role: "admin" | "member" | "viewer";
}

interface BulkSignupDetail {
  email: string;
  status: "created" | "skipped" | "failed";
  tempPassword?: string;
  reason?: string;
}

interface BulkSignupResult {
  created: number;
  skipped: number;
  failed: number;
  details: BulkSignupDetail[];
}

export class AdminService {
  constructor(private db: D1Database) {}

  async bulkSignup(params: {
    orgId: string;
    accounts: BulkAccountInput[];
    defaultPassword?: string;
  }): Promise<BulkSignupResult> {
    const details: BulkSignupDetail[] = [];

    for (const account of params.accounts) {
      try {
        // Check if user already exists
        const existing = await this.db
          .prepare("SELECT id FROM users WHERE email = ?")
          .bind(account.email)
          .first<{ id: string }>();

        if (existing) {
          // Check if already a member of this org
          const member = await this.db
            .prepare("SELECT user_id FROM org_members WHERE org_id = ? AND user_id = ?")
            .bind(params.orgId, existing.id)
            .first();

          if (member) {
            details.push({ email: account.email, status: "skipped", reason: "already_member" });
          } else {
            // Add existing user to org
            await this.db
              .prepare("INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)")
              .bind(params.orgId, existing.id, account.role)
              .run();
            details.push({ email: account.email, status: "created", reason: "added_to_org" });
          }
          continue;
        }

        // Create new user
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const tempPassword = params.defaultPassword ?? generateTempPassword();
        const passwordHash = await hashPassword(tempPassword);

        await this.db
          .prepare(
            "INSERT INTO users (id, email, name, password_hash, role, auth_provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'email', ?, ?)",
          )
          .bind(id, account.email, account.name, passwordHash, account.role, now, now)
          .run();

        // Add to org
        await this.db
          .prepare("INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)")
          .bind(params.orgId, id, account.role)
          .run();

        details.push({ email: account.email, status: "created", tempPassword });
      } catch (err) {
        details.push({
          email: account.email,
          status: "failed",
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return {
      created: details.filter((d) => d.status === "created").length,
      skipped: details.filter((d) => d.status === "skipped").length,
      failed: details.filter((d) => d.status === "failed").length,
      details,
    };
  }
}

function generateTempPassword(): string {
  return crypto.randomUUID().slice(0, 12) + "!A1";
}
