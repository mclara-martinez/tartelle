/**
 * Insert remaining orders + order_items via Supabase REST API
 * (bypasses MCP which is currently down)
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dir, '../output')

const SUPABASE_URL = 'https://tnxhjvmkoplfyynicajn.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRueGhqdm1rb3BsZnl5bmljYWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTkxMzMsImV4cCI6MjA5MDQ5NTEzM30.3M0j3mBeUGNNmEyNUHY3eugWYMVg9D1sghohUygqjuc'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

const orders: any[] = JSON.parse(readFileSync(resolve(OUT, 'orders.json'), 'utf-8'))
const allOrderItems: any[] = JSON.parse(readFileSync(resolve(OUT, 'orders.json'), 'utf-8'))
  .flatMap((o: any) => o.items.map((item: any) => ({ ...item, order_id: o.id })))

// Check how many are already inserted
const { count: existingOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true })
console.log(`Already inserted: ${existingOrders} orders`)

// Fetch existing order IDs to skip
const { data: existingIds } = await supabase.from('orders').select('id')
const existingSet = new Set((existingIds || []).map((r: any) => r.id))

const remaining = orders.filter(o => !existingSet.has(o.id))
console.log(`Remaining to insert: ${remaining.length} orders`)

if (remaining.length === 0) {
  console.log('All orders already inserted!')
} else {
  // Insert in batches of 50
  const BATCH = 50
  for (let i = 0; i < remaining.length; i += BATCH) {
    const batch = remaining.slice(i, i + BATCH).map(o => ({
      id: o.id,
      customer_id: o.customer_id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      channel: o.channel,
      status: 'delivered',
      delivery_date: o.delivery_date,
      delivery_type: o.delivery_type,
      delivery_address: null,
      subtotal: o.subtotal,
      delivery_fee: o.delivery_fee,
      discount: 0,
      total: o.subtotal + o.delivery_fee,
      notes: o.notes,
      packaging_notes: o.packaging_notes,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      assigned_driver: o.assigned_driver,
    }))
    
    const { error } = await supabase.from('orders').insert(batch)
    if (error) {
      console.error(`  Batch ${Math.floor(i/BATCH)+1} error:`, error.message)
    } else {
      console.log(`  Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(remaining.length/BATCH)} OK (${batch.length} rows)`)
    }
  }
}

// Now handle order_items
console.log('\n--- Order Items ---')

// First, build sku→id map from products table
const { data: products } = await supabase.from('products').select('id, sku')
const skuToId: Record<string, string> = {}
for (const p of (products || [])) {
  if (p.sku) skuToId[p.sku] = p.id
}
console.log(`Product map: ${Object.keys(skuToId).length} SKUs`)

// Check existing order_items
const { count: existingItems } = await supabase.from('order_items').select('*', { count: 'exact', head: true })
console.log(`Already inserted: ${existingItems} order_items`)

if (existingItems! > 0) {
  console.log('Some order_items already exist — checking which orders are covered...')
  const { data: coveredOrders } = await supabase.from('order_items').select('order_id')
  const coveredOrderIds = new Set((coveredOrders || []).map((r: any) => r.order_id))
  
  const allItems: any[] = []
  for (const order of orders) {
    if (coveredOrderIds.has(order.id)) continue
    for (const item of order.items) {
      const productId = skuToId[item.product_sku]
      if (!productId) continue
      allItems.push({
        id: item.id,
        order_id: order.id,
        product_id: productId,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })
    }
  }
  console.log(`Remaining order_items to insert: ${allItems.length}`)
  
  const BATCH = 100
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH)
    const { error } = await supabase.from('order_items').insert(batch)
    if (error) {
      console.error(`  Batch ${Math.floor(i/BATCH)+1} error:`, error.message)
    } else {
      process.stdout.write('.')
    }
  }
  console.log('\n')
} else {
  // Insert all items
  const allItems: any[] = []
  for (const order of orders) {
    for (const item of order.items) {
      const productId = skuToId[item.product_sku]
      if (!productId) continue
      allItems.push({
        id: item.id,
        order_id: order.id,
        product_id: productId,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })
    }
  }
  console.log(`Total order_items to insert: ${allItems.length}`)
  
  const BATCH = 100
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH)
    const { error } = await supabase.from('order_items').insert(batch)
    if (error) {
      console.error(`  Batch ${Math.floor(i/BATCH)+1} error:`, error.message)
    } else {
      process.stdout.write('.')
    }
  }
  console.log('\n')
}

// Final count
const { count: finalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true })
const { count: finalItems } = await supabase.from('order_items').select('*', { count: 'exact', head: true })
const { count: finalCustomers } = await supabase.from('customers').select('*', { count: 'exact', head: true })
console.log(`\n✓ Final counts:`)
console.log(`  Customers: ${finalCustomers}`)
console.log(`  Orders: ${finalOrders}`)
console.log(`  Order items: ${finalItems}`)
