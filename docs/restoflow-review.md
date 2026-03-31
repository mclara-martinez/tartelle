# RestoFlow — Code Review

Issues to fix in RestoFlow and avoid when building Tartelle.

---

## Critical

**1. useAuth.ts — unhandled async error**
`(await supabase.auth.getUser()).data.user?.id` has no error check. If `getUser()` fails it throws silently and leaves auth state inconsistent.
→ Wrap in try/catch.

**2. pdfService.ts — unsafe type cast**
```typescript
(doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
```
Crashes if `lastAutoTable` is absent.
→ Use optional chaining: `(doc as any).lastAutoTable?.finalY ?? 0`

**3. utils.ts — broken date arithmetic near month boundaries**
`getWeekStart()` uses `d.getDate() - day + offset` which produces wrong results when the date is near the start of a month (e.g., Jan 1 on a Tuesday returns Dec 31).
→ Use `date-fns` `startOfWeek()` or fix the logic with a proper `firstDay.setDate(...)` approach.

**4. geminiService.ts — anon key used as auth fallback**
```typescript
'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
```
If session is missing, the anon key is sent as bearer auth. Anyone with dev tools can call the edge function directly.
→ Never use anon key as a bearer token fallback. Fail explicitly if no session.

**5. usePurchaseOrders.ts — no transaction rollback**
Multi-step inserts (order → items) have no rollback. If inserting items fails after the order is created, the order is orphaned.
→ Use a Supabase database function (RPC) to wrap both inserts in a transaction.

---

## High Priority

**6. DashboardView.tsx — N+1 query pattern**
`getItemsForOrder(order.id)` is called inside a `.filter()` over restaurants — O(n²) complexity.
→ Pre-compute a `Map<restaurantId, orders[]>` once in `useMemo`.

**7. All views — no error UI**
When data fetching fails, views show a blank screen. Only loading spinners exist.
→ Add `error` state to every hook and show an error message in the UI.

**8. useInventory.ts / usePurchaseOrders.ts — memory leak in realtime subscriptions**
Debounce timeout is not cleared on component unmount.
→ Add `if (debounceRef.current) clearTimeout(debounceRef.current)` to the cleanup return.

**9. All hooks — no retry on failure**
Failed queries stay empty forever until manual refresh.
→ Add simple retry with exponential backoff (3 attempts).

**10. useAuth.ts — stale closure**
`fetchAppUser` is in the `useEffect` dependency array but recreated every render, causing unnecessary auth re-checks.
→ Wrap `fetchAppUser` in `useCallback` with stable deps.

---

## Medium Priority

**11. Forms — no input validation**
Custom product names in inventory form have no length limit or empty check.
→ Validate before submit: trim, min 1 char, max 255.

**12. DeliveryCheckView + PurchasingSummaryView — duplicated helpers**
`orderStatusLabel()` and `orderStatusVariant()` are defined in both files.
→ Move to `src/lib/statusHelpers.ts`.

**13. Scattered color constants**
`#5F6B2D`, `#F7F6F3`, etc. appear across 20+ files as raw hex strings.
→ Create `src/lib/constants.ts` with a `COLORS` object.

**14. No pagination**
Queries load all records from the past 3 months. Will degrade as data grows.
→ Add `.limit(100)` or cursor-based pagination.

**15. types.ts — loose types**
`ocr_raw_result: Record<string, unknown>` is too permissive.
→ Define explicit interfaces for OCR results and details.

**16. Toast — no auto-dismiss**
Toasts don't disappear automatically.
→ Auto-dismiss after 3 seconds with `setTimeout` in `useEffect`.

**17. supabase.ts — no env var validation**
`import.meta.env.VITE_SUPABASE_URL as string` silently passes `undefined` to `createClient`.
→ Throw at startup if env vars are missing.

---

## Low Priority

- Magic numbers undocumented: `400`ms debounce, `3` months cutoff, `0.4` similarity threshold → move to named constants
- `console.error` calls in production code → remove or gate behind `import.meta.env.DEV`
- Missing null checks in `DashboardView` before accessing order properties

---

## What to do differently in Tartelle

- Use `date-fns` from day one (no custom date math)
- Every hook returns `{ data, loading, error }` — no exceptions
- All multi-step DB writes go through RPC transactions
- Constants file (`colors`, `thresholds`, `timeouts`) from the start
- Realtime subscription cleanup always in the `useEffect` return
- Env var validation at app startup
