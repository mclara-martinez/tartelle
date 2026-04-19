/**
 * Split large SQL INSERT files into chunks and save them as separate files
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dir, '../output')

function splitInsertIntoChunks(sql: string, chunkSize: number): string[] {
  const valuesMarker = 'VALUES\n'
  const valuesIdx = sql.indexOf(valuesMarker) + valuesMarker.length
  const prefix = sql.slice(0, valuesIdx)
  const valuesPart = sql.slice(valuesIdx).replace(/;$/, '').trim()

  // Split on lines that start a new row: "),\n(" pattern
  const rows: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < valuesPart.length; i++) {
    if (valuesPart[i] === '(') depth++
    else if (valuesPart[i] === ')') {
      depth--
      if (depth === 0) {
        // Check if followed by comma
        const rest = valuesPart.slice(i + 1).trimStart()
        rows.push(valuesPart.slice(start, i + 1))
        start = i + 1
        while (start < valuesPart.length && (valuesPart[start] === ',' || valuesPart[start] === '\n')) start++
        i = start - 1
      }
    }
  }

  const chunks: string[] = []
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    chunks.push(prefix + chunk.join(',\n') + ';')
  }
  return chunks
}

function processFile(name: string, chunkSize: number) {
  const sql = readFileSync(resolve(OUT, `${name}.sql`), 'utf-8')
  const chunks = splitInsertIntoChunks(sql, chunkSize)
  console.log(`${name}: ${chunks.length} chunks`)
  chunks.forEach((chunk, i) => {
    writeFileSync(resolve(OUT, `${name}_chunk_${String(i+1).padStart(2,'0')}.sql`), chunk)
    const rowCount = (chunk.match(/^\(/gm) || []).length
    // Better: count commas at top level - just report chunk size
    console.log(`  chunk_${i+1}: ${chunk.length} bytes`)
  })
}

processFile('orders', 300)
processFile('order_items', 500)
