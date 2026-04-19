/**
 * Parse "INFORMACIÓN TARTELLE 2026.xlsx":
 *  - RESTAURANTESDESCUENTOS 2026 → customers (B2B)
 *  - PEDIDOS → orders + order_items (grouped by customer+date)
 *
 * Outputs:
 *  scripts/output/customers.json
 *  scripts/output/orders.json          (grouped orders with items[])
 *  scripts/output/unmapped_products.json
 *
 * Run: cd scripts && npx tsx import/03_parse_sheet.ts
 */

import XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const XLSX_PATH = resolve(__dir, '../../Copy of INFOMACIÓN TARTELLE 2026.xlsx')
const OUT = resolve(__dir, '../output')
mkdirSync(OUT, { recursive: true })

// ── Excel date → YYYY-MM-DD ───────────────────────────────────────────────────
function excelDate(n: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
  return d.toISOString().slice(0, 10)
}

// ── Product name → Siigo SKU mapping ─────────────────────────────────────────
// Base name → SKU. Additions (+ AREQUIPE etc) go to packaging_notes.
const PRODUCT_MAP: Record<string, string> = {
  // Tartas grandes
  'GRANDE OG': 'PT1',
  'GRANDE ORIGINAL': 'PT1',
  'GRANDE ORIGINAL X COOKIE WORLD': 'PT46',
  // Tartas medianas
  'MEDIANA OG': 'PT2',
  'MEDIANA ORIGINAL': 'PT2',
  'MEDIANA ORIGINAL X COOKIE WORLD': 'PT47',
  'MEDIANA LOTUS': 'PT14',
  'MEDIANA PISTACHO': 'PT5',
  'MEDIANA VAINILLA': 'PT11',
  'MEDIANA NAVIDAD': null, // seasonal — unmapped
  'MEDIANA NUTELLA': 'PT8',
  'MEDIANA MILO': 'PT17',
  'MEDIANA LIMON': 'PT20',
  // Tartas mini
  'MINI OG': 'PT3',
  'MINI ORIGINAL': 'PT3',
  'MINI LOTUS': 'PT15',
  'MINI PISTACHO': 'PT6',
  'MINI VAINILLA': 'PT12',
  'MINI NAVIDAD': null,
  'MINI MILO': 'PT18',
  'MINI LIMON': 'PT21',
  'MINI NUTELLA': 'PT9',
  'MINI ORIGINAL X COOKIE WORLD': 'PT48',
  'MINI TARTA ORIGINAL CAPACILLO X12': 'PT36',
  // Grandes
  'GRANDE LOTUS': 'PT13',
  'GRANDE PISTACHO': 'PT4',
  'GRANDE VAINILLA': 'PT10',
  'GRANDE LIMON': 'PT19',
  'GRANDE MILO': 'PT16',
  'GRANDE NUTELLA': 'PT7',
  'GRANDE NAVIDAD': null,
  // Porción
  'PORCION OG': 'PT43',
  'PORCION MILO': null, // no porcion milo SKU
  // Bites X4
  'BITES X4 OG': 'PT22',
  'BITES X4 ORIGINAL': 'PT22',
  'BITES': 'PT22',
  'BITES X4 LOTUS': 'PT23',
  'BITES X4 NUTELLA': 'PT24',
  'BITES X4 MILO': 'PT25',
  'BITES X4 VAINILLA MADAGASCAR': 'PT26',
  'BITES X4 PISTACHO': 'PT27',
  'BITES X4 LIMON': 'PT28',
  // Bites X16 (Café Vélez)
  'BITE X16 ORIGINAL VELEZ CAFE': 'PT75',
  'BITE X16 ORIGINAL': 'PT75',
  'BITE X16 MILO VELEZ CAFE': 'PT76',
  'BITE X16 PISTACHO VELEZ CAFE': 'PT77',
  // Mini Café Vélez
  'MINI ORIGINAL VELEZ CAFE': 'PT44',
  'MINI PISTACHO VELEZ CAFE': 'PT45',
  'MINI MILO CAFE VELEZ CAFE': 'PT50',
  // Cuchareables
  'CUCHAREABLE AREQUIPE': 'PT71',
  'CUCHAREABLE MILO': 'PT73',
  'CUCHAREABLE LOTUS': 'PT70',
  'CUCHAREABLE PISTACHO': 'PT74',
  'CUCHAREABLE LOTUS X35U': 'PT41',
  // Additions/toppings (sold as separate items)
  'AREQUIPE': 'PT71',       // map to cuchareable arequipe as closest
  'FRUTOS ROJOS': null,     // no standalone SKU
  'CREMA DE MILO': 'PT73',  // map to cuchareable milo
  'NUTELLA': 'PT24',        // map to bites nutella (closest)
  'CARAMELO SALADO': null,  // no standalone SKU
  // Brownies (full names with +)
  'BROWNIES DOBLE CHOCOLATE + FRAMBUESA': 'PT35',
  'BROWNIES DOBLE CHOCOLATE + FRAMBUESA X41U': 'PT35',
  // Tortas (full names with +)
  'TORTA CASERA + AREQUIPE X45U': 'PT40',
  'TORTA DE CHOCOLATE + NUTELLA X45U': 'PT38',
  'TORTA DE CHOCOLATE + NUTELLA X49U': 'PT38',
  // Galletas
  'GALLETA CHIPS CHOCOLATE X35': 'PT33',
  'GALLETA CHIPS CHOCOLATE BLANCO X35': 'PT32',
  // Brownies
  'BROWNIES DOBLE CHOCOLATE + FRAMBUESA': 'PT35',
  'BROWNIES DOBLE CHOCOLATE + FRAMBUESA X41U': 'PT35',
  // Other
  'DUO SUCREE X16U': 'PT37',
  'TORTA CASERA + AREQUIPE X45U': 'PT40',
  'TORTA DE CHOCOLATE + NUTELLA X45U': 'PT38',
  'TORTA DE CHOCOLATE + NUTELLA X49U': 'PT38',
  // Velas
  'VELA PALO DORADA': 'V3',
  'VELA PALO PLATEADA': 'V2',
  'VELAS HBD PLATEADA': 'V4',
  'VELAS HBD DORADA': 'V3',
  'VELAS HBD BRONCE': 'V1',
  // No SKU
  'VINO': null,
  'SE PORCIONA': null,
}

// Strip additions like "+ AREQUIPE", "+ FRUTOS ROJOS" from product name
function parseProductName(raw: string): { baseName: string; addition: string | null } {
  const name = raw.trim().toUpperCase()
  const plusIdx = name.indexOf(' + ')
  if (plusIdx !== -1) {
    return {
      baseName: name.slice(0, plusIdx).trim(),
      addition: name.slice(plusIdx + 3).trim(),
    }
  }
  return { baseName: name, addition: null }
}

function lookupSku(rawName: string): { sku: string | null; addition: string | null } {
  const fullName = rawName.trim().toUpperCase()
  // Try full name first (handles "BROWNIES DOBLE CHOCOLATE + FRAMBUESA" etc.)
  if (fullName in PRODUCT_MAP) {
    return { sku: PRODUCT_MAP[fullName], addition: null }
  }
  // Then try splitting at " + "
  const { baseName, addition } = parseProductName(rawName)
  const sku = PRODUCT_MAP[baseName] ?? null
  return { sku, addition }
}

// ── Parse payment method ──────────────────────────────────────────────────────
function parsePaymentMethod(raw: string): string | null {
  const v = String(raw).toUpperCase().trim()
  if (!v) return null
  if (v.includes('TRANSFER') || v.includes('NEQUI') || v.includes('BANCOLOMBIA')) return 'transfer'
  if (v.includes('EFECTIVO') || v.includes('CASH')) return 'cash'
  if (v.includes('TARJETA') || v.includes('CARD')) return 'card'
  if (v.includes('RAPPI')) return 'rappi'
  return null
}

// ── Determine channel from customer name ──────────────────────────────────────
function inferChannel(name: string): string {
  const n = name.toUpperCase().trim()
  if (n === 'RAPPI') return 'rappi'
  if (n === 'VENTA EN LOCAL' || n === 'VENTA LOCAL' || n === 'PDV') return 'walk_in'
  return 'whatsapp' // default for B2C individuals
}

// ════════════════════════════════════════════════════════════════════════════
// 1. CUSTOMERS from RESTAURANTESDESCUENTOS
// ════════════════════════════════════════════════════════════════════════════
const wb = XLSX.readFile(XLSX_PATH)

const ws1 = wb.Sheets['RESTAURANTESDESCUENTOS 2026']
const custRows = XLSX.utils.sheet_to_json<any[]>(ws1, { header: 1, defval: '' })

const customers: Record<string, any>[] = []
const customerNameIndex: Record<string, string> = {} // name.upper → id

let custSkipped = 0
for (const row of custRows.slice(1)) {
  const name = String(row[0] ?? '').trim()
  if (!name) { custSkipped++; continue }

  const discountRaw = row[1]
  const razonSocial = String(row[2] ?? '').trim() || null
  const status = String(row[3] ?? '').trim().toUpperCase()
  const domicilioFee = row[5]
  const observaciones = String(row[6] ?? '').trim()
  const marcacion = String(row[7] ?? '').trim()
  const credito = String(row[8] ?? '').trim()
  const address = String(row[9] ?? '').trim().replace(/\n/g, ', ') || null

  // Parse discount
  const discountPct = typeof discountRaw === 'number'
    ? discountRaw <= 1 ? discountRaw * 100 : discountRaw
    : 0

  // Parse NIT (razon social might be a NIT number or a company name)
  let nit: string | null = null
  let cleanRazonSocial: string | null = razonSocial
  if (razonSocial) {
    // Check if it looks like a cedula/NIT (only digits)
    const digitsOnly = razonSocial.replace(/[.\-]/g, '')
    if (/^\d{7,12}$/.test(digitsOnly)) {
      nit = digitsOnly
      cleanRazonSocial = null
    } else {
      // Extract NIT if embedded like "MERO SAS 901.444.356-0"
      const nitMatch = razonSocial.match(/(\d[\d.\-]{6,})\s*$/)
      if (nitMatch) {
        nit = nitMatch[1].replace(/[.\-]/g, '')
        cleanRazonSocial = razonSocial.replace(nitMatch[0], '').trim() || razonSocial
      }
    }
  }

  // Build notes
  const noteParts: string[] = []
  if (domicilioFee && domicilioFee !== 'N/A') noteParts.push('DOMICILIO: ' + domicilioFee)
  if (marcacion) noteParts.push('MARCACIÓN: ' + marcacion)
  if (credito) noteParts.push('CRÉDITO: ' + credito)
  if (observaciones) noteParts.push('OBS: ' + observaciones)

  const active = status === 'ACTIVO'

  // Deduplicate: skip if we already have this name with better or equal data
  const existingIdx = customers.findIndex(c => c.name === name)
  if (existingIdx !== -1) {
    // Keep the version with more data (address, razon_social)
    const existing = customers[existingIdx]
    if (!existing.address && address) existing.address = address
    if (!existing.razon_social && cleanRazonSocial) existing.razon_social = cleanRazonSocial
    if (!existing.nit && nit) existing.nit = nit
    custSkipped++
    continue
  }

  const id = crypto.randomUUID()
  customerNameIndex[name.toUpperCase()] = id

  customers.push({
    id,
    name,
    razon_social: cleanRazonSocial,
    nit,
    cedula: null,
    email: null,
    phone: null,
    address,
    type: 'b2b',
    discount_pct: discountPct,
    notes: noteParts.length ? noteParts.join(' | ') : null,
    active,
  })
}

console.log('✓ B2B Customers parsed:', customers.length, '(skipped empty:', custSkipped + ')')
console.log('  Active:', customers.filter(c => c.active).length)
console.log('  Inactive:', customers.filter(c => !c.active).length)

// ════════════════════════════════════════════════════════════════════════════
// 2. ORDERS from PEDIDOS
// ════════════════════════════════════════════════════════════════════════════
const ws2 = wb.Sheets['PEDIDOS']
const orderRows = XLSX.utils.sheet_to_json<any[]>(ws2, { header: 1, defval: '' })

// Group by (customerName + deliveryDate) → one order with items[]
const orderMap = new Map<string, any>()
const unmappedProducts = new Set<string>()

let rowsSkipped = 0
let rowsProcessed = 0

for (const row of orderRows.slice(1)) {
  const customerRaw = String(row[0] ?? '').trim()
  const dateSerial = row[1]
  const qty = typeof row[2] === 'number' ? row[2] : parseInt(String(row[2]), 10) || 1
  const productRaw = String(row[3] ?? '').trim()
  const notes = String(row[4] ?? '').trim()
  const paymentMethodRaw = String(row[5] ?? '').trim()
  const hasDomicilio = String(row[6] ?? '').toUpperCase() === 'SI'
  const domiciliario = String(row[7] ?? '').trim()
  const domicilioFee = typeof row[8] === 'number' ? row[8] : 0
  const totalPrice = typeof row[9] === 'number' ? row[9] : parseFloat(String(row[9])) || 0
  const isInvoiced = String(row[11] ?? '').toUpperCase() === 'SI'
  const isDelivered = String(row[12] ?? '').toUpperCase() === 'SI'

  if (!customerRaw || !dateSerial || !productRaw) { rowsSkipped++; continue }
  if (typeof dateSerial !== 'number') { rowsSkipped++; continue }

  const deliveryDate = excelDate(dateSerial)
  const { sku, addition } = lookupSku(productRaw)

  if (!sku) {
    unmappedProducts.add(productRaw)
  }

  // Order key: customer + date
  const orderKey = customerRaw.toUpperCase() + '|' + deliveryDate

  if (!orderMap.has(orderKey)) {
    const channel = inferChannel(customerRaw)
    const isB2B = !!customerNameIndex[customerRaw.toUpperCase()]
    const customerId = customerNameIndex[customerRaw.toUpperCase()] ?? null

    orderMap.set(orderKey, {
      id: crypto.randomUUID(),
      customer_id: customerId,
      customer_name: customerRaw,
      customer_phone: null,
      channel: isB2B ? 'b2b' : channel,
      status: 'delivered',
      delivery_date: deliveryDate,
      delivery_type: hasDomicilio ? 'delivery' : 'pickup',
      delivery_address: null,
      delivery_fee: domicilioFee,
      discount: 0,
      payment_method: parsePaymentMethod(paymentMethodRaw),
      payment_status: isInvoiced ? 'paid' : 'pending',
      notes: notes || null,
      packaging_notes: null,
      assigned_driver: domiciliario || null,
      subtotal: 0,
      total: 0,
      items: [],
    })
  }

  const order = orderMap.get(orderKey)!

  // Build item note
  const itemNote = addition ? '+' + addition : null
  if (itemNote && !order.packaging_notes) {
    order.packaging_notes = itemNote
  } else if (itemNote && order.packaging_notes && !order.packaging_notes.includes(itemNote)) {
    order.packaging_notes += ', ' + itemNote
  }

  if (sku) {
    order.items.push({
      id: crypto.randomUUID(),
      product_sku: sku,
      quantity: qty,
      unit_price: qty > 0 && totalPrice > 0 ? Math.round(totalPrice / qty) : 0,
      subtotal: totalPrice,
      note: itemNote,
    })
    order.subtotal += totalPrice
    order.total += totalPrice + (order.items.length === 1 ? domicilioFee : 0)
  }

  rowsProcessed++
}

const orders = Array.from(orderMap.values()).filter(o => o.items.length > 0)

console.log('\n✓ Orders parsed:', orders.length)
console.log('  Source rows processed:', rowsProcessed, '| skipped:', rowsSkipped)
console.log('  With customer match (B2B):', orders.filter(o => o.customer_id).length)
console.log('  B2C/walk-in/rappi:', orders.filter(o => !o.customer_id).length)

console.log('\n⚠ Unmapped products (' + unmappedProducts.size + ') — orders with these have no items:')
;[...unmappedProducts].forEach(p => console.log('  -', p))

// Save outputs
writeFileSync(resolve(OUT, 'customers.json'), JSON.stringify(customers, null, 2))
writeFileSync(resolve(OUT, 'orders.json'), JSON.stringify(orders, null, 2))
writeFileSync(resolve(OUT, 'unmapped_products.json'), JSON.stringify([...unmappedProducts], null, 2))

console.log('\n✓ Saved to scripts/output/')
