#!/usr/bin/env bash
# LifeOS'u örnek verilerle yerelde çalıştırır: hesap ya da anahtar gerekmez.
#
#   npm run demo                               → Claude taklidiyle
#   ANTHROPIC_API_KEY=sk-ant-... npm run demo  → gerçek Claude ile
#
# Gerekenler: Docker (yerel Supabase için) ve Node 20.9+.
# Açılınca: http://localhost:3000 (uygulama), http://localhost:3000/simulator
# (iPad Pro görünümü). Mac'te gerçek iPad simülatörü için ikinci bir
# terminalde: npm run ipad
#
# Gerçek Supabase projenize dokunmaz. Kapatmak için Ctrl+C; yerel Supabase'i
# durdurmak için: npx supabase stop

set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3000}"
ADRES="http://localhost:$PORT"
mkdir -p .demo

if curl -s -o /dev/null "$ADRES"; then
  echo "$PORT portu kullanımda. Çalışan uygulamayı kapatın ya da PORT=3001 npm run demo deneyin." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker çalışmıyor. Docker Desktop'ı açıp tekrar deneyin." >&2
  exit 1
fi

npx supabase start -x studio,imgproxy,mailpit,inbucket,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta
eval "$(npx supabase status -o env 2>/dev/null | sed -n 's/^\(API_URL\|PUBLISHABLE_KEY\|SECRET_KEY\)=/SB_\1=/p')"
VAPID=$(npx web-push generate-vapid-keys --json)

export NEXT_PUBLIC_SUPABASE_URL="$SB_API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$SB_PUBLISHABLE_KEY"
export SUPABASE_SECRET_KEY="$SB_SECRET_KEY"
export NEXT_PUBLIC_VAPID_PUBLIC_KEY=$(node -pe "JSON.parse(process.argv[1]).publicKey" "$VAPID")
export VAPID_PRIVATE_KEY=$(node -pe "JSON.parse(process.argv[1]).privateKey" "$VAPID")
export VAPID_SUBJECT="mailto:demo@lifeos.test"
export CRON_SECRET="demo-$(node -pe "require('crypto').randomBytes(16).toString('hex')")"
# E-posta ayarları ekranda görünsün diye örnek değerler (gerçek e-posta gelmez)
export EPOSTA_GELEN_ADRESI="demo@inbound.postmarkapp.com"
export EPOSTA_WEBHOOK_ANAHTARI="demo-$(node -pe "require('crypto').randomBytes(16).toString('hex')")"
export YONETICI_EPOSTALARI="demo@lifeos.test"

# macOS'un bash 3.2'si için dizi yerine düz değişkenler
CLAUDE_PID=""
SUNUCU_PID=""
trap 'kill $CLAUDE_PID $SUNUCU_PID 2>/dev/null || true' EXIT

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Gerçek Claude API kullanılacak."
else
  # Claude taklidi: bilinen örnek cümleleri ayrıştırır, diğerlerini olduğu gibi görev yapar.
  export ANTHROPIC_API_KEY="demo-sahte-anahtar"
  export ANTHROPIC_BASE_URL="http://127.0.0.1:4010"
  unset ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
  node e2e/mock-claude.mjs > .demo/claude.log 2>&1 &
  CLAUDE_PID=$!
fi

node scripts/demo-verisi.mjs
npx next build
node node_modules/next/dist/bin/next start -p "$PORT" > .demo/sunucu.log 2>&1 &
SUNUCU_PID=$!
for _ in $(seq 1 30); do curl -sf -o /dev/null "$ADRES/giris" && break; sleep 1; done

cat <<EOF

  LifeOS demo hazır
  ─────────────────────────────────────────────
  Uygulama          $ADRES
  iPad Pro görünümü $ADRES/simulator
  Giriş             demo@lifeos.test / demo-sifre-123
  Mac'te Xcode      ikinci terminalde: npm run ipad

  Kapatmak için Ctrl+C. Not: .next klasörü demo ayarlarıyla derlendi;
  yayından önce 'npm run build' çalıştırın.

EOF
wait "$SUNUCU_PID"
