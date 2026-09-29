#!/bin/sh
# Asserts the production nginx image sends its security headers on every
# kind of response: the SPA shell, a client-side route, a hashed asset
# (its own add_header block), the health probe, and /api (fastcgi).
#
# Usage: docker/check-security-headers.sh [image]   (default mt-nginx:prod)
#
# php-fpm isn't running, so /api answers 502 — which is the point: the
# `always` flag must put the headers on error responses too.
set -eu

IMAGE="${1:-mt-nginx:prod}"
NAME="mt-header-check-$$"
PORT="${HEADER_CHECK_PORT:-8089}"

# nginx resolves upstream hosts at startup; point `laravel` at loopback.
docker run -d --rm --name "$NAME" --add-host laravel:127.0.0.1 \
    -p "127.0.0.1:$PORT:80" "$IMAGE" >/dev/null
trap 'docker stop "$NAME" >/dev/null 2>&1 || true' EXIT

i=0
until curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
        echo "nginx did not become healthy" >&2
        docker logs "$NAME" >&2 || true
        exit 1
    fi
    sleep 1
done

ASSET=$(docker exec "$NAME" sh -c 'ls /usr/share/nginx/html/assets | head -n 1')

fail=0
for path in / /queries "/assets/$ASSET" /health /api/health; do
    headers=$(curl -sS -I "http://127.0.0.1:$PORT$path")
    status=$(printf '%s\n' "$headers" | head -n 1 | tr -d '\r')
    echo "── $path  ($status)"
    for h in \
        "Content-Security-Policy: default-src 'self'" \
        "X-Content-Type-Options: nosniff" \
        "Referrer-Policy: strict-origin-when-cross-origin" \
        "Permissions-Policy: "
    do
        if printf '%s\n' "$headers" | grep -qiF "$h"; then
            echo "   ok   $h"
        else
            echo "   MISSING $h"
            fail=1
        fi
    done
    # server_tokens off: no version in the Server header.
    if printf '%s\n' "$headers" | grep -qiE '^server: nginx/[0-9]'; then
        echo "   LEAKS nginx version"
        fail=1
    fi
done

exit "$fail"
