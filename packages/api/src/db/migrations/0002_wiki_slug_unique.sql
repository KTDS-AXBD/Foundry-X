-- Sprint 8: wiki_pages.slug UNIQUE 인덱스 (프로젝트 내 슬러그 고유성)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_pages_project_slug
  ON wiki_pages(project_id, slug);
