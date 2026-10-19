#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker Engine and the Compose plugin are required." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running or the current user cannot access it." >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and set unique secrets and DOMAIN first." >&2
  exit 1
fi

docker compose config --quiet
docker compose --profile vps up --build -d --wait --wait-timeout 180
docker compose ps

domain="$(sed -n 's/^DOMAIN=//p' .env | tail -n 1 | tr -d '\r')"
if [[ -n "$domain" && "$domain" != "localhost" && "$domain" != "your-domain.example" ]]; then
  printf '\nAISezim is starting at https://%s\n' "$domain"
else
  printf '\nAISezim containers are running. Configure a public domain and TLS before opening it to users.\n'
fi
