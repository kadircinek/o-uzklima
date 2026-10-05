#!/usr/bin/env bash
# Şema testleri: migration'ları boş bir Postgres veritabanına (Supabase'in
# auth/storage şemaları taklit edilerek) uygular, ardından RLS, tetikleyici
# ve kısıt davranışlarını dener. Docker gerektirmez.
#
#   PGURL=postgresql://postgres@localhost:5432/postgres bash supabase/tests/calistir.sh

set -euo pipefail
cd "$(dirname "$0")/../.."
PGURL="${PGURL:-postgresql://postgres@localhost:5432/postgres}"
DB="lifeos_sema_testi_$$"
TEST_URL=$(printf %s "$PGURL" | sed -E "s#/([^/?]+)(\?|$)#/$DB\2#")

psql "$PGURL" -qc "create database $DB"
trap 'psql "$PGURL" -qc "drop database if exists $DB" >/dev/null' EXIT

psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"; done
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -At -o /dev/null -f supabase/tests/10_davranis.sql
echo "Şema testleri geçti"
