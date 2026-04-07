-- F442: 문서 파싱 엔진 (Sprint 213)
CREATE TABLE IF NOT EXISTS parsed_documents (
  id                 TEXT PRIMARY KEY,
  file_id            TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  content_text       TEXT NOT NULL,
  content_structured TEXT,
  page_count         INTEGER NOT NULL DEFAULT 0,
  parsed_at          INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_parsed_documents_file ON parsed_documents(file_id);
