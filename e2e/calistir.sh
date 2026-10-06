#!/usr/bin/env bash
# Uçtan uca testleri yerel Supabase'e karşı çalıştırır.
#
# Gerekenler: Docker (yerel Supabase için), Node 20.9+, openssl ve bir kez
# `npx playwright install chromium`.
#
#   bash e2e/calistir.sh
#
# Adımlar: yerel Supabase'i başlatır (migration'lar uygulanır), uygulamayı
# yerel ayarlarla derleyip 3100 portunda çalıştırır, Claude API'yi ve push
# servisini taklit eden sunucularla testleri koşar. Gerçek Supabase projenize
# ya da Claude API'ye dokunmaz.

set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p e2e/.cikti

npx supabase start -x studio,imgproxy,mailpit,inbucket,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta
eval "$(npx supabase status -o env 2>/dev/null | sed -n 's/^\(API_URL\|PUBLISHABLE_KEY\|SECRET_KEY\)=/SB_\1=/p')"

# Sahte push servisi için kendinden imzalı sertifika
if [ ! -f e2e/.cikti/push-cert.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=127.0.0.1" \
    -addext "subjectAltName=IP:127.0.0.1" \
    -keyout e2e/.cikti/push-key.pem -out e2e/.cikti/push-cert.pem 2>/dev/null
fi
VAPID=$(npx web-push generate-vapid-keys --json)

export NEXT_PUBLIC_SUPABASE_URL="$SB_API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$SB_PUBLISHABLE_KEY"
export SUPABASE_SECRET_KEY="$SB_SECRET_KEY"
export NEXT_PUBLIC_VAPID_PUBLIC_KEY=$(node -pe "JSON.parse(process.argv[1]).publicKey" "$VAPID")
export VAPID_PRIVATE_KEY=$(node -pe "JSON.parse(process.argv[1]).privateKey" "$VAPID")
export VAPID_SUBJECT="mailto:e2e@lifeos.test"
export CRON_SECRET="e2e-$(openssl rand -hex 16)"
export ANTHROPIC_API_KEY="e2e-sahte-anahtar"
export ANTHROPIC_BASE_URL="http://127.0.0.1:4010"
export NODE_EXTRA_CA_CERTS="$PWD/e2e/.cikti/push-cert.pem"
export E2E_APP_URL="http://127.0.0.1:3100"
export EPOSTA_GELEN_ADRESI="e2egelen@inbound.postmarkapp.com"
export EPOSTA_WEBHOOK_ANAHTARI="e2e-$(openssl rand -hex 16)"
export YONETICI_EPOSTALARI="e2e@lifeos.test"
unset ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL

if curl -s -o /dev/null "$E2E_APP_URL"; then
  echo "3100 portu kullanımda; önceki test sunucusunu kapatın." >&2
  exit 1
fi

npx next build
# npx yerine doğrudan node: böylece $! sunucunun kendisidir ve sonda kapatılabilir.
node node_modules/next/dist/bin/next start -p 3100 > e2e/.cikti/sunucu.log 2>&1 &
SUNUCU=$!
trap 'kill $SUNUCU 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -sf -o /dev/null "$E2E_APP_URL/giris" && break; sleep 1; done

npx vitest run -c vitest.e2e.config.mts
echo "Not: .next klasörü yerel ayarlarla derlendi; yayından önce 'npm run build' çalıştırın."
