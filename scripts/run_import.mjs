import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const OUT = resolve('output')
const PROJECT_ID = 'tnxhjvmkoplfyynicajn'

// We'll use the Supabase Management API with MCP credentials
// Instead, let's output the curl commands to verify the approach
const files = readdirSync(OUT).filter(f => f.match(/^orders_c\d+\.sql$/)).sort()
console.log('Order chunks:', files.length)
files.forEach(f => {
  const content = readFileSync(resolve(OUT, f), 'utf-8')
  console.log(f, content.length, 'bytes')
})
