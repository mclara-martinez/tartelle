/**
 * Execute SQL files against Supabase in batches
 * Run: cd scripts && npx tsx import/05_execute_sql.ts
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dir, '../output')

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function splitInsertIntoChunks(sql: string, chunkSize: number): string[] {
  // Extract the INSERT INTO ... VALUES prefix
  const valuesIdx = sql.indexOf('VALUES\n') + 'VALUES\n'.length
  const prefix = sql.slice(0, valuesIdx)
  const valuesPart = sql.slice(valuesIdx, -1) // remove trailing semicolon

  // Split into individual value rows (each starts with '(' and ends with ')')
  const rows = valuesPart.split(',\n(').map((r, i) => i === 0 ? r : '(' + r)

  const chunks: string[] = []
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    chunks.push(prefix + chunk.join(',\n') + ';')
  }
  return chunks
}

async function execChunks(label: string, sqlFile: string, chunkSize: number) {
  const sql = readFileSync(resolve(OUT, sqlFile), 'utf-8')
  const chunks = splitInsertIntoChunks(sql, chunkSize)
  console.log(`\n${label}: ${chunks.length} chunks (${chunkSize} rows each)`)
  
  for (let i = 0; i < chunks.length; i++) {
    const { error } = await supabase.rpc('exec_sql', { query: chunks[i] }).catch(() => ({ error: null }))
    // Use fetch directly
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ query: chunks[i] })
    })
    if (!res.ok) {
      console.error(`  Chunk ${i + 1}/${chunks.length} FAILED:`, await res.text())
    } else {
      console.log(`  Chunk ${i + 1}/${chunks.length} OK`)
    }
  }
}

await execChunks('orders', 'orders.sql', 300)
await execChunks('order_items', 'order_items.sql', 500)
