-- Expose the syntax schema to Supabase Data API (PostgREST)
GRANT USAGE ON SCHEMA syntax TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA syntax TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA syntax TO service_role;

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, syntax';
NOTIFY pgrst, 'reload config';
