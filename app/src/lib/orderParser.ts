import type { Product, DeliveryType } from './types'
import { today, tomorrow } from './utils'
import { addDays, nextDay, format } from 'date-fns'

export interface ParsedOrderItem {
  product_id: string
  quantity: number
  unit_price: number
  flavor: string
  size: string
}

export interface ParsedOrder {
  items: ParsedOrderItem[]
  deliveryDate: string | null
  deliveryType: DeliveryType | null
  customerName: string | null
  unmatched: string[]
}

// Normalize accents and lowercase for fuzzy matching
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// Day-of-week mapping (Spanish)
const DAY_MAP: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0,
}

function parseDateFromText(text: string): string | null {
  const n = normalize(text)

  if (n.includes('hoy')) return today()
  if (n.includes('manana') || n.includes('mañana')) return tomorrow()
  if (n.includes('pasado manana') || n.includes('pasado mañana')) {
    return format(addDays(new Date(), 2), 'yyyy-MM-dd')
  }

  // Match day names: "el viernes", "para el sabado"
  for (const [dayName, dayIdx] of Object.entries(DAY_MAP)) {
    if (n.includes(dayName)) {
      const next = nextDay(new Date(), dayIdx as 0 | 1 | 2 | 3 | 4 | 5 | 6)
      return format(next, 'yyyy-MM-dd')
    }
  }

  // Match explicit date: "5 de abril", "abril 5"
  const months: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  }
  for (const [monthName, monthIdx] of Object.entries(months)) {
    const regex = new RegExp(`(\\d{1,2})\\s*(?:de\\s*)?${monthName}|${monthName}\\s*(\\d{1,2})`)
    const match = n.match(regex)
    if (match) {
      const day = parseInt(match[1] || match[2])
      const d = new Date()
      d.setMonth(monthIdx, day)
      if (d < new Date()) d.setFullYear(d.getFullYear() + 1)
      return format(d, 'yyyy-MM-dd')
    }
  }

  return null
}

function parseDeliveryType(text: string): DeliveryType | null {
  const n = normalize(text)
  if (n.includes('domicilio') || n.includes('delivery') || n.includes('envio') || n.includes('enviar')) return 'delivery'
  if (n.includes('recoge') || n.includes('pickup') || n.includes('recoger') || n.includes('paso por')) return 'pickup'
  return null
}

// Size aliases
const SIZE_ALIASES: Record<string, string> = {
  grande: 'grande', gran: 'grande', g: 'grande', lg: 'grande',
  mediana: 'mediana', med: 'mediana', m: 'mediana', md: 'mediana',
  mini: 'mini', pequeña: 'mini', peque: 'mini', chica: 'mini', s: 'mini', sm: 'mini',
}

export function parseOrderMessage(text: string, products: Product[]): ParsedOrder {
  const result: ParsedOrder = {
    items: [],
    deliveryDate: parseDateFromText(text),
    deliveryType: parseDeliveryType(text),
    customerName: null,
    unmatched: [],
  }

  if (!products.length) {
    result.unmatched = [text]
    return result
  }

  // Build a flavor lookup: normalized flavor -> product entries by size
  const flavorMap = new Map<string, Product[]>()
  for (const p of products) {
    const key = normalize(p.flavor)
    if (!flavorMap.has(key)) flavorMap.set(key, [])
    flavorMap.get(key)!.push(p)
  }

  const normalizedText = normalize(text)

  // Strategy: scan for patterns like "2 mini maracuya", "1 grande lotus", "3 medianas de frutos rojos"
  // Also handle: "2 maracuya mini", "maracuya grande x2"

  const usedRanges: [number, number][] = []

  // Pattern 1: quantity + size + flavor: "2 mini maracuya"
  // Pattern 2: quantity + flavor + size: "2 maracuya mini"
  // Pattern 3: quantity + "de" + flavor: "2 de maracuya" (default size)
  // Pattern 4: flavor + size + "x" + quantity: "maracuya mini x2"

  const flavorNames = [...flavorMap.keys()].sort((a, b) => b.length - a.length) // longest first
  const sizeNames = Object.keys(SIZE_ALIASES).sort((a, b) => b.length - a.length)

  // Build regex patterns for each flavor
  for (const flavorKey of flavorNames) {
    // Escape regex special chars
    const flavorRegex = flavorKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const sizeRegex = sizeNames.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')

    const patterns = [
      // "2 mini maracuya" or "2 medianas maracuya"
      new RegExp(`(\\d+)\\s*(?:${sizeRegex})s?\\s+(?:de\\s+)?${flavorRegex}`, 'g'),
      // "2 maracuya mini"
      new RegExp(`(\\d+)\\s+(?:de\\s+)?${flavorRegex}\\s+(${sizeRegex})`, 'g'),
      // "maracuya mini x2" or "maracuya grande x 2"
      new RegExp(`${flavorRegex}\\s+(${sizeRegex})\\s*[x×]\\s*(\\d+)`, 'g'),
      // Just "2 maracuya" (no size specified, will use mediana as default)
      new RegExp(`(\\d+)\\s+(?:de\\s+)?${flavorRegex}(?!\\s*(?:${sizeRegex}))`, 'g'),
      // Just "maracuya" alone (qty=1, no size)
      new RegExp(`(?:^|\\s)${flavorRegex}(?:\\s|$|,|\\.)`, 'g'),
    ]

    for (let pi = 0; pi < patterns.length; pi++) {
      const regex = patterns[pi]
      let match: RegExpExecArray | null

      while ((match = regex.exec(normalizedText)) !== null) {
        // Check if this range is already consumed
        const start = match.index
        const end = start + match[0].length
        if (usedRanges.some(([s, e]) => start < e && end > s)) continue

        let qty = 1
        let sizeKey = 'mediana' // default

        if (pi === 0) {
          // qty + size + flavor
          qty = parseInt(match[1]) || 1
          // Extract size from the match
          const sizeMatch = match[0].match(new RegExp(`(${sizeRegex})s?`, 'i'))
          if (sizeMatch) sizeKey = SIZE_ALIASES[normalize(sizeMatch[1])] || 'mediana'
        } else if (pi === 1) {
          // qty + flavor + size
          qty = parseInt(match[1]) || 1
          sizeKey = SIZE_ALIASES[normalize(match[2])] || 'mediana'
        } else if (pi === 2) {
          // flavor + size + xN
          sizeKey = SIZE_ALIASES[normalize(match[1])] || 'mediana'
          qty = parseInt(match[2]) || 1
        } else if (pi === 3) {
          // qty + flavor (no size)
          qty = parseInt(match[1]) || 1
        } else {
          // Just flavor name
          qty = 1
        }

        const candidates = flavorMap.get(flavorKey) ?? []
        const product = candidates.find(p => p.size === sizeKey) || candidates[0]
        if (product) {
          // Check if we already have this product
          const existing = result.items.find(i => i.product_id === product.id)
          if (existing) {
            existing.quantity += qty
          } else {
            result.items.push({
              product_id: product.id,
              quantity: qty,
              unit_price: product.base_price,
              flavor: product.flavor,
              size: product.size,
            })
          }
          usedRanges.push([start, end])
        }
      }
    }
  }

  // If we couldn't parse any items, put the whole message as unmatched
  if (result.items.length === 0) {
    // Remove common noise words and check what's left
    const noise = ['hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches', 'quiero', 'pedir', 'quisiera',
      'necesito', 'me', 'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'para', 'por', 'favor',
      'gracias', 'cheesecake', 'torta', 'postre']
    const remaining = normalizedText.split(/\s+/).filter(w => !noise.includes(w) && w.length > 1)
    if (remaining.length > 0) {
      result.unmatched = [text.trim()]
    }
  }

  return result
}
