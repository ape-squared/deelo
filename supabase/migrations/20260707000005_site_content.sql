-- Site CMS: announcements, changelog, and website settings

CREATE TABLE IF NOT EXISTS deelo.site_announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  show_banner BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES deelo.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deelo.site_changelog (
  id BIGSERIAL PRIMARY KEY,
  version TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'improvement'
    CHECK (category IN ('feature', 'improvement', 'fix', 'breaking')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES deelo.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deelo.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES deelo.admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_site_announcements_published
  ON deelo.site_announcements (published_at DESC NULLS LAST)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_site_announcements_pinned
  ON deelo.site_announcements (pinned DESC, published_at DESC NULLS LAST)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_site_changelog_published
  ON deelo.site_changelog (published_at DESC NULLS LAST)
  WHERE status = 'published';

ALTER TABLE deelo.site_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelo.site_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelo.site_settings ENABLE ROW LEVEL SECURITY;

GRANT ALL ON deelo.site_announcements TO service_role;
GRANT ALL ON deelo.site_changelog TO service_role;
GRANT ALL ON deelo.site_settings TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA deelo TO service_role;

-- Seed default website settings
INSERT INTO deelo.site_settings (key, value) VALUES
  ('discord', '{"server_id":"1523831534799425576","invite_url":"https://discord.gg/deelo","widget_enabled":true}'::jsonb),
  ('hero', '{"badge":"Deelo v2 — live dashboard sync","show_latest_changelog":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
