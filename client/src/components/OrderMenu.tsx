import React, { useEffect, useMemo, useState } from 'react'

export type CustomizationOption = {
  id: string
  label: string
  price?: number
  defaultQty: number
  available: boolean
}

export type MenuItem = {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  category?: string
  image?: string
  allergens?: string | null
  customization_options?: CustomizationOption[] | string | null
}

export type Customization = {
  optionQuantities: Record<string, number>
  optionLabels?: Record<string, string>
  details?: string[]
}

export type CartItem = MenuItem & {
  qty: number
  unitPrice: number
  customization: Customization
}

const normalizeOptions = (value?: MenuItem['customization_options']): CustomizationOption[] => {
  if (!value) return []

  let source: any = value
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source)
    } catch (e) {
      source = source.split('\n').map((s: string) => s.trim()).filter(Boolean)
    }
  }
  if (typeof source === 'string') {
    try { source = JSON.parse(source) } catch (e) {}
  }

  if (!Array.isArray(source)) return []

  return source
    .map((option: any, index: number) => {
      if (typeof option === 'string') {
        const label = option.trim()
        if (!label || label === '[object Object]') return null
        return {
          id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `opt-${index}`,
          label,
          price: 0,
          defaultQty: 0,
          available: true,
        }
      }

      if (!option || typeof option !== 'object') return null

      let label = ''
      if (typeof option.label === 'string') label = option.label.trim()
      else if (typeof option.name === 'string') label = option.name.trim()
      else if (typeof option.option === 'string') label = option.option.trim()

      if (!label || label === '[object Object]') return null

      return {
        id: String(option.id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `opt-${index}`)),
        label,
        price: Math.max(0, Number(option.price) || 0),
        defaultQty: Math.max(0, Number(option.defaultQty ?? 0) || 0),
        available: option.available !== false,
      }
    })
    .filter(Boolean) as CustomizationOption[]
}

const buildCustomization = (quantities: Record<string, number>, options: CustomizationOption[] = []): Customization => {
  const optionQuantities: Record<string, number> = {}
  const optionLabels: Record<string, string> = {}
  const details: string[] = []

  for (const opt of options) {
    optionLabels[opt.id] = opt.label
    const qty = quantities[opt.id] || 0
    optionQuantities[opt.id] = qty
    if (qty > 0) {
      const priceText = opt.price ? ` (+${opt.price * qty} kr)` : ''
      details.push(`${opt.label} x${qty}${priceText}`)
    }
  }

  return { optionQuantities, optionLabels, details }
}

const createCustomization = (options: CustomizationOption[] = []): Customization => {
  const initialQty: Record<string, number> = {}
  for (const option of options) {
    if (option.available !== false) {
      initialQty[option.id] = Math.max(0, Number(option.defaultQty) || 0)
    }
  }
  return buildCustomization(initialQty, options)
}

const calculateUnitPrice = (basePrice: number, customization: Customization, options: CustomizationOption[] = []) => {
  let extra = 0
  for (const opt of options) {
    const qty = customization.optionQuantities[opt.id] || 0
    if (qty > 0 && opt.price) {
      extra += qty * opt.price
    }
  }
  return basePrice + extra
}

const customizationKey = (customization: Customization) => JSON.stringify(customization.optionQuantities)

const splitValues = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

export default function OrderMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('All')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<CustomizationOption[]>([])
  const [draftCustomization, setDraftCustomization] = useState<Customization>({ optionQuantities: {} })
  const [draftQty, setDraftQty] = useState(1)

  useEffect(() => {
    fetchMenu()
  }, [])

  const availableTabs = useMemo(() => {
    const rawCats = Array.from(new Set(menu.map((item) => item.category || 'Uten kategori')))
    rawCats.sort()
    return ['All', ...rawCats]
  }, [menu])

  const filteredMenu = useMemo(
    () => (activeTab === 'All' ? menu : menu.filter((item) => (item.category || 'Uten kategori') === activeTab)),
    [menu, activeTab],
  )

  const fetchMenu = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/menu')
      const data = await res.json()
      // Only show items that are available for customers
      setMenu(data.filter((item: MenuItem) => item.available))
    } catch (error) {
      console.error('Failed to fetch menu', error)
    } finally {
      setLoading(false)
    }
  }

  const openCustomizer = (item: MenuItem) => {
    const options = normalizeOptions(item.customization_options)
    setSelectedItem(item)
    setSelectedOptions(options)
    setDraftCustomization(createCustomization(options))
    setDraftQty(1)
  }

  const bumpOptionQty = (optionId: string, delta: number) => {
    setDraftCustomization((current) => {
      const currentQty = current.optionQuantities[optionId] || 0
      const nextQuantities = {
        ...current.optionQuantities,
        [optionId]: Math.max(0, currentQty + delta),
      }
      return buildCustomization(nextQuantities, selectedOptions)
    })
  }

  const addToCart = (item: MenuItem, qty: number, customization: Customization) => {
    const normalizedQty = Math.max(1, qty)
    const unitPrice = calculateUnitPrice(item.price, customization, selectedOptions)
    const signature = customizationKey(customization)

    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id && customizationKey(cartItem.customization) === signature)
      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id && customizationKey(cartItem.customization) === signature
            ? { ...cartItem, qty: cartItem.qty + normalizedQty }
            : cartItem,
        )
      }

      return [...current, { ...item, qty: normalizedQty, unitPrice, customization }]
    })

    setSelectedItem(null)
  }

  const changeQty = (id: string, qty: number, customizationSignature?: string) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id && (!customizationSignature || customizationKey(item.customization) === customizationSignature)
            ? { ...item, qty: Math.max(0, qty) }
            : item,
        )
        .filter((item) => item.qty > 0),
    )
  }

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert('Handlekurven er tom')
      return
    }

    const payload = {
      items: cart.map(({ id, name, unitPrice, qty, image, customization }) => ({
        id,
        name,
        price: unitPrice,
        qty,
        image,
        customization,
      })),
      total: cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
      status: 'placed',
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('server error')
      const saved = await res.json()
      setCart([])
      setSelectedItem(null)
      alert('Takk for din bestilling! Bestillings-ID: ' + saved.id)
    } catch (error) {
      console.error('Failed to save order to API, falling back to localStorage', error)
      try {
        const order = { id: String(Date.now()), items: payload.items, total: payload.total, createdAt: Date.now(), status: 'placed' }
        const raw = localStorage.getItem('orders')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(order)
        localStorage.setItem('orders', JSON.stringify(arr))
        setCart([])
        setSelectedItem(null)
        alert('Bestilling lagret lokalt! Bestillings-ID: ' + order.id)
      } catch (error2) {
        console.error('Failed to save locally', error2)
        alert('Kunne ikke sende bestillingen. Prøv igjen.')
      }
    }
  }

  const currentDraftUnitPrice = selectedItem
    ? calculateUnitPrice(selectedItem.price, draftCustomization, selectedOptions)
    : 0

  return (
    <div className="mx-auto max-w-6xl pb-40 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
      <div className="min-w-0">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Meny & Bestilling</h2>
            <p className="text-sm text-gray-600">Velg en rett for å tilpasse tilbehør og antall.</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab === 'All' ? 'Alle retter' : tab}
            </button>
          ))}
        </div>

        {loading && <div className="mb-4 text-sm text-gray-500 italic">Laster inn menyen...</div>}

        <ul className="space-y-4">
          {filteredMenu.map((item) => {
            const allergens = splitValues(item.allergens)
            const opts = normalizeOptions(item.customization_options)
            return (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-gray-300 transition-all">
                <button className="block w-full text-left cursor-pointer p-4" onClick={() => openCustomizer(item)}>
                  <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
                    <div className="aspect-square overflow-hidden rounded-xl bg-gray-100 shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">Ikke bilde</div>
                      )}
                    </div>

                    <div className="min-w-0 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="text-lg font-bold text-gray-900">{item.name}</div>
                          <div className="text-lg font-bold text-forest">{item.price} kr</div>
                        </div>
                        {item.description && <div className="mt-1 text-sm text-gray-600 leading-snug">{item.description}</div>}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {item.category && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 font-medium">
                            {item.category}
                          </span>
                        )}
                        {allergens.map((tag) => (
                          <span key={tag} className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800 font-medium">
                            Allergi: {tag}
                          </span>
                        ))}
                        {opts.length > 0 && (
                          <span className="rounded-full bg-forest/10 px-2.5 py-1 text-forest font-semibold">
                            {opts.length} tilpasninger tilgjengelig
                          </span>
                        )}
                      </div>

                      <div className="mt-3 text-xs font-bold text-forest uppercase tracking-wider">
                        + Trykk for å tilpasse & legge til
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
          {filteredMenu.length === 0 && !loading && (
            <div className="py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
              Ingen tilgjengelige retter i denne kategorien akkura nå.
            </div>
          )}
        </ul>
      </div>

      {/* Cart sidebar */}
      <aside className="mt-6 space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm lg:mt-0 lg:sticky lg:top-4 lg:h-fit">
        <div className="border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900">Handlekurv</h3>
          <p className="text-xs text-gray-500">Dine valgte retter og tilpasninger</p>
        </div>

        {cart.length === 0 && <div className="py-6 text-center text-sm text-gray-500">Handlekurven er tom</div>}

        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {cart.map((item) => {
            const details = item.customization.details || []
            return (
              <li key={`${item.id}-${customizationKey(item.customization)}`} className="rounded-2xl border border-gray-100 p-3 bg-gray-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.unitPrice} kr stk</div>
                  </div>
                  <div className="text-right font-bold text-gray-900">{(item.unitPrice * item.qty).toFixed(0)} kr</div>
                </div>

                {details.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {details.map((tag, idx) => (
                      <span key={idx} className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-gray-700 text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                      onClick={() => changeQty(item.id, item.qty - 1, customizationKey(item.customization))}
                    >
                      -
                    </button>
                    <span className="min-w-6 text-center font-bold text-sm">{item.qty}</span>
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                      onClick={() => changeQty(item.id, item.qty + 1, customizationKey(item.customization))}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer"
                    onClick={() => changeQty(item.id, 0, customizationKey(item.customization))}
                  >
                    Fjern
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        {cart.length > 0 && (
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-base font-bold text-gray-900">
              <span>Totalsum</span>
              <span className="text-forest text-xl">{cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)} kr</span>
            </div>
            <button
              className="w-full rounded-2xl bg-chili px-4 py-3.5 font-bold text-white shadow-md hover:bg-chili/90 transition-colors cursor-pointer"
              onClick={placeOrder}
            >
              Send bestilling
            </button>
          </div>
        )}
      </aside>

      {/* Item Customizer Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-3 sm:items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-forest">Tilpass din rett</div>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900">{selectedItem.name}</h3>
                </div>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold cursor-pointer"
                  onClick={() => setSelectedItem(null)}
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl bg-gray-100 aspect-square sm:aspect-auto sm:h-44">
                  {selectedItem.image ? (
                    <img src={selectedItem.image} alt={selectedItem.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">Ikke bilde</div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xl font-bold text-forest">{selectedItem.price} kr <span className="text-xs text-gray-500 font-normal">(ordinær pris)</span></div>
                    {selectedItem.description && <div className="mt-1 text-sm text-gray-600">{selectedItem.description}</div>}
                  </div>

                  {selectedOptions.length > 0 ? (
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Velg tilbehør & antall</div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selectedOptions.map((option) => {
                          const qty = draftCustomization.optionQuantities[option.id] || 0
                          const isAvailable = option.available !== false
                          return (
                            <div
                              key={option.id}
                              className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                                isAvailable ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-gray-900">
                                  {option.label}
                                  {option.price ? <span className="ml-1 text-xs text-forest font-bold">(+{option.price} kr)</span> : null}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {isAvailable ? (option.defaultQty > 0 ? `Standard: ${option.defaultQty}` : 'Velg antall') : 'Utsolgt'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="w-8 h-8 rounded-xl border border-gray-300 bg-white text-gray-800 font-bold hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                  disabled={!isAvailable || qty <= 0}
                                  onClick={() => bumpOptionQty(option.id, -1)}
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold text-sm">{qty}</span>
                                <button
                                  className="w-8 h-8 rounded-xl border border-gray-300 bg-white text-gray-800 font-bold hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                  disabled={!isAvailable}
                                  onClick={() => bumpOptionQty(option.id, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                      Denne retten har ingen spesielle tilpasningsvalg registrert.
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Antall porsjoner</label>
                    <div className="flex items-center gap-3">
                      <button
                        className="w-9 h-9 rounded-xl border border-gray-300 bg-white text-gray-800 font-bold hover:bg-gray-100 cursor-pointer"
                        onClick={() => setDraftQty((current) => Math.max(1, current - 1))}
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold text-base">{draftQty}</span>
                      <button
                        className="w-9 h-9 rounded-xl border border-gray-300 bg-white text-gray-800 font-bold hover:bg-gray-100 cursor-pointer"
                        onClick={() => setDraftQty((current) => current + 1)}
                      >
                        +
                      </button>
                      <div className="ml-auto text-right">
                        <div className="text-xs text-gray-500">Pris per porsjon:</div>
                        <div className="text-base font-bold text-forest">{currentDraftUnitPrice} kr</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      className="flex-1 rounded-2xl bg-forest py-3 px-4 font-bold text-white shadow-md hover:bg-forest/90 transition-colors cursor-pointer"
                      onClick={() => addToCart(selectedItem, draftQty, draftCustomization)}
                    >
                      Legg i handlekurv ({(currentDraftUnitPrice * draftQty).toFixed(0)} kr)
                    </button>
                    <button
                      className="rounded-2xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedItem(null)}
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
