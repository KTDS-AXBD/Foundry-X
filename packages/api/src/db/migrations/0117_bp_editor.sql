-- Sprint 215: 사업기획서 편집기 + 템플릿 (F444 + F445)

-- 사업기획서 섹션별 편집 추적 (F444)
CREATE TABLE IF NOT EXISTS business_plan_sections (
  id           TEXT PRIMARY KEY,
  draft_id     TEXT NOT NULL,
  biz_item_id  TEXT NOT NULL,
  section_num  INTEGER NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (draft_id) REFERENCES business_plan_drafts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bp_sections_draft ON business_plan_sections(draft_id);
CREATE INDEX IF NOT EXISTS idx_bp_sections_item  ON business_plan_sections(biz_item_id);

-- 기획서 템플릿 (F445)
CREATE TABLE IF NOT EXISTS plan_templates (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  name          TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK(template_type IN ('internal','proposal','ir-pitch','custom')),
  tone          TEXT NOT NULL DEFAULT 'formal',
  length        TEXT NOT NULL DEFAULT 'medium',
  sections_json TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plan_templates_org ON plan_templates(org_id);
