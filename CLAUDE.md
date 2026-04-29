# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tartelle is a bakery order management and production system for an artisanal cake shop in Medellín, Colombia. It replaces WhatsApp/Excel workflows with a real-time ops platform covering multi-channel orders, production planning, inventory, delivery tracking, and payments.

## Commands

All app commands run from `/app`:

```bash
npm run dev       # Vite dev server at localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

There are no tests. TypeScript compilation (`tsc -b`) is the type check.

Data import scripts (run from `/scripts`):
```bash
npm run parse-products    # Parse Siigo xlsx → JSON
npm run import-products   # Import products to Supabase
npm run parse-customers   # Parse Tartelle sheet
```

## Architecture

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase (Postgres + Auth + Storage + Realtime)

**Routing:** Hash-based (`#dashboard`, `#orders`, `#kitchen`, `#inventory`, `#production`, `#create`). Defined in `app/src/App.tsx`.

**Auth & roles:** Supabase email/password auth. Role stored in `user_metadata.role`: `'admin' | 'kitchen' | 'driver'`. `AuthContext` (`app/src/context/AuthContext.tsx`) exposes `user` and `role`. Kitchen users land directly on KitchenView; drivers land on DomiciliarioView (standalone URL, no sidebar).

**Data layer:** Custom hooks in `app/src/hooks/` query Supabase and maintain realtime subscriptions (debounced 400ms). Hooks own all mutation logic — views never call Supabase directly. Pattern:
```
View → hook (useOrders / useInventory / useProducts / useCustomers)
     → supabase.from(...).select/insert/update
     → realtime channel → debounced refetch
```

**Key hooks and what they export:**
- `useOrders(startDate, endDate)` — `orders`, `loading`, `refetch` + `createOrder`, `updateOrderStatus`, `updateOrderFields`
- `useInventory()` — `inventory`, `refetch` + `adjustInventory(productId, change, reason)`
- `useProducts()` — `products`, `loading` (active products, ordered by flavor/size)
- `useCustomerSearch` / `useRecentCustomers` / `createCustomer`

**Order status flow:** `pending → confirmed → in_production → ready → dispatched → delivered`. Defined in `NEXT_STATUS_ACTION` and `ORDER_STATUS_FLOW` in `app/src/lib/constants.ts`.

## Key files

| File | Purpose |
|---|---|
| `app/src/lib/types.ts` | All TypeScript interfaces and string-union types |
| `app/src/lib/constants.ts` | Labels, colors, status flow, category order |
| `app/src/lib/utils.ts` | `formatCOP`, `formatDate`, `today()`, `tomorrow()`, `cn()` |
| `app/src/lib/storage.ts` | Supabase Storage: photo upload/download with client-side compression |
| `app/src/lib/orderParser.ts` | NLP parser for WhatsApp orders (Spanish dates, fuzzy product match) |
| `app/src/index.css` | Tailwind + all CSS custom properties (color palette, status colors) |

## Product catalog

Products have a `catalog` field: `'retail' | 'eventos' | 'ambos' | 'cafe_velez'`.
- `retail` — tienda/WhatsApp/walk-in orders
- `eventos` — catering/B2B orders (Bites x16, etc.)
- `ambos` — appears in both (torta en capacillo units, tarta de queso)
- `cafe_velez` — productos exclusivos de Café Vélez (identificados por "CAFE VELEZ" en el nombre)

`PRODUCT_CATEGORY_ORDER` in constants.ts defines display order in the order creation grid:
`['tarta', 'bites', 'torta', 'cucheareable', 'galleta', 'complemento', 'otro', 'brownie']`

## Supabase

Project ID: `tnxhjvmkoplfyynicajn`

Schema changes go through Supabase MCP → `apply_migration`. Data changes via `execute_sql`. After schema changes, regenerate types with `generate_typescript_types` and update `app/src/lib/types.ts`.

Storage bucket: `order-photos`. Paths: `{orderId}/{type}-{timestamp}.jpg`. Types: `dispatch`, `receipt`, `invoice`.

Prices are stored and displayed in COP (Colombian pesos). Use `formatCOP()` for display — it formats integers like `$ 154.000`.

## Styling conventions

Colors come from CSS variables defined in `app/src/index.css`, not hardcoded hex. Use `var(--color-accent)` for the Tartelle teal, `var(--color-bg)` for page background, etc. Status colors live in `STATUS_COLORS` in constants.ts and map to CSS variables.

For dark-background sections (kitchen/driver views): use `bg-[#111827]` / `bg-[#1F2937]` / `border-[#374151]` — those views use hardcoded Tailwind dark values rather than CSS variables.

Minimum touch targets: `min-h-[44px]` for standard buttons, `min-h-[48px]` for primary actions.
