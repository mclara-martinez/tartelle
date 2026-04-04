import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useInventory } from '../hooks/useInventory'
import { useCustomerSearch, useRecentCustomers, createCustomer } from '../hooks/useCustomers'
import { createOrder } from '../hooks/useOrders'
import { parseOrderMessage } from '../lib/orderParser'
import type { Customer, OrderChannel, DeliveryType, ProductSize } from '../lib/types'
import { CHANNEL_LABELS, DELIVERY_FEE, SIZE_LABELS } from '../lib/constants'
import { formatCOP, today, tomorrow, cn } from '../lib/utils'
import { Toast } from '../components/Toast'
import {
  ArrowLeft, ArrowRight, Search, User, Zap, MessageSquare,
  Plus, Minus, Trash2, MapPin, Calendar, Check, X,
  Camera, Bike, Store, Building2,
} from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5

interface OrderItem {
  product_id: string
  quantity: number
  unit_price: number
}

interface WizardState {
  // Step 1 — Client
  customer: Customer | null
  customerName: string
  customerPhone: string
  isNewCustomer: boolean
  // Step 2 — Channel
  channel: OrderChannel
  // Step 3 — Products
  items: OrderItem[]
  // Step 4 — Delivery
  deliveryDate: string
  deliveryType: DeliveryType
  deliveryAddress: string
  // Step 5 — Notes
  notes: string
}

const INITIAL_STATE: WizardState = {
  customer: null,
  customerName: '',
  customerPhone: '',
  isNewCustomer: false,
  channel: 'whatsapp',
  items: [],
  deliveryDate: tomorrow(),
  deliveryType: 'pickup',
  deliveryAddress: '',
  notes: '',
}

const STEP_LABELS = ['Cliente', 'Canal', 'Productos', 'Entrega', 'Resumen']

export function IntakeWizardView({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [quickMode, setQuickMode] = useState(false)

  const { products, loading: productsLoading } = useProducts()
  const { inventory } = useInventory()

  // Computed
  const subtotal = state.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const deliveryFee = state.deliveryType === 'delivery' ? DELIVERY_FEE : 0
  const discount = state.customer?.discount_pct ? Math.round(subtotal * state.customer.discount_pct / 100) : 0
  const total = subtotal + deliveryFee - discount

  function goTo(target: Step) {
    setDirection(target > step ? 'forward' : 'back')
    setStep(target)
  }

  function next() {
    if (step < 5) goTo((step + 1) as Step)
  }

  function back() {
    if (step > 1) goTo((step - 1) as Step)
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return state.customerName.trim().length > 0
      case 2: return true
      case 3: return state.items.length > 0
      case 4: return state.deliveryDate.length > 0
      case 5: return true
      default: return false
    }
  }

  function getStockForProduct(productId: string): number | null {
    const inv = inventory.find(i => i.product_id === productId)
    return inv ? inv.quantity : null
  }

  function addItem(productId: string) {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const existing = state.items.find(i => i.product_id === productId)
    if (existing) {
      setState(s => ({
        ...s,
        items: s.items.map(i => i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i),
      }))
    } else {
      setState(s => ({
        ...s,
        items: [...s.items, { product_id: productId, quantity: 1, unit_price: product.base_price }],
      }))
    }
  }

  function decrementItem(productId: string) {
    const existing = state.items.find(i => i.product_id === productId)
    if (!existing) return
    if (existing.quantity <= 1) {
      setState(s => ({ ...s, items: s.items.filter(i => i.product_id !== productId) }))
    } else {
      setState(s => ({
        ...s,
        items: s.items.map(i => i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i),
      }))
    }
  }

  function removeItem(productId: string) {
    setState(s => ({ ...s, items: s.items.filter(i => i.product_id !== productId) }))
  }

  // Quick order: apply parsed results
  function applyParsedOrder(text: string) {
    const parsed = parseOrderMessage(text, products)
    setState(s => ({
      ...s,
      items: parsed.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
      deliveryDate: parsed.deliveryDate ?? s.deliveryDate,
      deliveryType: parsed.deliveryType ?? s.deliveryType,
    }))
    // Jump to review if we got items
    if (parsed.items.length > 0) {
      setDirection('forward')
      setStep(5)
    }
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    try {
      // Auto-save new customer if we have enough info
      let customerId = state.customer?.id ?? null
      if (!customerId && state.customerName.trim() && state.isNewCustomer) {
        const newCustomer = await createCustomer({
          name: state.customerName.trim(),
          phone: state.customerPhone.trim() || null,
          address: state.deliveryAddress.trim() || null,
        })
        if (newCustomer) customerId = newCustomer.id
      }

      await createOrder(
        {
          customer_id: customerId,
          customer_name: state.customerName.trim(),
          customer_phone: state.customerPhone.trim() || null,
          channel: state.channel,
          status: 'confirmed',
          delivery_date: state.deliveryDate,
          delivery_type: state.deliveryType,
          delivery_address: state.deliveryType === 'delivery' ? (state.deliveryAddress || null) : null,
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          total,
          notes: state.notes.trim() || null,
        },
        state.items,
      )

      setToast({ msg: 'Pedido creado', type: 'success' })
      setTimeout(() => onClose(), 800)
    } catch {
      setToast({ msg: 'Error al crear pedido. Los datos se conservan, intenta de nuevo.', type: 'error' })
    }
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={step === 1 ? onClose : back}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          {step === 1 ? 'Cancelar' : 'Atrás'}
        </button>
        <h1 className="text-lg font-semibold">Nuevo pedido</h1>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress — step dots */}
      <div className="flex items-center mb-5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5} aria-label={`Paso ${step} de 5: ${STEP_LABELS[step - 1]}`}>
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && (
              <div className={cn('flex-1 h-0.5 mx-1', i < step ? 'bg-[var(--color-teal)]' : 'bg-[var(--color-border)]')} />
            )}
            <button
              onClick={() => { if (i + 1 <= step) goTo((i + 1) as Step) }}
              className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold transition-colors flex-shrink-0',
                i + 1 < step && 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white cursor-pointer',
                i + 1 === step && 'border-[var(--color-gold)] text-[var(--color-gold)] bg-white cursor-default',
                i + 1 > step && 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-white cursor-default',
              )}
              title={label}
            >
              {i + 1 < step ? <Check size={12} /> : i + 1}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Step content with animation */}
      <div className="flex-1 relative overflow-hidden">
        <div
          key={step}
          className={cn(
            'wizard-step',
            direction === 'forward' ? 'wizard-enter-right' : 'wizard-enter-left',
          )}
        >
          {step === 1 && (
            <StepCliente
              state={state}
              setState={setState}
              quickMode={quickMode}
              setQuickMode={setQuickMode}
              onQuickOrder={applyParsedOrder}
              onNext={next}
            />
          )}
          {step === 2 && <StepCanal state={state} setState={setState} onNext={next} />}
          {step === 3 && (
            <StepProductos
              products={products}
              loading={productsLoading}
              items={state.items}
              getStock={getStockForProduct}
              onAdd={addItem}
              onDecrement={decrementItem}
              onRemove={removeItem}
              subtotal={subtotal}
            />
          )}
          {step === 4 && <StepEntrega state={state} setState={setState} />}
          {step === 5 && (
            <StepResumen
              state={state}
              setState={setState}
              products={products}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discount={discount}
              total={total}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>

      {/* Bottom nav (not on step 5 which has its own submit) */}
      {step < 5 && (
        <div className="sticky bottom-0 bg-[var(--color-bg)] pt-3 pb-2 border-t border-[var(--color-border)] mt-4">
          {!canAdvance() && (
            <p className="text-xs text-[var(--color-text-muted)] text-center mb-2">
              {step === 1 && 'Selecciona o crea un cliente para continuar'}
              {step === 3 && 'Agrega al menos un producto'}
              {step === 4 && 'Selecciona una fecha de entrega'}
            </p>
          )}
          <button
            onClick={next}
            disabled={!canAdvance()}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white py-2.5 rounded-md text-[13px] font-medium hover:bg-[var(--color-teal-dark)] disabled:opacity-40 transition-colors"
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

// ============================================================
// Step 1: Cliente
// ============================================================
function StepCliente({
  state, setState, quickMode, setQuickMode, onQuickOrder, onNext,
}: {
  state: WizardState
  setState: React.Dispatch<React.SetStateAction<WizardState>>
  quickMode: boolean
  setQuickMode: (v: boolean) => void
  onQuickOrder: (text: string) => void
  onNext: () => void
}) {
  const { results, loading, search } = useCustomerSearch()
  const recentCustomers = useRecentCustomers()
  const [query, setQuery] = useState('')
  const [quickText, setQuickText] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!quickMode) searchRef.current?.focus()
  }, [quickMode])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  function selectCustomer(c: Customer) {
    setState(s => ({
      ...s,
      customer: c,
      customerName: c.name,
      customerPhone: c.phone ?? '',
      deliveryAddress: c.address ?? '',
      isNewCustomer: false,
    }))
    setQuery('')
    onNext()
  }

  function handleNewCustomer() {
    setState(s => ({ ...s, isNewCustomer: true, customer: null }))
  }

  // Quick order mode
  if (quickMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[var(--color-gold)]" />
            <h2 className="text-base font-semibold">Pedido rapido</h2>
          </div>
          <button
            onClick={() => setQuickMode(false)}
            className="text-xs text-[var(--color-accent)] font-medium"
          >
            Modo normal
          </button>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Pega un mensaje de WhatsApp y lo interpreto automaticamente
        </p>
        <textarea
          value={quickText}
          onChange={e => setQuickText(e.target.value)}
          placeholder={`Ej: "2 mini maracuya y 1 grande lotus para mañana, domicilio"`}
          className="w-full border border-[var(--color-border)] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none min-h-[120px] bg-white"
          autoFocus
        />
        <button
          onClick={() => { if (quickText.trim()) onQuickOrder(quickText) }}
          disabled={!quickText.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[var(--color-gold)] text-white py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Zap size={15} />
          Interpretar pedido
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {state.isNewCustomer ? 'Nuevo cliente' : 'Buscar cliente'}
        </h2>
        <button
          onClick={() => setQuickMode(true)}
          className="flex items-center gap-1.5 text-xs text-[var(--color-gold-dark)] font-medium bg-[var(--color-gold-light)] px-3 py-1.5 rounded-lg"
        >
          <Zap size={13} />
          Pedido rapido
        </button>
      </div>

      {!state.isNewCustomer ? (
        <>
          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nombre o celular..."
              className="w-full border border-[var(--color-border)] rounded-md pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent)] bg-white"
            />
          </div>

          {/* Search results */}
          {query.length >= 2 && (
            <div className="space-y-2">
              {loading && <p className="text-xs text-[var(--color-text-muted)]">Buscando...</p>}
              {!loading && results.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">No encontrado</p>
              )}
              {results.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="w-full text-left p-3 rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors bg-white"
                >
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {c.phone && `${c.phone} · `}{c.type === 'b2b' ? 'Restaurante' : 'Cliente'}
                    {c.discount_pct > 0 && ` · ${c.discount_pct}% desc.`}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Recent customers */}
          {query.length < 2 && recentCustomers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Recientes</p>
              <div className="flex flex-wrap gap-2">
                {recentCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] text-sm transition-colors bg-white"
                  >
                    <User size={13} className="text-[var(--color-text-muted)]" />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New customer button */}
          <button
            onClick={handleNewCustomer}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Plus size={15} />
            Cliente nuevo
          </button>
        </>
      ) : (
        <>
          {/* New customer form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Nombre *</label>
              <input
                value={state.customerName}
                onChange={e => setState(s => ({ ...s, customerName: e.target.value }))}
                placeholder="Nombre del cliente"
                className="w-full border border-[var(--color-border)] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent)] bg-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Celular</label>
              <input
                value={state.customerPhone}
                onChange={e => setState(s => ({ ...s, customerPhone: e.target.value }))}
                placeholder="300 000 0000"
                className="w-full border border-[var(--color-border)] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent)] bg-white"
              />
            </div>
          </div>
          <button
            onClick={() => setState(s => ({ ...s, isNewCustomer: false, customerName: '', customerPhone: '', customer: null }))}
            className="text-xs text-[var(--color-accent)] font-medium"
          >
            Buscar cliente existente
          </button>
        </>
      )}
    </div>
  )
}

// ============================================================
// Step 2: Canal
// ============================================================
function StepCanal({
  state, setState, onNext,
}: {
  state: WizardState
  setState: React.Dispatch<React.SetStateAction<WizardState>>
  onNext: () => void
}) {
  const channels: { id: OrderChannel; icon: React.ReactNode }[] = [
    { id: 'whatsapp', icon: <MessageSquare size={18} /> },
    { id: 'instagram', icon: <Camera size={18} /> },
    { id: 'rappi', icon: <Bike size={18} /> },
    { id: 'walk_in', icon: <Store size={18} /> },
    { id: 'b2b', icon: <Building2 size={18} /> },
  ]

  function select(ch: OrderChannel) {
    setState(s => ({ ...s, channel: ch }))
    onNext()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Por donde llego el pedido?</h2>
      <div className="grid grid-cols-2 gap-3">
        {channels.map(({ id, icon }) => (
          <button
            key={id}
            onClick={() => select(id)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-md border transition-all text-center',
              state.channel === id
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-accent)] bg-white',
            )}
          >
            <span className="text-[var(--color-text-secondary)]">{icon}</span>
            <span className="text-sm font-medium">{CHANNEL_LABELS[id]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Step 3: Productos
// ============================================================
function StepProductos({
  products, loading, items, getStock, onAdd, onDecrement, onRemove, subtotal,
}: {
  products: ReturnType<typeof useProducts>['products']
  loading: boolean
  items: OrderItem[]
  getStock: (id: string) => number | null
  onAdd: (id: string) => void
  onDecrement: (id: string) => void
  onRemove: (id: string) => void
  subtotal: number
}) {
  const [sizeTab, setSizeTab] = useState<ProductSize>('mediana')
  const sizes: ProductSize[] = ['grande', 'mediana', 'mini']

  const filtered = useMemo(
    () => products.filter(p => p.size === sizeTab),
    [products, sizeTab],
  )

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Cargando productos...</p>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Que quiere?</h2>

      {/* Size tabs */}
      <div className="flex gap-1 bg-[var(--color-border)] p-1 rounded-lg">
        {sizes.map(s => (
          <button
            key={s}
            onClick={() => setSizeTab(s)}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              sizeTab === s
                ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {SIZE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Product cards */}
      <div className="space-y-2">
        {filtered.map(p => {
          const inOrder = items.find(i => i.product_id === p.id)
          const stock = getStock(p.id)
          return (
            <div
              key={p.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-md border transition-colors bg-white',
                inOrder ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{p.flavor}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {formatCOP(Number(p.base_price))}
                  {stock !== null && (
                    <span className={cn(
                      'ml-2',
                      stock <= 2 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]',
                    )}>
                      {stock} disp.
                    </span>
                  )}
                </p>
              </div>

              {inOrder ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDecrement(p.id)}
                    className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{inOrder.quantity}</span>
                  <button
                    onClick={() => onAdd(p.id)}
                    className="w-8 h-8 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onAdd(p.id)}
                  className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Cart summary (sticky) */}
      {items.length > 0 && (
        <div className="bg-[var(--color-surface-warm)] rounded-md p-3 space-y-2 border border-[var(--color-border)]">
          {items.map(item => {
            const product = products.find(p => p.id === item.product_id)
            if (!product) return null
            return (
              <div key={item.product_id} className="flex items-center justify-between text-sm">
                <span>{item.quantity}x {product.flavor} <span className="text-[var(--color-text-muted)] capitalize">{product.size}</span></span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-secondary)]">{formatCOP(item.quantity * item.unit_price)}</span>
                  <button onClick={() => onRemove(item.product_id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
          <div className="border-t border-[var(--color-border)] pt-2 flex justify-between text-sm font-semibold">
            <span>Subtotal</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Step 4: Entrega
// ============================================================
function StepEntrega({
  state, setState,
}: {
  state: WizardState
  setState: React.Dispatch<React.SetStateAction<WizardState>>
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Cuando y como se entrega?</h2>

      {/* Date */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
          <Calendar size={13} className="inline mr-1" />
          Fecha de entrega
        </label>
        {/* Quick date buttons */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setState(s => ({ ...s, deliveryDate: today() }))}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              state.deliveryDate === today()
                ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] bg-white',
            )}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setState(s => ({ ...s, deliveryDate: tomorrow() }))}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              state.deliveryDate === tomorrow()
                ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] bg-white',
            )}
          >
            Manana
          </button>
          <input
            type="date"
            value={state.deliveryDate}
            onChange={e => setState(s => ({ ...s, deliveryDate: e.target.value }))}
            min={today()}
            className="flex-1 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] bg-white"
          />
        </div>
      </div>

      {/* Delivery type */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Tipo de entrega</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { type: 'pickup' as DeliveryType, icon: <Store size={22} />, label: 'Recoge en local' },
            { type: 'delivery' as DeliveryType, icon: <Bike size={22} />, label: `Domicilio (+${formatCOP(DELIVERY_FEE)})` },
          ]).map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => setState(s => ({ ...s, deliveryType: type }))}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-all',
                state.deliveryType === type
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                  : 'border-[var(--color-border)] bg-white',
              )}
            >
              <span className="text-[var(--color-text-secondary)]">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Address */}
      {state.deliveryType === 'delivery' && (
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            <MapPin size={13} className="inline mr-1" />
            Direccion de entrega
          </label>
          <input
            value={state.deliveryAddress}
            onChange={e => setState(s => ({ ...s, deliveryAddress: e.target.value }))}
            placeholder="Direccion completa"
            className="w-full border border-[var(--color-border)] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent)] bg-white"
            autoFocus
          />
          {state.customer?.address && state.deliveryAddress !== state.customer.address && (
            <button
              onClick={() => setState(s => ({ ...s, deliveryAddress: s.customer?.address ?? '' }))}
              className="mt-1 text-xs text-[var(--color-accent)]"
            >
              Usar direccion del cliente: {state.customer.address}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Step 5: Resumen
// ============================================================
function StepResumen({
  state, setState, products, subtotal, deliveryFee, discount, total, submitting, onSubmit,
}: {
  state: WizardState
  setState: React.Dispatch<React.SetStateAction<WizardState>>
  products: ReturnType<typeof useProducts>['products']
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  submitting: boolean
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Resumen del pedido</h2>

      {/* Client info */}
      <div className="bg-white rounded-md border border-[var(--color-border)] p-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={14} className="text-[var(--color-text-muted)]" />
          <span className="font-medium text-sm">{state.customerName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
            {CHANNEL_LABELS[state.channel]}
          </span>
        </div>
        {state.customerPhone && (
          <p className="text-xs text-[var(--color-text-secondary)] ml-5">{state.customerPhone}</p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-md border border-[var(--color-border)] p-4 space-y-2">
        {state.items.map(item => {
          const product = products.find(p => p.id === item.product_id)
          if (!product) return null
          return (
            <div key={item.product_id} className="flex justify-between text-sm">
              <span>{item.quantity}x {product.flavor} <span className="text-[var(--color-text-muted)] capitalize">{product.size}</span></span>
              <span>{formatCOP(item.quantity * item.unit_price)}</span>
            </div>
          )
        })}
        <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
          <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
            <span>Subtotal</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
              <span>Domicilio</span>
              <span>{formatCOP(deliveryFee)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm text-[var(--color-teal)]">
              <span>Descuento ({state.customer?.discount_pct}%)</span>
              <span>-{formatCOP(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1 border-t border-[var(--color-border)]">
            <span>Total</span>
            <span>{formatCOP(total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery info */}
      <div className="bg-white rounded-md border border-[var(--color-border)] p-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-[var(--color-text-muted)]" />
            <span>{state.deliveryDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            {state.deliveryType === 'delivery' ? <Bike size={14} /> : <Store size={14} />}
            <span>{state.deliveryType === 'delivery' ? 'Domicilio' : 'Recoge'}</span>
          </div>
        </div>
        {state.deliveryType === 'delivery' && state.deliveryAddress && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 ml-5">
            <MapPin size={11} className="inline mr-1" />
            {state.deliveryAddress}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Notas</label>
        <textarea
          value={state.notes}
          onChange={e => setState(s => ({ ...s, notes: e.target.value }))}
          rows={2}
          placeholder="Instrucciones especiales, dedicatoria..."
          className="w-full border border-[var(--color-border)] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none bg-white"
        />
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white py-2.5 rounded-md text-[13px] font-semibold hover:bg-[var(--color-teal-dark)] disabled:opacity-50 transition-colors"
      >
        {submitting ? (
          'Creando pedido...'
        ) : (
          <>
            <Check size={16} />
            Crear pedido — {formatCOP(total)}
          </>
        )}
      </button>
    </div>
  )
}
