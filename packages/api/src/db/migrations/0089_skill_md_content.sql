-- F306: SKILL.md 콘텐츠 저장 컬럼
ALTER TABLE skill_registry ADD COLUMN skill_md_content TEXT;
ALTER TABLE skill_registry ADD COLUMN skill_md_generated_at TEXT;
