-- Runs once, on the first start of an empty data volume.
--
-- The application database itself is created by POSTGRES_DB. Keycloak needs a
-- separate one, kept inside the same instance so the local stack stays a
-- single Postgres rather than two.
CREATE DATABASE keycloak OWNER drinksaver;
