-- F355+F356: Extend prototype_jobs with OGD + feedback fields (Sprint 160)
ALTER TABLE prototype_jobs ADD COLUMN quality_score REAL;
ALTER TABLE prototype_jobs ADD COLUMN ogd_rounds INTEGER DEFAULT 0;
ALTER TABLE prototype_jobs ADD COLUMN feedback_content TEXT;
