-- demo-seed.sql — F169 고객 데모 환경 시드 데이터
-- 사용법: wrangler d1 execute foundry-x-db --remote --file=packages/api/src/db/demo-seed.sql
-- 여러 번 실행해도 안전 (INSERT OR IGNORE)

-- ============================================================
-- 1. 데모 조직
-- ============================================================
INSERT OR IGNORE INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
VALUES (
  'demo-org-001',
  'KT DS 파일럿',
  'kt-ds-pilot',
  'enterprise',
  '{"demo": true}',
  datetime('now'),
  datetime('now')
);

-- ============================================================
-- 2. 데모 사용자
-- ============================================================
-- password_hash: 실제 배포 시 아래 플레이스홀더를 PBKDF2 해시로 교체
-- 생성 방법은 docs/specs/demo/demo-account-setup.md 참조
INSERT OR IGNORE INTO users (id, email, name, role, password_hash, created_at, updated_at)
VALUES (
  'demo-user-001',
  'demo@foundry-x.dev',
  'Demo User',
  'admin',
  '$DEMO_PASSWORD_HASH',
  datetime('now'),
  datetime('now')
);

-- ============================================================
-- 3. 조직 멤버십 (org_members — composite PK: org_id + user_id)
-- ============================================================
INSERT OR IGNORE INTO org_members (org_id, user_id, role, joined_at)
VALUES (
  'demo-org-001',
  'demo-user-001',
  'admin',
  datetime('now')
);

-- ============================================================
-- 4. 데모 프로젝트
-- ============================================================
INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, org_id, created_at)
VALUES (
  'demo-proj-001',
  'KT DS ITSM 파일럿',
  'https://github.com/KTDS-AXBD/kt-ds-itsm-pilot',
  'demo-user-001',
  'demo-org-001',
  datetime('now')
);

-- ============================================================
-- 5. 샘플 SR 2건
-- ============================================================

-- SR-1: Bug 유형 — 로그인 500 에러
INSERT OR IGNORE INTO sr_requests (
  id, org_id, title, description, sr_type, priority, status,
  confidence, matched_keywords, requester_id, workflow_id,
  created_at, updated_at
)
VALUES (
  'demo-sr-001',
  'demo-org-001',
  '사용자 로그인 시 간헐적 500 에러 발생',
  '운영 환경에서 사용자 로그인 시 약 5% 확률로 HTTP 500 에러가 발생합니다. 세션 만료 후 재로그인 시 주로 발생하며, 에러 로그에 DB connection timeout이 기록되어 있습니다.',
  'bug_fix',
  'high',
  'classified',
  0.73,
  '["에러","500","장애"]',
  'demo-user-001',
  NULL,
  datetime('now'),
  datetime('now')
);

-- SR-2: Performance 유형 — API 응답시간 개선 (code_change로 분류)
INSERT OR IGNORE INTO sr_requests (
  id, org_id, title, description, sr_type, priority, status,
  confidence, matched_keywords, requester_id, workflow_id,
  created_at, updated_at
)
VALUES (
  'demo-sr-002',
  'demo-org-001',
  'API 응답시간 P95 3초 → 1초 이내로 개선',
  '현재 주요 API 엔드포인트의 P95 응답시간이 3초를 초과합니다. 기능 변경을 통해 N+1 쿼리 제거, 인덱스 추가, 캐싱 적용으로 1초 이내 목표를 달성해야 합니다.',
  'code_change',
  'medium',
  'classified',
  0.64,
  '["기능","변경","추가"]',
  'demo-user-001',
  NULL,
  datetime('now'),
  datetime('now')
);

-- ============================================================
-- 6. SR 워크플로우 실행 기록 (pending 상태)
-- ============================================================

-- SR-1 워크플로우: bug_fix → QA→Planner→Test→Security→Reviewer (6 steps)
INSERT OR IGNORE INTO sr_workflow_runs (
  id, sr_id, workflow_template, status,
  steps_completed, steps_total, result_summary, started_at, completed_at
)
VALUES (
  'demo-wfr-001',
  'demo-sr-001',
  'sr-bug-fix',
  'pending',
  0,
  6,
  NULL,
  NULL,
  NULL
);

-- SR-2 워크플로우: code_change → Planner→Architect→Test→Reviewer (5 steps)
INSERT OR IGNORE INTO sr_workflow_runs (
  id, sr_id, workflow_template, status,
  steps_completed, steps_total, result_summary, started_at, completed_at
)
VALUES (
  'demo-wfr-002',
  'demo-sr-002',
  'sr-code-change',
  'pending',
  0,
  5,
  NULL,
  NULL,
  NULL
);
