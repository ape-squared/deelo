-- Rename bot schema from syntax to deelo
ALTER SCHEMA syntax RENAME TO deelo;

GRANT USAGE ON SCHEMA deelo TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA deelo TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA deelo TO service_role;

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, deelo';
NOTIFY pgrst, 'reload config';
