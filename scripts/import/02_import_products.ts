/**
 * Import parsed Siigo products → Supabase
 * Run AFTER 01_parse_siigo_products.ts
 * Run: cd scripts && npx tsx import/02_import_products.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const PRODUCTS_PATH = resolve(__dir, '../output/products.json')

const SUPABASE_URL = 'https://tnxhjvmkoplfyynicajn.supabase.co'
// Using service role key for RLS bypass on import
// Set SUPABASE_SERVICE_ROLE_KEY env var before running
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const products: Record<string, any>[] = JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8'))

console.log('Importing ' + products.length + ' products...')

// Strip the internal _siigo_stock field before inserting
const rows = products.map(({ _siigo_stock: _, ...p }) => p)

const { data, error } = await supabase
  .from('products')
  .upsert(rows, { onConflict: 'sku' })
  .select('id, sku, name')

if (error) {
  console.error('Import failed:', error.message)
  process.exit(1)
}

console.log('✓ Inserted/updated ' + (data?.length ?? 0) + ' products')
data?.slice(0, 10).forEach((p: any) => console.log('  ' + p.sku + '\t' + p.name))
