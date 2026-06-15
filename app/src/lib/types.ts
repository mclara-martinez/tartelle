export type CustomerType = 'b2c' | 'b2b' | 'pos'
export type OrderChannel = 'whatsapp' | 'rappi' | 'didi' | 'instagram' | 'walk_in' | 'b2b'
export type OrderStatus = 'confirmed' | 'in_production' | 'ready' | 'dispatched' | 'delivered' | 'cancelled'
export type DeliveryType = 'pickup' | 'delivery'
export type ProductSize = 'grande' | 'mediana' | 'mini' | 'porcion' | 'other' | 'unidad' | 'x4' | 'x8' | 'x12' | 'x16' | 'x20' | 'x35' | 'x41' | 'x49' | '320g' | 'NA'
export type ProductCategory = 'tartas' | 'bites' | 'cucheareables' | 'tortas' | 'galletas' | 'brownies' | 'complementos' | 'duos' | 'naisha' | 'catering'
export type ProductCatalog = 'retail' | 'eventos' | 'ambos' | 'cafe_velez'
export type TaxType = 'impoconsumo_8' | 'iva_19' | 'iva_0' | null
export type InventoryReason = 'production' | 'sale' | 'adjustment' | 'waste'
export type PlanStatus = 'draft' | 'sent' | 'in_progress' | 'done'
export type PaymentStatus = 'pending' | 'paid' | 'credit'
export type PaymentMethod = 'transfer' | 'cash' | 'bold' | 'rappi'
export type PaymentBank = 'bancolombia' | 'itau' | 'davivienda' | 'nequi' | 'bbva'
export type CardType = 'debit' | 'credit'

export interface Customer {
  id: string
  name: string
  cedula: string | null
  razon_social: string | null
  nit: string | null
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
  sku: string | null
  name: string
  flavor: string
  size: ProductSize
  category: ProductCategory | null
  base_price: number
  tax_type: TaxType
  requires_advance_order: boolean
  catalog: ProductCatalog
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
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  payment_bank: PaymentBank | null
  card_type: CardType | null
  payment_receipt_url: string | null
  billing_name: string | null
  billing_id_number: string | null
  billing_email: string | null
  packaging_notes: string | null
  assigned_driver: string | null
  picked_up_at: string | null
  dispatched_at: string | null
  delivered_at: string | null
  dispatch_photo_url: string | null
  invoice_photo_url: string | null
  invoice_delivered_physically: boolean
  estimated_delivery_time: string | null
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
  user_id: string | null
  user_email: string | null
  created_at: string
}

export interface ProductionPlan {
  id: string
  date: string
  status: PlanStatus
  created_at: string
  items?: ProductionPlanItem[]
}

export interface ProductionExtra {
  id: string
  date: string
  product_id: string
  quantity: number
  notes: string | null
  created_at: string
  product?: Product
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

export type AppRole = 'admin' | 'kitchen' | 'driver' | 'owner'

export interface DayClosureDetail {
  product_id: string
  product_name: string
  produced: number
  sold: number
  system_stock: number
  declared_surplus: number
}

export interface DayClosure {
  id: string
  date: string
  user_id: string | null
  closed_at: string
  is_adjusted: boolean
  details: DayClosureDetail[]
  created_at: string
}

export interface QualityLog {
  id: string
  product_id: string
  date: string
  user_id: string | null
  user_email: string | null
  items_fallidos: string[]
  observacion: string | null
  order_id: string | null
  photo_path: string | null
  created_at: string
  product?: Product
}

export interface AppUser {
  id: string
  email: string
  role: AppRole
  created_at: string
  last_sign_in_at: string | null
  banned_until: string | null
}
