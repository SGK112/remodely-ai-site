#!/usr/bin/env bash
# Regenerate setup-supabase.sql from a live database, so the file can never
# drift from the schema again. It already did once: the hand-maintained version
# described 13 columns of a 44-column table, and a rebuild from it dropped the
# settings, rooms, quote_total and user_id columns without erroring.
#
#   scripts/dump-schema.sh "postgresql://postgres@db.<ref>.supabase.co:5432/postgres?sslmode=require" > setup-supabase.sql
#
# pg_dump is not used on purpose — it refuses to run against a server newer
# than itself, and Supabase upgrades Postgres out from under you.
set -euo pipefail
DB="${1:?usage: dump-schema.sh <connection-string>}"
T="'room_designs','room_design_shares','price_lists'"

echo "-- Room Designer — Supabase schema"
echo "-- GENERATED from the live database. Do not hand-edit; see scripts/dump-schema.sh"
echo
psql "$DB" -tAc "
SELECT 'CREATE TABLE IF NOT EXISTS ' || c.relname || E' (\n' ||
  string_agg('  ' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod) ||
    coalesce(' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid), '') ||
    CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END, E',\n' ORDER BY a.attnum) ||
  coalesce((SELECT E',\n  ' || string_agg(pg_get_constraintdef(con.oid), E',\n  ')
            FROM pg_constraint con WHERE con.conrelid = c.oid AND con.contype IN ('p','u','f')), '') ||
  E'\n);'
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname='public'
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
WHERE c.relname IN ($T) AND c.relkind='r'
GROUP BY c.oid, c.relname ORDER BY c.relname;"
echo; echo "-- Indexes"
psql "$DB" -tAc "select indexdef||';' from pg_indexes where schemaname='public' and tablename in ($T) order by tablename, indexname;"
echo; echo "-- Row Level Security"
psql "$DB" -tAc "select 'ALTER TABLE '||tablename||' ENABLE ROW LEVEL SECURITY;' from pg_tables where schemaname='public' and tablename in ($T);"
psql "$DB" -tAc "select 'CREATE POLICY \"'||policyname||'\" ON '||tablename||' FOR '||cmd||coalesce(' USING ('||qual||')','')||coalesce(' WITH CHECK ('||with_check||')','')||';' from pg_policies where tablename in ($T) order by tablename, cmd;"
echo; echo "-- Functions (public schema only — storage/auth belong to Supabase)"
psql "$DB" -tAc "select pg_get_functiondef(p.oid)||';' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_shared_design','get_share_record','update_updated_at_column','cleanup_old_designs');"
echo "GRANT EXECUTE ON FUNCTION public.get_shared_design(text) TO anon, authenticated;"
echo "GRANT EXECUTE ON FUNCTION public.get_share_record(text) TO anon, authenticated;"
