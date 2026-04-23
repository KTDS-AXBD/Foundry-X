-- F574: wiki_pages.slug UNIQUE 제약 추가
-- C87 dogfood에서 발견: ON CONFLICT(slug) DO UPDATE가 UNIQUE 인덱스 없이 reject됨
-- 기존 중복 slug가 있을 경우 migration 실패 방지: IF NOT EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug);
