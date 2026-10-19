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

compose=(docker compose -p aisezim2 -f docker-compose.yml -f docker-compose.nginx.yml)
"${compose[@]}" config --quiet
"${compose[@]}" up --build -d --wait --wait-timeout 180
"${compose[@]}" ps

domain="$(sed -n 's/^DOMAIN=//p' .env | tail -n 1 | tr -d '\r')"
if [[ -n "$domain" && "$domain" != "localhost" && "$domain" != "your-domain.example" ]]; then
  printf '\nAISezim is available at https://%s through the host Nginx reverse proxy.\n' "$domain"
else
  printf '\nAISezim containers are running. Configure a public domain and TLS before opening it to users.\n'
fi
