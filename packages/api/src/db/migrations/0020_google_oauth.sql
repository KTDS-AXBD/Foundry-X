-- Google OAuth support: auth_provider + provider_id columns
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN provider_id TEXT;
