/**
 * Generate SQL INSERT statements from parsed customers + orders JSON
 * Prints: customers.sql  orders.sql  order_items.sql
 * Run: cd scripts && npx tsx import/04_generate_sql.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dir, '../output')

const customers: any[] = JSON.parse(readFileSync(resolve(OUT, 'customers.json'), 'utf-8'))
const orders: any[] = JSON.parse(readFileSync(resolve(OUT, 'orders.json'), 'utf-8'))

const esc = (v: any): string => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

// ── Customers SQL ─────────────────────────────────────────────────────────────
const custValues = customers.map(c =>
  `(${esc(c.id)}, ${esc(c.name)}, ${esc(c.cedula)}, ${esc(c.razon_social)}, ${esc(c.nit)}, NULL, ${esc(c.phone)}, ${esc(c.address)}, 'b2b', ${c.discount_pct}, ${esc(c.notes)}, ${c.active}, NOW())`
)
const custSQL = `INSERT INTO customers (id, name, cedula, razon_social, nit, email, phone, address, type, discount_pct, notes, active, created_at) VALUES\n${custValues.join(',\n')};`
writeFileSync(resolve(OUT, 'customers.sql'), custSQL)

// ── Orders SQL ────────────────────────────────────────────────────────────────
const ordValues = orders.map(o =>
  `(${esc(o.id)}, ${esc(o.customer_id)}, ${esc(o.customer_name)}, ${esc(o.customer_phone)}, ${esc(o.channel)}, 'delivered', ${esc(o.delivery_date)}, ${esc(o.delivery_type)}, NULL, ${o.subtotal}, ${o.delivery_fee}, 0, ${o.subtotal + o.delivery_fee}, ${esc(o.notes)}, ${esc(o.packaging_notes)}, ${esc(o.payment_status)}, ${esc(o.payment_method)}, NULL, NULL, NULL, NULL, ${esc(o.assigned_driver)}, NULL, NULL, NULL, NULL, NOW(), NOW())`
)
const ordSQL = `INSERT INTO orders (id, customer_id, customer_name, customer_phone, channel, status, delivery_date, delivery_type, delivery_address, subtotal, delivery_fee, discount, total, notes, packaging_notes, payment_status, payment_method, payment_bank, card_type, payment_receipt_url, invoice_photo_url, assigned_driver, dispatch_photo_url, picked_up_at, delivered_at, created_at, updated_at) VALUES\n${ordValues.join(',\n')};`
writeFileSync(resolve(OUT, 'orders.sql'), ordSQL)

// ── Order Items SQL ───────────────────────────────────────────────────────────
const allItems: string[] = []
for (const order of orders) {
  for (const item of order.items) {
    allItems.push(
      `(${esc(item.id)}, ${esc(order.id)}, (SELECT id FROM products WHERE sku = ${esc(item.product_sku)}), ${item.quantity}, ${item.unit_price}, ${item.subtotal}, NOW())`
    )
  }
}
const itemsSQL = `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal, created_at) VALUES\n${allItems.join(',\n')};`
writeFileSync(resolve(OUT, 'order_items.sql'), itemsSQL)

console.log('✓ Customers:', customers.length, 'rows →', (custSQL.length / 1024).toFixed(0) + 'KB')
console.log('✓ Orders:', orders.length, 'rows →', (ordSQL.length / 1024).toFixed(0) + 'KB')
console.log('✓ Order items:', allItems.length, 'rows →', (itemsSQL.length / 1024).toFixed(0) + 'KB')
console.log('\nAvg items per order:', (allItems.length / orders.length).toFixed(1))
