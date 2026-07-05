-- Migration: allow_credit_payment_method
-- Applied to project tnxhjvmkoplfyynicajn on 2026-06-29 via Supabase MCP apply_migration.
--
-- Context (Tier 1 — feedback operaria):
--   `orders.payment_method` is a `text` column, but was gated by a CHECK constraint
--   that only allowed ('transfer','cash','card','rappi'). Two problems:
--     1. The new "Crédito" payment method ('credit') was rejected on INSERT.
--     2. The app sends 'bold' (Link Bold) but the old constraint allowed 'card'
--        (0 rows) and NOT 'bold' — so Bold orders would also fail to save.
--   This migration realigns the constraint with what the app actually sends:
--   adds 'credit' and 'bold', drops the unused 'card'.
--
-- See docs/tier1-credito-sameday.md (Item #1).

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['transfer'::text, 'cash'::text, 'bold'::text, 'rappi'::text, 'credit'::text]));
