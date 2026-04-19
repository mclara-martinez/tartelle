# Plan: Import Tartelle spreadsheet data → Supabase (Siigo as source of truth)

## Context

Andrea provided two sources with operational data that doesn't exist in the Tartelle Supabase DB yet:

1. **Google Sheet "INFOMACIÓN TARTELLE 2026"** — B2B client list with discounts/NIT/credit terms/addresses (~45 restaurants + ~25 individuals), historical Jan 2026 orders with customers (~177), and product pricing.
2. **Siigo export "Gestión de productos y servicios..."** — ~188 SKUs covering all finished products (PT##), POS variants (PTPOS#), candles (V#), new items (PTN#), raw materials (MP##) and Dom01.

**Decision: Siigo is the source of truth for products & SKUs.** The spreadsheet's internal SKUs (PT01, C07…) are stale and diverge from Siigo (PT1, PT80…).

The current DB is empty of business data and the Supabase project is **paused** (`tnxhjvmkoplfyynicajn`). Schema has no `sku`, no `razon_social`/`nit`, no `category`, and the `ProductSize` enum lacks `'porcion'`. Blocking gaps to fix before the import.

**Outcome:** Siigo-aligned product catalog, full B2B customer list with razón social/NIT grouping, historical Jan 2026 orders seeded for the CRM view.

---

## Critical files

| File | Purpose |
|------|---------|
| `app/src/lib/types.ts` | Extend `Product`, `Customer`, `ProductSize` types |
| `app/src/lib/constants.ts` | Add `CATEGORY_LABELS` map if we surface categories in UI |
| `app/src/hooks/useProducts.ts` | May need to re-query if selecting new columns |
| `app/src/hooks/useCustomers.ts` | Same — razon_social/nit in search |
| `app/src/views/OrderCreateView.tsx` | POS may need category filter chips (optional, defer) |
| `app/src/views/InventoryView.tsx` | Currently groups by size; may group by category instead |
| (new) `scripts/import/` | Local-only Node scripts to parse xlsx/sheet → SQL INSERTs |

Migration files go through the Supabase MCP (`apply_migration`), not checked into the repo (matches current pattern — no SQL files in repo).

---

## Step-by-step

### Step 0 — Restore the paused Supabase project
- `mcp__supabase__restore_project` on `tnxhjvmkoplfyynicajn`
- Verify with `list_tables` that schema is intact

### Step 1 — Schema migration (single migration)
Name: `add_sku_and_categorization_2026_04`

```sql
-- Products: Siigo SKU + category
alter table products
  add column sku text unique,
  add column category text,
  add column tax_type text;  -- 'impoconsumo_8' | 'iva_19' | 'iva_0' | null

-- ProductSize needs 'porcion'
alter table products drop constraint if exists products_size_check;
alter table products add constraint products_size_check
  check (size in ('grande','mediana','mini','porcion','other'));
  -- 'other' for velas/galletas/cucheareables where size is irrelevant

-- Customers: Siigo-grouping fields
alter table customers
  add column razon_social text,
  add column nit text;

create index idx_products_sku on products(sku);
create index idx_products_category on products(category);
create index idx_customers_razon_social on customers(razon_social);
create index idx_customers_nit on customers(nit);
```

**TS type updates (`app/src/lib/types.ts`):**
```ts
export type ProductSize = 'grande' | 'mediana' | 'mini' | 'porcion' | 'other'
export type ProductCategory = 'tarta' | 'bites' | 'cucheareable' | 'vela' | 'torta' | 'galleta' | 'brownie' | 'pan' | 'otro'
export type TaxType = 'impoconsumo_8' | 'iva_19' | 'iva_0' | null

// Product: add sku, category, tax_type
// Customer: add razon_social, nit
```

### Step 2 — Import products from Siigo (authoritative)
Source: `Gestión de productos y servicios-20260419162752.xlsx` (188 rows).

**Filter in:** PT#, PTPOS#, PTN#, V# rows with `Estado = Active`. **Filter out:** MP# (raw materials, Phase 2), generic system entries (`productogenericonube`, `1`, `2`, `RegistroManual`), `Dom01` (delivery fee — handled via `DELIVERY_FEE` constant, not a product).

**Target: ~100 products.** Mapping:

| Siigo field | `products` column |
|---|---|
| `Código` | `sku` (unique) |
| `Nombre` | `name` (verbatim from Siigo) |
| `Precios` | `base_price` |
| `Impuestos` | `tax_type` (mapped: `Impoconsumo 8%` → `impoconsumo_8`, etc.) |
| `Estado == Active` | `active = true` |
| inferred from name | `flavor` (e.g., "TARTA GRANDE OG" → `Original`; "BITES X4 PISTACHO" → `Pistacho`) |
| inferred from name | `size` (`GRANDE`→grande, `MEDIANA`→mediana, `MINI`→mini, `PORCION`→porcion, else→other) |
| inferred from SKU prefix + name | `category` (tarta/bites/cucheareable/vela/torta/galleta/brownie/pan/otro) |
| `size in ('grande','mediana')` AND `category='tarta'` | `requires_advance_order=true` (matches existing business rule) |

**PTPOS# handling:** PTPOS1–4 are POS-invoiced versions of PT1–PT3 with 8% Impoconsumo. Import as separate products (they're distinct SKUs for Siigo) with `flavor='Original (POS)'` or similar — but since they're the same physical product, consider whether the app needs them at all. **Recommendation: skip PTPOS# for v1.** Tartelle's own POS view can bill against base SKUs; Siigo reconciliation happens at the invoice layer. Flag to Andrea.

### Step 3 — Combos (follow-up, not this import)
Combos like `MEDIANA OG + AREQUIPE $123k` exist in NORMAL price list but not in Siigo.

**Decision: don't invent combo SKUs locally.** Instead:
1. Import only base products from Siigo (this batch).
2. Leave a TODO for Andrea: **create combo SKUs in Siigo** (e.g. `PT-C01 TARTA GRANDE ORIGINAL + AREQUIPE`, price $163k). Once in Siigo, re-run the product sync to pick them up.
3. For historical Jan 2026 orders with combos (Step 5) that can't map to a Siigo SKU, record the base SKU as the line item and put `"+AREQUIPE"` in the order's `packaging_notes` or the item's subtotal-adjusted line. No combo loss.

**Rationale:** Siigo = source of truth means we don't mint SKUs in the app that Andrea can't bill. Better to nudge Andrea to close the Siigo gap than to create drift.

### Step 4 — Import customers from spreadsheet Section 1
Source: Google Sheet rows 2–78 (~70 customers).

**Two passes:**

**4a. B2B customers** (~45 rows with razón social):
- One customer per location (row).
- `type='b2b'`
- `name` = column A (e.g., "GRILL STATION POBLADO")
- `razon_social` = column C (e.g., "FAIPA FRANQUICIAS SAS")
- `nit` = parse from razón social (e.g., "MERO SAS 901.444.356-0" → `nit='901444356-0'`); null if absent
- `discount_pct` = parse % (e.g., `25%` → 25.0; `35,25%` → 35.25)
- `address` = last column
- `notes` = synthesized from: `DOMICILIO: {fee}; MARCACIÓN: {Xn}; CRÉDITO: {plazo}; OBS: {observaciones}`
- `active` = `ACTIVO` column says ACTIVO/NO/PENDIENTE → boolean (PENDIENTE → active=false)

**4b. B2C individuals with discount code** (~25 rows):
- `type='b2c'`
- `name` from column A
- `cedula` from column C when numeric
- `discount_pct` from column B
- Other fields null
- `active=true` unless row is obviously stale

**Deduplication:** None expected (DB is empty), but import script should `on conflict (name, razon_social) do nothing` as a guardrail.

### Step 5 — Import historical orders (Section 5d, Jan 2026)
Source: Google Sheet rows 1534–1710 (~177 rows).

For each row:
1. **Resolve customer:** match `cliente` column to `customers.name` (case-insensitive). If match → `customer_id`; else create a minimal b2c customer on the fly (seeded). Store `customer_name` denormalized either way.
2. **Resolve product:** match `producto` to `products` by fuzzy-map of spreadsheet names → Siigo SKUs (build a lookup table in the import script). Example: `"GRANDE OG"` → `PT1`, `"MEDIANA OG"` → `PT2`, `"MINI OG"` → `PT3`, `"MEDIANA LOTUS"` → `PT14`, `"MEDIANA NAVIDAD"` → (not in Siigo — skip or flag), `"GRANDE OG + AREQUIPE"` → `PT1` + combo note.
3. Create `orders` row: `channel='b2b'` if customer is b2b else `'whatsapp'`, `status='delivered'`, `delivery_date=fecha`, `delivery_type='delivery'` if DOMICILIO column populated else `'pickup'`, `payment_status='paid'` if FACTURADA/ENTREGADA=SI else `'credit'`, `delivery_fee` parsed from "DOMICILIO" column, `total` from "SUBTOTAL", `assigned_driver='John'` if DOMICILIARIO = INDRIVE/JOHN.
4. Create `order_items` row with product_id + qty + unit_price (from subtotal/qty).
5. Combo rows: base product + `packaging_notes: "+AREQUIPE"` etc.
6. Unmappable rows (NAVIDAD, seasonal): log to a CSV for manual review, skip.

**Skip Sections 5a/5b/5c** (production logs, ~1,083 rows, no customer data — not worth DB pollution).

### Step 6 — Inventory seed (minimal)
Siigo has `Stock` column with real-time inventory. Seed `inventory_finished` with one row per imported product at `quantity = max(0, siigo_stock)` so the kitchen/inventory view opens with realistic numbers. (Siigo shows negatives, indicating oversells; clamp to 0.)

### Step 7 — Import scripts location
Place local-only scripts in `scripts/import/` (add to `.gitignore` if they contain raw PII):
- `01_parse_siigo.ts` — xlsx → products JSON
- `02_parse_sheet_customers.ts` — md/CSV → customers JSON
- `03_parse_sheet_orders.ts` — md → orders JSON + unmapped log
- `04_apply.ts` — uses Supabase client with service-role key to bulk upsert

Scripts are one-shot, not part of the app build. Run via `tsx`.

---

## Reuse from existing code

- `app/src/lib/constants.ts` — extend `STATUS_COLORS`, add `CATEGORY_LABELS` next to `PRODUCT_SIZE_LABELS`.
- `app/src/hooks/useProducts.ts`, `useCustomers.ts` — select `*` pattern already picks up new columns automatically; no change needed beyond TS types.
- `app/src/lib/utils.ts` — `formatDate`, `formatCurrency` reused for display.
- `app/src/lib/orderParser.ts` — check if existing parser can be reused for the historical order name-matching; likely not a direct fit but the name-normalization helpers might be.

---

## Verification

1. **Schema migration applied:** `mcp__supabase__list_tables` shows `sku`, `category`, `tax_type`, `razon_social`, `nit` columns.
2. **Counts:** After import, expect roughly:
   - `products`: ~100 active (88 from Siigo minus skipped PTPOS# + Dom01 + MP#)
   - `customers`: ~70 (45 b2b + 25 b2c)
   - `orders`: ~170 delivered (Jan 2026)
   - `order_items`: ~170 (1 per order in most cases)
   - `inventory_finished`: ~100 (one per active product)
3. **App smoke test:** `preview_start tartelle`, open `#orders` filtered to Jan 2026 → should see historical orders with B2B clients. Open `#dashboard` → KPIs render. Open `#inventory` → stock shows. Open POS (`#create`) → product grid populated, B2B customer search finds Grill Stations.
4. **SKU integrity:** `select count(*) from products where sku is null` should be 0 for Siigo-sourced rows.
5. **Razón social grouping:** `select razon_social, count(*) from customers group by razon_social` should show FAIPA FRANQUICIAS SAS = 6, CATALINA FERNANDEZ SAS = 3, CAFE ARTISAN SAS = 12 (Velez), etc.
6. **Unmapped import log:** Review `scripts/import/unmapped.csv` with Andrea — likely Navidad/seasonal SKUs to resolve later.

---

## Follow-ups for Andrea (not blocking)

1. **Create combo SKUs in Siigo** (GRANDE OG + AREQUIPE, MEDIANA OG + NUTELLA, etc.) — ~15 combos in pricing sheet. Once done, re-run product sync.
2. **Clarify PTPOS# handling** — are those purely accounting variants, or do they represent a different packaging/channel?
3. **Seasonal products (NAVIDAD)** — should they live in Siigo with an `active=false` flag when out of season, or as separate SKUs?
4. **Raw materials (MP##)** — Phase 2 work, worth importing when we build the raw materials module.
