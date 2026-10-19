#!/bin/sh
set -eu
case "${POSTGREST_DB_PASSWORD:-}" in
  ''|*[!a-fA-F0-9]*) echo "POSTGREST_DB_PASSWORD must be generated as hexadecimal text" >&2; exit 1 ;;
esac
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 \
  --command="CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGREST_DB_PASSWORD';" \
  --command="CREATE ROLE anon NOLOGIN;" \
  --command="CREATE ROLE aisezim_api NOLOGIN;" \
  --command="GRANT anon TO authenticator;" \
  --command="GRANT aisezim_api TO authenticator;"
