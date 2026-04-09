/**
 * D1Database shim over better-sqlite3 for testing.
 * Implements the Cloudflare D1Database interface using an in-memory SQLite database.
 */
import Database from "better-sqlite3";

class MockD1PreparedStatement {
  private bindings: unknown[] = [];

  constructor(
    private db: Database.Database,
    private query: string,
  ) {}

  bind(...values: unknown[]): MockD1PreparedStatement {
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.query);
    const row = stmt.get(...this.bindings) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (colName) return (row[colName] as T) ?? null;
    return row as T;
  }

  async run() {
    const stmt = this.db.prepare(this.query);
    const info = stmt.run(...this.bindings);
    return {
      results: [] as unknown[],
      success: true,
      meta: {
        duration: 0,
        last_row_id: info.lastInsertRowid,
        changes: info.changes,
        served_by: "mock",
        internal_stats: null,
      },
    };
  }

  async all<T = Record<string, unknown>>() {
    const stmt = this.db.prepare(this.query);
    const rows = stmt.all(...this.bindings);
    return {
      results: rows as T[],
      success: true,
      meta: { duration: 0, served_by: "mock", internal_stats: null },
    };
  }

  async raw<T = unknown[]>() {
    const stmt = this.db.prepare(this.query);
    const rawStmt = stmt.raw();
    return rawStmt.all(...this.bindings) as T[];
  }
}

export class MockD1Database {
  private db: Database.Database;

  constructor() {
    this.db = new Database(":memory:");
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = OFF");
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        password_hash TEXT,
        auth_provider TEXT DEFAULT 'email',
        provider_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        repo_url TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        org_id TEXT DEFAULT '',
        last_sync_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS wiki_pages (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        file_path TEXT,
        ownership_marker TEXT NOT NULL DEFAULT 'human',
        updated_by TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS token_usage (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0,
        recorded_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        branch TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        progress REAL DEFAULT 0,
        current_task TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        jti TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        org_id TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS agent_capabilities (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        tools TEXT NOT NULL DEFAULT '[]',
        allowed_paths TEXT NOT NULL DEFAULT '[]',
        max_concurrency INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS agent_constraints (
        id TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        action TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        enforcement_mode TEXT NOT NULL DEFAULT 'block'
      );
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        agent_session_id TEXT NOT NULL,
        branch TEXT NOT NULL,
        pr_number INTEGER,
        pr_status TEXT NOT NULL DEFAULT 'draft',
        sdd_verified INTEGER NOT NULL DEFAULT 0,
        task_type TEXT,
        result TEXT,
        tokens_used INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        runner_type TEXT DEFAULT 'claude-api',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        server_url TEXT NOT NULL,
        transport_type TEXT NOT NULL DEFAULT 'sse' CHECK (transport_type IN ('sse', 'http')),
        org_id TEXT DEFAULT '',
        api_key_encrypted TEXT,
        status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
        last_connected_at TEXT,
        error_message TEXT,
        tools_cache TEXT,
        tools_cached_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
      CREATE TABLE IF NOT EXISTS agent_prs (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        task_id TEXT REFERENCES agent_tasks(id),
        repo TEXT NOT NULL,
        branch TEXT NOT NULL DEFAULT '',
        pr_number INTEGER,
        pr_url TEXT,
        status TEXT NOT NULL DEFAULT 'creating',
        review_agent_id TEXT,
        review_decision TEXT,
        sdd_score INTEGER,
        quality_score INTEGER,
        security_issues TEXT,
        merge_strategy TEXT DEFAULT 'squash',
        merged_at TEXT,
        commit_sha TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS mcp_sampling_log (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL REFERENCES mcp_servers(id),
        model TEXT NOT NULL,
        max_tokens INTEGER NOT NULL,
        tokens_used INTEGER,
        duration_ms INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS merge_queue (
        id TEXT PRIMARY KEY,
        pr_record_id TEXT NOT NULL,
        pr_number INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        position INTEGER NOT NULL,
        modified_files TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'queued',
        conflicts_with TEXT DEFAULT '[]',
        rebase_attempted INTEGER DEFAULT 0,
        rebase_succeeded INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        merged_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS parallel_executions (
        id TEXT PRIMARY KEY,
        task_ids TEXT NOT NULL DEFAULT '[]',
        agent_ids TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'running',
        total_tasks INTEGER NOT NULL,
        completed_tasks INTEGER NOT NULL DEFAULT 0,
        failed_tasks INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS spec_conflicts (
        id TEXT PRIMARY KEY,
        new_spec_title TEXT NOT NULL,
        existing_spec_id TEXT,
        conflict_type TEXT NOT NULL CHECK(conflict_type IN ('direct', 'dependency', 'priority', 'scope')),
        severity TEXT NOT NULL CHECK(severity IN ('critical', 'warning', 'info')),
        description TEXT NOT NULL,
        suggestion TEXT,
        resolution TEXT CHECK(resolution IN ('accept', 'reject', 'modify')),
        resolved_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL DEFAULT 'free',
        settings TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS org_members (
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (org_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS org_invitations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        accepted_at TEXT,
        invited_by TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_invitation_token ON org_invitations(token);
      CREATE INDEX IF NOT EXISTS idx_invitation_org ON org_invitations(org_id);
      CREATE INDEX IF NOT EXISTS idx_invitation_email ON org_invitations(email);

      CREATE TABLE IF NOT EXISTS agent_messages (
        id TEXT PRIMARY KEY,
        from_agent_id TEXT NOT NULL,
        to_agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        acknowledged INTEGER NOT NULL DEFAULT 0,
        parent_message_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        acknowledged_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON agent_messages(to_agent_id, acknowledged);
      CREATE INDEX IF NOT EXISTS idx_messages_thread ON agent_messages(parent_message_id);

      CREATE TABLE IF NOT EXISTS agent_plans (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        codebase_analysis TEXT NOT NULL DEFAULT '',
        proposed_steps TEXT NOT NULL DEFAULT '[]',
        estimated_files INTEGER DEFAULT 0,
        risks TEXT DEFAULT '[]',
        estimated_tokens INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'analyzing'
          CHECK(status IN ('analyzing','pending_approval','approved','modified','rejected','executing','completed','failed','cancelled')),
        human_feedback TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        approved_at TEXT,
        rejected_at TEXT,
        execution_status TEXT,
        execution_started_at TEXT,
        execution_completed_at TEXT,
        execution_result TEXT,
        execution_error TEXT,
        analysis_mode TEXT DEFAULT 'mock',
        analysis_model TEXT,
        analysis_tokens_used INTEGER,
        analysis_duration_ms INTEGER,
        file_context_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS agent_worktrees (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        branch TEXT NOT NULL,
        path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK(status IN ('active','merged','abandoned')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        merged_at TEXT
      );

      CREATE TABLE IF NOT EXISTS slack_notification_configs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('agent', 'pr', 'plan', 'queue', 'message')),
        webhook_url TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(org_id, category)
      );

      CREATE TABLE IF NOT EXISTS kpi_events (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK(event_type IN ('page_view', 'api_call', 'agent_task', 'cli_invoke', 'sdd_check')),
        user_id TEXT,
        agent_id TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES organizations(id)
      );
      CREATE INDEX IF NOT EXISTS idx_kpi_events_tenant_type
        ON kpi_events(tenant_id, event_type, created_at);

      CREATE TABLE IF NOT EXISTS onboarding_feedback (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        nps_score INTEGER NOT NULL CHECK(nps_score >= 1 AND nps_score <= 10),
        comment TEXT,
        page_path TEXT,
        session_seconds INTEGER,
        feedback_type TEXT DEFAULT 'nps',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES organizations(id)
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON onboarding_feedback(tenant_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS nps_surveys (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        dismissed_at TEXT,
        FOREIGN KEY (org_id) REFERENCES organizations(id)
      );
      CREATE INDEX IF NOT EXISTS idx_nps_surveys_user ON nps_surveys(org_id, user_id, triggered_at DESC);

      CREATE TABLE IF NOT EXISTS onboarding_progress (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        FOREIGN KEY (tenant_id) REFERENCES organizations(id),
        UNIQUE(tenant_id, user_id, step_id)
      );
      CREATE INDEX IF NOT EXISTS idx_progress_user ON onboarding_progress(tenant_id, user_id);

      -- 0084: shaping tables (F287)
      CREATE TABLE IF NOT EXISTS shaping_runs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        tenant_id TEXT NOT NULL,
        discovery_prd_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','escalated')),
        mode TEXT NOT NULL DEFAULT 'hitl' CHECK(mode IN ('hitl','auto')),
        current_phase TEXT NOT NULL DEFAULT 'A' CHECK(current_phase IN ('A','B','C','D','E','F')),
        total_iterations INTEGER NOT NULL DEFAULT 0,
        max_iterations INTEGER NOT NULL DEFAULT 3,
        quality_score REAL,
        token_cost INTEGER NOT NULL DEFAULT 0,
        token_limit INTEGER NOT NULL DEFAULT 500000,
        git_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_shaping_runs_tenant_status ON shaping_runs(tenant_id, status);

      CREATE TABLE IF NOT EXISTS shaping_phase_logs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        run_id TEXT NOT NULL,
        phase TEXT NOT NULL CHECK(phase IN ('A','B','C','D','E','F')),
        round INTEGER NOT NULL DEFAULT 0,
        input_snapshot TEXT,
        output_snapshot TEXT,
        verdict TEXT CHECK(verdict IN ('PASS','MINOR_FIX','MAJOR_ISSUE','ESCALATED')),
        quality_score REAL,
        findings TEXT,
        duration_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_shaping_phase_logs_run ON shaping_phase_logs(run_id, phase);

      CREATE TABLE IF NOT EXISTS shaping_expert_reviews (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        run_id TEXT NOT NULL,
        expert_role TEXT NOT NULL CHECK(expert_role IN ('TA','AA','CA','DA','QA')),
        review_body TEXT NOT NULL,
        findings TEXT,
        quality_score REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_shaping_expert_reviews_run ON shaping_expert_reviews(run_id);

      CREATE TABLE IF NOT EXISTS shaping_six_hats (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        run_id TEXT NOT NULL,
        hat_color TEXT NOT NULL CHECK(hat_color IN ('white','red','black','yellow','green','blue')),
        round INTEGER NOT NULL,
        opinion TEXT NOT NULL,
        verdict TEXT CHECK(verdict IN ('accept','concern','reject')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_shaping_six_hats_run ON shaping_six_hats(run_id, round);

      -- 0085: agent collection (F291)
      CREATE TABLE IF NOT EXISTS agent_collection_schedules (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        sources TEXT NOT NULL DEFAULT '["market","news","tech"]',
        keywords TEXT NOT NULL DEFAULT '[]',
        interval_hours INTEGER NOT NULL DEFAULT 6,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (org_id) REFERENCES organizations(id)
      );

      -- 0075: BD Artifacts (F260, F261)
      CREATE TABLE IF NOT EXISTS bd_artifacts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        biz_item_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        stage_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        input_text TEXT NOT NULL DEFAULT '',
        output_text TEXT,
        model TEXT NOT NULL DEFAULT 'test-model',
        tokens_used INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- 0090: discovery pipeline (F312, F313)
      CREATE TABLE IF NOT EXISTS discovery_pipeline_runs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        tenant_id TEXT NOT NULL,
        biz_item_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle'
          CHECK(status IN ('idle','discovery_running','discovery_complete','shaping_queued','shaping_running','shaping_complete','paused','failed','aborted')),
        current_step TEXT,
        discovery_start_at TEXT,
        discovery_end_at TEXT,
        shaping_run_id TEXT,
        trigger_mode TEXT NOT NULL DEFAULT 'manual',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        error_message TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_dpr_tenant_status ON discovery_pipeline_runs(tenant_id, status);

      CREATE TABLE IF NOT EXISTS pipeline_events (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        pipeline_run_id TEXT NOT NULL,
        event_type TEXT NOT NULL
          CHECK(event_type IN ('START','STEP_COMPLETE','STEP_FAILED','RETRY','SKIP','ABORT','PAUSE','RESUME','TRIGGER_SHAPING','SHAPING_PHASE_COMPLETE','COMPLETE')),
        from_status TEXT,
        to_status TEXT,
        step_id TEXT,
        payload TEXT,
        error_code TEXT,
        error_message TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pe_run ON pipeline_events(pipeline_run_id, created_at);

      -- 0091: pipeline checkpoints (F314)
      CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        pipeline_run_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        checkpoint_type TEXT NOT NULL DEFAULT 'viability'
          CHECK(checkpoint_type IN ('viability', 'commit_gate')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
        questions TEXT,
        response TEXT,
        decided_by TEXT,
        decided_at TEXT,
        approver_role TEXT,
        deadline TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pc_run ON pipeline_checkpoints(pipeline_run_id, step_id);
      CREATE INDEX IF NOT EXISTS idx_pc_status ON pipeline_checkpoints(status);

      -- 0092: pipeline monitoring (F315)
      CREATE TABLE IF NOT EXISTS pipeline_permissions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        pipeline_run_id TEXT NOT NULL,
        user_id TEXT,
        min_role TEXT NOT NULL DEFAULT 'member'
          CHECK(min_role IN ('viewer', 'member', 'admin', 'owner')),
        can_approve INTEGER NOT NULL DEFAULT 1,
        can_abort INTEGER NOT NULL DEFAULT 0,
        granted_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pp_run ON pipeline_permissions(pipeline_run_id);
      CREATE INDEX IF NOT EXISTS idx_pp_user ON pipeline_permissions(user_id);

      -- notifications stub for pipeline tests (F315)
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        org_id TEXT NOT NULL DEFAULT '',
        recipient_id TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT '',
        biz_item_id TEXT,
        title TEXT NOT NULL DEFAULT '',
        body TEXT,
        actor_id TEXT,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- tenant_members stub for pipeline tests (F315)
      CREATE TABLE IF NOT EXISTS tenant_members (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        tenant_id TEXT NOT NULL DEFAULT '',
        user_id TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- biz_items stub for pipeline tests (F315)
      CREATE TABLE IF NOT EXISTS biz_items (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        org_id TEXT,
        title TEXT NOT NULL DEFAULT '',
        description TEXT,
        source TEXT NOT NULL DEFAULT 'field',
        status TEXT NOT NULL DEFAULT 'draft',
        type TEXT NOT NULL DEFAULT 'idea',
        tenant_id TEXT,
        created_by TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS biz_item_classifications (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        biz_item_id TEXT NOT NULL UNIQUE,
        item_type TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.0,
        turn_1_answer TEXT,
        turn_2_answer TEXT,
        turn_3_answer TEXT,
        analysis_weights TEXT NOT NULL DEFAULT '{}',
        classified_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- bd_skills stub for SkillPipelineRunner tests
      CREATE TABLE IF NOT EXISTS bd_skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        stage_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        sort_order INTEGER NOT NULL DEFAULT 0,
        org_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- biz_item_discovery_stages stub for SkillPipelineRunner tests
      CREATE TABLE IF NOT EXISTS biz_item_discovery_stages (
        id TEXT PRIMARY KEY,
        biz_item_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS agent_collection_runs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        schedule_id TEXT,
        source TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        items_found INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (org_id) REFERENCES organizations(id)
      );

      -- 0093: backup_metadata (F317)
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        tenant_id TEXT NOT NULL,
        backup_type TEXT NOT NULL DEFAULT 'manual'
          CHECK(backup_type IN ('manual', 'auto', 'pre_deploy')),
        scope TEXT NOT NULL DEFAULT 'full'
          CHECK(scope IN ('full', 'item')),
        biz_item_id TEXT,
        tables_included TEXT NOT NULL,
        item_count INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        payload TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_bm_tenant ON backup_metadata(tenant_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_bm_type ON backup_metadata(backup_type);

      CREATE TABLE IF NOT EXISTS feedback_queue (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        github_issue_number INTEGER NOT NULL,
        github_issue_url TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        labels TEXT NOT NULL DEFAULT '[]',
        screenshot_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending','processing','done','failed','skipped')),
        agent_pr_url TEXT,
        agent_log TEXT,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_queue_status ON feedback_queue(status);
      CREATE INDEX IF NOT EXISTS idx_feedback_queue_org ON feedback_queue(org_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_queue_issue ON feedback_queue(org_id, github_issue_number);

      CREATE TABLE IF NOT EXISTS ax_discovery_reports (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        org_id TEXT NOT NULL,
        item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
        report_json TEXT NOT NULL DEFAULT '{}',
        overall_verdict TEXT DEFAULT NULL
          CHECK(overall_verdict IN ('Go', 'Conditional', 'NoGo')),
        team_decision TEXT DEFAULT NULL
          CHECK(team_decision IN ('Go', 'Hold', 'Drop')),
        shared_token TEXT,
        report_html TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_adr_item ON ax_discovery_reports(item_id);
      CREATE INDEX IF NOT EXISTS idx_adr_org ON ax_discovery_reports(org_id);
      CREATE INDEX IF NOT EXISTS idx_adr_shared ON ax_discovery_reports(shared_token);

      CREATE TABLE IF NOT EXISTS ax_persona_configs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        item_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        persona_name TEXT NOT NULL DEFAULT '',
        persona_role TEXT NOT NULL DEFAULT '',
        weights TEXT NOT NULL DEFAULT '{}',
        context_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_id, persona_id)
      );
      CREATE INDEX IF NOT EXISTS idx_persona_configs_item ON ax_persona_configs(item_id);

      CREATE TABLE IF NOT EXISTS ax_persona_evals (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        item_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        scores TEXT NOT NULL DEFAULT '{}',
        verdict TEXT NOT NULL DEFAULT 'pending',
        summary TEXT,
        concern TEXT,
        condition TEXT,
        eval_model TEXT,
        eval_duration_ms INTEGER,
        eval_cost_usd REAL,
        eval_metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_id, persona_id)
      );
      CREATE INDEX IF NOT EXISTS idx_persona_evals_item ON ax_persona_evals(item_id);

      CREATE TABLE IF NOT EXISTS ax_team_reviews (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        org_id TEXT NOT NULL,
        item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
        reviewer_id TEXT NOT NULL,
        reviewer_name TEXT NOT NULL DEFAULT '',
        decision TEXT NOT NULL CHECK(decision IN ('Go', 'Hold', 'Drop')),
        comment TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_id, reviewer_id)
      );
      CREATE INDEX IF NOT EXISTS idx_atr_item ON ax_team_reviews(item_id);
      CREATE INDEX IF NOT EXISTS idx_atr_org ON ax_team_reviews(org_id);

      -- 0110: Offerings Pipeline (F369, Sprint 167)
      CREATE TABLE IF NOT EXISTS offerings (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        biz_item_id TEXT NOT NULL,
        title TEXT NOT NULL,
        purpose TEXT NOT NULL CHECK(purpose IN ('report','proposal','review')),
        format TEXT NOT NULL CHECK(format IN ('html','pptx')),
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK(status IN ('draft','generating','review','approved','shared')),
        current_version INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
      );
      CREATE INDEX IF NOT EXISTS idx_offerings_org_status ON offerings(org_id, status);
      CREATE INDEX IF NOT EXISTS idx_offerings_biz_item ON offerings(biz_item_id);

      CREATE TABLE IF NOT EXISTS offering_versions (
        id TEXT PRIMARY KEY,
        offering_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        snapshot TEXT,
        change_summary TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(offering_id, version),
        FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_offering_versions_offering ON offering_versions(offering_id, version);

      CREATE TABLE IF NOT EXISTS offering_sections (
        id TEXT PRIMARY KEY,
        offering_id TEXT NOT NULL,
        section_key TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        sort_order INTEGER NOT NULL,
        is_required INTEGER NOT NULL DEFAULT 1,
        is_included INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(offering_id, section_key),
        FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_offering_sections_offering ON offering_sections(offering_id, sort_order);

      CREATE TABLE IF NOT EXISTS offering_design_tokens (
        id TEXT PRIMARY KEY,
        offering_id TEXT NOT NULL,
        token_key TEXT NOT NULL,
        token_value TEXT NOT NULL,
        token_category TEXT NOT NULL CHECK(token_category IN ('color','typography','layout','spacing')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(offering_id, token_key),
        FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_offering_design_tokens_offering ON offering_design_tokens(offering_id, token_category);

      CREATE TABLE IF NOT EXISTS offering_validations (
        id TEXT PRIMARY KEY,
        offering_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'full' CHECK(mode IN ('full','quick')),
        status TEXT NOT NULL DEFAULT 'running'
          CHECK(status IN ('running','passed','failed','error')),
        ogd_run_id TEXT,
        gan_score REAL,
        gan_feedback TEXT,
        sixhats_summary TEXT,
        expert_summary TEXT,
        overall_score REAL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_offering_validations_offering
        ON offering_validations(offering_id, created_at DESC);

      -- 0043: Prototypes (F181)
      CREATE TABLE IF NOT EXISTS prototypes (
        id TEXT PRIMARY KEY,
        biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
        version INTEGER NOT NULL DEFAULT 1,
        format TEXT NOT NULL DEFAULT 'html',
        content TEXT NOT NULL,
        template_used TEXT,
        model_used TEXT,
        tokens_used INTEGER DEFAULT 0,
        generated_at TEXT NOT NULL,
        UNIQUE(biz_item_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_prototypes_biz_item ON prototypes(biz_item_id);

      -- 0113: Offering → Prototype 연동 (F382)
      CREATE TABLE IF NOT EXISTS offering_prototypes (
        id TEXT PRIMARY KEY,
        offering_id TEXT NOT NULL,
        prototype_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(offering_id, prototype_id),
        FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE,
        FOREIGN KEY (prototype_id) REFERENCES prototypes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_offering_prototypes_offering ON offering_prototypes(offering_id);

      -- 0042: Business plan drafts (F180)
      CREATE TABLE IF NOT EXISTS business_plan_drafts (
        id               TEXT PRIMARY KEY,
        biz_item_id      TEXT NOT NULL,
        version          INTEGER NOT NULL DEFAULT 1,
        content          TEXT NOT NULL DEFAULT '',
        sections_snapshot TEXT,
        model_used       TEXT,
        tokens_used      INTEGER NOT NULL DEFAULT 0,
        generated_at     TEXT NOT NULL,
        UNIQUE(biz_item_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_business_plan_drafts_biz_item ON business_plan_drafts(biz_item_id);

      -- 0117: Business plan editor + templates (F444+F445)
      CREATE TABLE IF NOT EXISTS business_plan_sections (
        id          TEXT PRIMARY KEY,
        draft_id    TEXT NOT NULL,
        biz_item_id TEXT NOT NULL,
        section_num INTEGER NOT NULL,
        content     TEXT NOT NULL DEFAULT '',
        updated_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bp_sections_draft ON business_plan_sections(draft_id);
      CREATE INDEX IF NOT EXISTS idx_bp_sections_item  ON business_plan_sections(biz_item_id);

      CREATE TABLE IF NOT EXISTS plan_templates (
        id            TEXT PRIMARY KEY,
        org_id        TEXT NOT NULL,
        name          TEXT NOT NULL,
        template_type TEXT NOT NULL,
        tone          TEXT NOT NULL DEFAULT 'formal',
        length        TEXT NOT NULL DEFAULT 'medium',
        sections_json TEXT NOT NULL DEFAULT '[]',
        created_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_plan_templates_org ON plan_templates(org_id);

      -- 0116: Billing — subscription plans + tenant subscriptions + usage records (F411)
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id           TEXT    PRIMARY KEY,
        name         TEXT    NOT NULL,
        monthly_limit INTEGER NOT NULL,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO subscription_plans (id, name, monthly_limit) VALUES
        ('free',       'Free',       1000),
        ('pro',        'Pro',        50000),
        ('enterprise', 'Enterprise', -1);

      CREATE TABLE IF NOT EXISTS tenant_subscriptions (
        org_id     TEXT NOT NULL PRIMARY KEY,
        plan_id    TEXT NOT NULL DEFAULT 'free',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS usage_records (
        org_id     TEXT    NOT NULL,
        month      TEXT    NOT NULL,
        api_calls  INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (org_id, month)
      );
      CREATE INDEX IF NOT EXISTS idx_usage_records_org ON usage_records (org_id, month);

      -- 0037: biz_generated_prds (PRD 자동 생성)
      -- 0121: status 컬럼 추가 (Sprint 221 F456)
      CREATE TABLE IF NOT EXISTS biz_generated_prds (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        biz_item_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'draft',
        content TEXT NOT NULL,
        criteria_snapshot TEXT,
        generated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        source_type TEXT NOT NULL DEFAULT 'discovery',
        bp_draft_id TEXT,
        UNIQUE(biz_item_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_generated_prds_item ON biz_generated_prds(biz_item_id);
      CREATE INDEX IF NOT EXISTS idx_generated_prds_status ON biz_generated_prds(biz_item_id, status);

      -- 0120: PRD Interviews (Sprint 220 F455)
      CREATE TABLE IF NOT EXISTS prd_interviews (
        id             TEXT PRIMARY KEY,
        biz_item_id    TEXT NOT NULL,
        prd_id         TEXT NOT NULL,
        status         TEXT NOT NULL DEFAULT 'in_progress',
        question_count INTEGER NOT NULL DEFAULT 0,
        answered_count INTEGER NOT NULL DEFAULT 0,
        started_at     INTEGER NOT NULL DEFAULT (unixepoch()),
        completed_at   INTEGER
      );

      CREATE TABLE IF NOT EXISTS prd_interview_qas (
        id                TEXT PRIMARY KEY,
        interview_id      TEXT NOT NULL,
        seq               INTEGER NOT NULL,
        question          TEXT NOT NULL,
        question_context  TEXT,
        answer            TEXT,
        answered_at       INTEGER,
        UNIQUE(interview_id, seq)
      );

      CREATE INDEX IF NOT EXISTS idx_prd_interviews_biz_item ON prd_interviews(biz_item_id);
      CREATE INDEX IF NOT EXISTS idx_prd_interview_qas_interview ON prd_interview_qas(interview_id);
    `);
    this.db.prepare("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES (?, ?, ?)").run("org_test", "Test Org", "test");
  }

  prepare(query: string) {
    return new MockD1PreparedStatement(this.db, query);
  }

  async batch(statements: MockD1PreparedStatement[]) {
    return Promise.all(statements.map((s) => {
      const q = (s as any).query as string;
      const upper = q.trimStart().toUpperCase();
      if (upper.startsWith("SELECT")) return s.all();
      return s.run();
    }));
  }

  async exec(query: string) {
    this.db.exec(query);
    return { count: 1, duration: 0 };
  }

  async dump() {
    return new ArrayBuffer(0);
  }
}

export function createMockD1(): MockD1Database {
  return new MockD1Database();
}
