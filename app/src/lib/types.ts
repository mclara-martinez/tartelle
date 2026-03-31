export type CustomerType = 'b2c' | 'b2b' | 'pos'
export type OrderChannel = 'whatsapp' | 'rappi' | 'instagram' | 'walk_in' | 'b2b'
export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready' | 'dispatched' | 'delivered' | 'cancelled'
export type DeliveryType = 'pickup' | 'delivery'
export type ProductSize = 'grande' | 'mediana' | 'mini'
export type InventoryReason = 'production' | 'sale' | 'adjustment' | 'waste'
export type PlanStatus = 'draft' | 'sent' | 'in_progress' | 'done'

export interface Customer {
  id: string
  name: string
  cedula: string | null
  email: string | null
  phone: string | null
  address: string | null
  type: CustomerType
  discount_pct: number
  notes: string | null
  active: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  flavor: string
  size: ProductSize
  base_price: number
  requires_advance_order: boolean
  active: boolean
  created_at: string
}

export interface Order {
  id: string
  customer_id: string | null
  channel: OrderChannel
  status: OrderStatus
  delivery_date: string
  delivery_type: DeliveryType
  delivery_address: string | null
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  notes: string | null
  customer_name: string | null
  customer_phone: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
  customer?: Customer | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  product?: Product
}

export interface InventoryFinished {
  id: string
  product_id: string
  quantity: number
  updated_at: string
  product?: Product
}

export interface InventoryLog {
  id: string
  product_id: string
  change: number
  reason: InventoryReason
  reference_id: string | null
  notes: string | null
  created_at: string
}

export interface ProductionPlan {
  id: string
  date: string
  status: PlanStatus
  created_at: string
  items?: ProductionPlanItem[]
}

export interface ProductionPlanItem {
  id: string
  plan_id: string
  product_id: string
  quantity: number
  completed: boolean
  created_at: string
  product?: Product
}
