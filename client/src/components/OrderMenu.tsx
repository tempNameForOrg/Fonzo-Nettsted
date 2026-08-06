import React, { useEffect, useMemo, useState } from 'react'

type MenuItem = {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  category?: string
  image?: string
  allergens?: string | null
  customization_options?: string[] | string | null
}

type Customization = {
  selectedOptions: string[]
}

type CartItem = MenuItem & { qty: number; customization: Customization }

const createCustomization = (): Customization => ({
  selectedOptions: [],
})

const customizationKey = (customization: Customization) => JSON.stringify(customization)

const normalizeOptions = (value?: string[] | string | null) => {
  if (!value) return [] as string[]
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean)
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map((entry) => String(entry).trim()).filter(Boolean)
  } catch (error) {}
  return String(value)
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const splitValues = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const customizationSummary = (customization: Customization) => customization.selectedOptions.map((option) => `Valgt: ${option}`)

export default function OrderMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('All')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [draftCustomization, setDraftCustomization] = useState<Customization>(createCustomization())
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
      setMenu(data.filter((item: MenuItem) => item.available))
    } catch (error) {
      console.error('Failed to fetch menu', error)
    } finally {
      setLoading(false)
    }
  }

  const openCustomizer = (item: MenuItem) => {
    setSelectedItem(item)
    setDraftCustomization(createCustomization())
    setDraftQty(1)
  }

  const updateSelectedOption = (option: string, enabled: boolean) => {
    setDraftCustomization((current) => ({
      selectedOptions: enabled
        ? Array.from(new Set([...current.selectedOptions, option]))
        : current.selectedOptions.filter((existing) => existing !== option),
    }))
  }

  const addToCart = (item: MenuItem, qty: number, customization: Customization) => {
    const normalizedQty = Math.max(1, qty)
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

      return [...current, { ...item, qty: normalizedQty, customization }]
    })
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
      alert('Cart is empty')
      return
    }

    const payload = {
      items: cart.map(({ id, name, price, qty, image, customization }) => ({ id, name, price, qty, image, customization })),
      total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
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
      alert('Order placed — ID: ' + saved.id)
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
        alert('Order placed locally — ID: ' + order.id)
      } catch (error2) {
        console.error('Failed to save locally', error2)
        alert('Failed to place order')
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-40 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
      <div className="min-w-0">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Meny</h2>
            <p className="text-sm text-gray-600">Trykk på en rett for å åpne en overlay og velge forhåndsdefinerte alternativer fra admin.</p>
          </div>
        </div>

        {loading && <div className="mb-4 text-sm text-gray-600">Laster meny...</div>}

        <ul className="space-y-3">
          {filteredMenu.map((item) => {
            const allergens = splitValues(item.allergens)
            return (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <button className="block w-full text-left" onClick={() => openCustomizer(item)}>
                  <div className="grid gap-3 p-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
                    <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                      {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold">{item.name}</div>
                          <div className="text-sm text-gray-600">{item.description}</div>
                        </div>
                        <div className="text-lg font-semibold text-forest">{item.price} kr</div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {(item.category ? [item.category] : ['Uten kategori']).map((tag) => (
                          <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                            {tag}
                          </span>
                        ))}
                        {allergens.map((tag) => (
                          <span key={tag} className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">
                            Allergi: {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 text-sm font-semibold text-forest">Trykk for å spesialisere</div>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <aside className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:mt-0 lg:sticky lg:top-4 lg:h-fit">
        <div>
          <h3 className="text-lg font-semibold">Handlekurv</h3>
          <div className="text-sm text-gray-600">Detaljer og spesialiseringer lagres på hver ordrelinje.</div>
        </div>

        {cart.length === 0 && <div className="text-sm text-gray-600">Ingen varer ennå</div>}

        <ul className="space-y-3">
          {cart.map((item) => {
            const details = customizationSummary(item.customization)
            return (
              <li key={`${item.id}-${customizationKey(item.customization)}`} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.price} kr stykket</div>
                  </div>
                  <div className="text-right font-semibold">{(item.price * item.qty).toFixed(0)} kr</div>
                </div>

                {details.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {details.map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button className="rounded-lg border border-gray-300 px-3 py-1" onClick={() => changeQty(item.id, item.qty - 1, customizationKey(item.customization))}>
                    -
                  </button>
                  <span className="min-w-8 text-center font-medium">{item.qty}</span>
                  <button className="rounded-lg border border-gray-300 px-3 py-1" onClick={() => changeQty(item.id, item.qty + 1, customizationKey(item.customization))}>
                    +
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="rounded-xl bg-forest/5 p-3">
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{cart.reduce((sum, item) => sum + item.price * item.qty, 0)} kr</span>
          </div>
          <button className="mt-3 w-full rounded-xl bg-chili px-4 py-3 font-semibold text-white" onClick={placeOrder}>
            Send bestilling
          </button>
        </div>
      </aside>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-[0.3em] text-gray-500">Spesialiser bestillingen</div>
                  <h3 className="mt-1 text-2xl font-semibold">{selectedItem.name}</h3>
                  <p className="text-sm text-gray-600">Velg blant alternativene som er satt opp av admin.</p>
                </div>
                <button className="rounded-full border border-gray-300 px-3 py-2 text-sm font-semibold" onClick={() => setSelectedItem(null)}>
                  Lukk
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl bg-gray-100">
                  {selectedItem.image && <img src={selectedItem.image} alt={selectedItem.name} className="h-full w-full object-cover" />}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-lg font-semibold text-forest">{selectedItem.price} kr</div>
                    <div className="text-sm text-gray-600">{selectedItem.description}</div>
                  </div>

                  {normalizeOptions(selectedItem.customization_options).length > 0 ? (
                    <div>
                      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Valg</div>
                      <div className="flex flex-wrap gap-2">
                        {normalizeOptions(selectedItem.customization_options).map((option) => {
                          const active = draftCustomization.selectedOptions.includes(option)
                          return (
                            <button
                              key={option}
                              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${active ? 'border-forest bg-forest text-white' : 'border-gray-300 bg-white text-gray-700'}`}
                              onClick={() => updateSelectedOption(option, !active)}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      Denne retten har ingen forhåndsdefinerte valg enda. Legg dem inn i edit menu.
                    </div>
                  )}

                  <label className="block text-sm font-medium">
                    Antall
                    <div className="mt-1 flex items-center gap-2">
                      <button className="rounded-lg border border-gray-300 px-3 py-2" onClick={() => setDraftQty((current) => Math.max(1, current - 1))}>
                        -
                      </button>
                      <input className="w-16 rounded-lg border border-gray-300 p-2 text-center" type="number" min={1} value={draftQty} onChange={(e) => setDraftQty(Math.max(1, Number(e.target.value) || 1))} />
                      <button className="rounded-lg border border-gray-300 px-3 py-2" onClick={() => setDraftQty((current) => current + 1)}>
                        +
                      </button>
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {customizationSummary(draftCustomization).map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 rounded-xl bg-olive px-4 py-3 font-semibold text-black" onClick={() => addToCart(selectedItem, draftQty, draftCustomization)}>
                      Legg til bestilling
                    </button>
                    <button className="rounded-xl border border-gray-300 px-4 py-3 font-semibold" onClick={() => setSelectedItem(null)}>
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-6xl px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-marigold px-4 py-3 shadow-sm">
            <div className="text-sm font-semibold text-black">Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})</div>
            <button className="text-sm font-semibold text-black" onClick={placeOrder}>
              {cart.length > 0 ? `${cart.reduce((sum, item) => sum + item.price * item.qty, 0)} kr` : 'Send bestilling'}
            </button>
          </div>

          <div className="flex items-stretch justify-between gap-2 overflow-x-auto">
            {availableTabs.map((tab) => {
              const active = tab === activeTab
              return (
                <button
                  key={tab}
                  className={`min-w-[92px] flex-1 border-t-4 px-3 py-2 text-center ${active ? 'border-[#d8843c] bg-white text-black' : 'border-transparent bg-white text-gray-700'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <div className="mx-auto mb-1 h-10 w-10 rounded-xl border border-gray-300 bg-white" />
                  <div className="text-sm">{tab === 'All' ? 'Alle' : tab}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
