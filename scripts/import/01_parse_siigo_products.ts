/**
 * Parse Siigo "Gestión de productos y servicios" xlsx export
 * → outputs products JSON ready for Supabase insert
 *
 * Filters:  PT# | PTN# | V#  (active, price > 0)
 * Skip:     MP#, PTPOS#, Dom01, generics
 * Run:      cd scripts && npx tsx import/01_parse_siigo_products.ts
 */

import XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const XLSX_PATH = resolve(__dir, '../../Gestión de productos y servicios-20260419162752.xlsx')
const OUTPUT_PATH = resolve(__dir, '../output/products.json')

type ProductSize = 'grande' | 'mediana' | 'mini' | 'porcion' | 'other'
type ProductCategory = 'tarta' | 'bites' | 'cucheareable' | 'vela' | 'torta' | 'galleta' | 'brownie' | 'pan' | 'otro'
type TaxType = 'impoconsumo_8' | 'iva_19' | 'iva_0' | null

function inferSize(name: string): ProductSize {
  const n = name.toUpperCase()
  if (n.includes('PORCION') || n.includes('PORCIÓN')) return 'porcion'
  if (n.includes('GRANDE')) return 'grande'
  if (n.includes('MEDIANA')) return 'mediana'
  if (n.includes('MINI')) return 'mini'
  return 'other'
}

function inferCategory(sku: string, name: string): ProductCategory {
  const n = name.toUpperCase()
  if (/^V\d/.test(sku)) return 'vela'
  if (/^PTN/.test(sku) && n.includes('PAN')) return 'pan'
  if (n.startsWith('TARTA') || n.startsWith('TARTE')) return 'tarta'
  if (n.includes('CUCHAREABLE')) return 'cucheareable'
  if (n.includes('BITE') || n.startsWith('BITES')) return 'bites'
  if (n.includes('BROWNIE')) return 'brownie'
  if (n.includes('GALLETA')) return 'galleta'
  if (n.includes('TORTA')) return 'torta'
  return 'otro'
}

function inferFlavor(name: string): string {
  const n = name.toUpperCase()
  if (n.includes('PISTACHO')) return 'Pistacho'
  if (n.includes('LOTUS')) return 'Lotus'
  if (n.includes('NUTELLA')) return 'Nutella'
  if (n.includes('MILO')) return 'Milo'
  if (n.includes('LIMON') || n.includes('LIMÓN')) return 'Limón'
  if (n.includes('VAINILLA MADAGASCAR')) return 'Vainilla Madagascar'
  if (n.includes('VAINILLA')) return 'Vainilla'
  if (n.includes('AREQUIPE')) return 'Arequipe'
  if (n.includes('FRUTOS ROJOS')) return 'Frutos Rojos'
  if (n.includes('MARACUYA') || n.includes('MARACUYÁ')) return 'Maracuyá'
  if (n.includes('CHOCOLATE BLANCO') || (n.includes('BLANCO') && n.includes('CHOCOLATE'))) return 'Chocolate Blanco'
  if (n.includes('DOBLE CHOCOLATE')) return 'Doble Chocolate'
  if (n.includes('CHOCOLATE')) return 'Chocolate'
  if (n.includes('CHIPS')) return 'Chips Chocolate'
  if (n.includes(' OG') || n.endsWith(' OG') || n.includes('ORIGINAL')) return 'Original'
  return name
}

function inferTaxType(taxStr: string): TaxType {
  if (taxStr.includes('Impoconsumo')) return 'impoconsumo_8'
  if (taxStr.includes('IVA 19%')) return 'iva_19'
  if (taxStr.includes('IVA 0%')) return 'iva_0'
  return null
}

function requiresAdvanceOrder(size: ProductSize, category: ProductCategory): boolean {
  return category === 'tarta' && (size === 'grande' || size === 'mediana')
}

const ALLOWED_PREFIXES = /^(PT\d|PTN|V\d)/

const wb = XLSX.readFile(XLSX_PATH)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
const dataRows = rows.slice(4)

const products: Record<string, any>[] = []
const skipped: { sku: string; name: string; reason: string }[] = []

for (const row of dataRows) {
  const sku = String(row[1] ?? '').trim()
  const name = String(row[2] ?? '').trim()
  const price = typeof row[4] === 'number' ? row[4] : parseFloat(String(row[4]).replace(/[^0-9.-]/g, ''))
  const taxStr = String(row[5] ?? '')
  const stock = typeof row[6] === 'number' ? row[6] : parseInt(String(row[6]), 10) || 0
  const status = String(row[7] ?? '').trim()

  if (!sku || !name) continue

  if (!ALLOWED_PREFIXES.test(sku)) {
    skipped.push({ sku, name, reason: 'prefix not in PT|PTN|V' })
    continue
  }
  if (status !== 'Active') {
    skipped.push({ sku, name, reason: 'inactive' })
    continue
  }
  if (!(price > 0)) {
    skipped.push({ sku, name, reason: 'price = 0' })
    continue
  }

  const size = inferSize(name)
  const category = inferCategory(sku, name)
  const flavor = inferFlavor(name)
  const taxType = inferTaxType(taxStr)

  products.push({
    sku,
    name,
    flavor,
    size,
    category,
    base_price: price,
    tax_type: taxType,
    requires_advance_order: requiresAdvanceOrder(size, category),
    active: true,
    _siigo_stock: Math.max(0, stock),
  })
}

products.sort((a, b) => {
  const numA = parseInt(String(a.sku).replace(/\D/g, '')) || 0
  const numB = parseInt(String(b.sku).replace(/\D/g, '')) || 0
  return numA - numB
})

mkdirSync(resolve(__dir, '../output'), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(products, null, 2), 'utf-8')

console.log('\n✓ Products parsed: ' + products.length)
console.log('✗ Skipped: ' + skipped.length)

console.log('\nSample (first 5):')
products.slice(0, 5).forEach(p => {
  console.log('  ' + p.sku + '\t' + p.flavor + '\t' + p.size + '\t' + p.category + '\t$' + p.base_price.toLocaleString())
})

console.log('\nCategory breakdown:')
const catCounts: Record<string, number> = {}
products.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1 })
Object.entries(catCounts)
  .sort(([, a], [, b]) => b - a)
  .forEach(([k, v]) => console.log('  ' + k + ': ' + v))

console.log('\nSkipped (price=0 or wrong prefix):')
skipped.forEach(s => console.log('  ' + s.sku + '\t' + s.name + '\t(' + s.reason + ')'))

console.log('\nOutput: ' + OUTPUT_PATH)
