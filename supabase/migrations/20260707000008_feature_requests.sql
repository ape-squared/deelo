-- Community feature requests (suggestions board)

CREATE TABLE IF NOT EXISTS deelo.feature_requests (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'feature'
    CHECK (category IN ('feature', 'improvement', 'bug', 'other')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'planned', 'in_progress', 'completed', 'declined')),
  author_discord_id TEXT NOT NULL,
  author_username TEXT NOT NULL,
  vote_score INT NOT NULL DEFAULT 0,
  staff_response TEXT,
  staff_responder_id TEXT,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON deelo.feature_requests (status, pinned DESC, vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created ON deelo.feature_requests (created_at DESC);

CREATE TABLE IF NOT EXISTS deelo.feature_votes (
  request_id BIGINT NOT NULL REFERENCES deelo.feature_requests(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, discord_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_votes_discord ON deelo.feature_votes (discord_id);

ALTER TABLE deelo.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelo.feature_votes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON deelo.feature_requests TO service_role;
GRANT ALL ON deelo.feature_votes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE deelo.feature_requests_id_seq TO service_role;
