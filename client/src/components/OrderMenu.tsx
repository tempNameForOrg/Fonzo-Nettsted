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
}

type Customization = {
  spiceLevel: string
  removedIngredients: string
  extras: string
  allergyNotes: string
  servingNote: string
}

type CartItem = MenuItem & { qty: number; customization: Customization }

const createCustomization = (): Customization => ({
  spiceLevel: 'Medium',
  removedIngredients: '',
  extras: '',
  allergyNotes: '',
  servingNote: '',
})

const customizationKey = (customization: Customization) => JSON.stringify(customization)

const splitValues = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const customizationSummary = (customization: Customization) =>
  [
    customization.spiceLevel ? `Krydder: ${customization.spiceLevel}` : '',
    customization.removedIngredients ? `Uten: ${customization.removedIngredients}` : '',
    customization.extras ? `Ekstra: ${customization.extras}` : '',
    customization.allergyNotes ? `Allergi: ${customization.allergyNotes}` : '',
    customization.servingNote ? `Notat: ${customization.servingNote}` : '',
  ].filter(Boolean)

export default function OrderMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('All')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [draftCustomization, setDraftCustomization] = useState<Customization>(createCustomization())
  const [draftQty, setDraftQty] = useState(1)

  useEffect(() => { fetchMenu() }, [])

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
    } catch (e) {
      console.error('Failed to fetch menu', e)
    } finally {
      setLoading(false)
    }
  }

  const openCustomizer = (item: MenuItem) => {
    setSelectedItem(item)
    setDraftCustomization(createCustomization())
    setDraftQty(1)
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
    } catch (e) {
      console.error('Failed to save order to API, falling back to localStorage', e)
      try {
        const order = { id: String(Date.now()), items: payload.items, total: payload.total, createdAt: Date.now(), status: 'placed' }
        const raw = localStorage.getItem('orders')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(order)
        localStorage.setItem('orders', JSON.stringify(arr))
        setCart([])
        setSelectedItem(null)
        alert('Order placed locally — ID: ' + order.id)
      } catch (e2) {
        console.error('Failed to save locally', e2)
        alert('Failed to place order')
      }
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Meny</h2>
            <p className="text-sm text-gray-600">Tilpass maten din med allerginotater, fjern ingredienser og ekstra ønsker før du sender bestillingen.</p>
          </div>
        </div>

        {loading && <div className="mb-4 text-sm text-gray-600">Laster meny...</div>}

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${tab === activeTab ? 'bg-forest text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {filteredMenu.map((item) => {
            const allergens = splitValues(item.allergens)
            return (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="grid gap-3 p-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
                  <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : null}
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

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button className="rounded-xl border border-forest px-4 py-2 text-sm font-semibold text-forest" onClick={() => openCustomizer(item)}>
                        Tilpass
                      </button>
                      <button className="rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white" onClick={() => addToCart(item, 1, createCustomization())}>
                        Hurtig legg til
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:h-fit">
        <div>
          <h3 className="text-lg font-semibold">Valgt rett</h3>
          {!selectedItem && <div className="mt-2 text-sm text-gray-600">Velg en rett for å spesialisere innholdet.</div>}
        </div>

        {selectedItem && (
          <div className="space-y-4 rounded-xl bg-gray-50 p-3">
            <div className="flex items-center gap-3">
              {selectedItem.image && <img src={selectedItem.image} alt={selectedItem.name} className="h-16 w-16 rounded-lg object-cover" />}
              <div className="min-w-0">
                <div className="font-semibold">{selectedItem.name}</div>
                <div className="text-sm text-gray-600">{selectedItem.price} kr</div>
              </div>
            </div>

            <label className="block text-sm font-medium">
              Kryddernivå
              <select className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2" value={draftCustomization.spiceLevel} onChange={(e) => setDraftCustomization((current) => ({ ...current, spiceLevel: e.target.value }))}>
                <option>Light</option>
                <option>Medium</option>
                <option>Hot</option>
                <option>Extra hot</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Fjern ingredienser
              <input className="mt-1 w-full rounded-lg border border-gray-300 p-2" value={draftCustomization.removedIngredients} onChange={(e) => setDraftCustomization((current) => ({ ...current, removedIngredients: e.target.value }))} placeholder="f.eks. løk, koriander" />
            </label>

            <label className="block text-sm font-medium">
              Ekstra ønsker
              <input className="mt-1 w-full rounded-lg border border-gray-300 p-2" value={draftCustomization.extras} onChange={(e) => setDraftCustomization((current) => ({ ...current, extras: e.target.value }))} placeholder="f.eks. ekstra ost, ekstra salsa" />
            </label>

            <label className="block text-sm font-medium">
              Allergi / trygghet
              <input className="mt-1 w-full rounded-lg border border-gray-300 p-2" value={draftCustomization.allergyNotes} onChange={(e) => setDraftCustomization((current) => ({ ...current, allergyNotes: e.target.value }))} placeholder="f.eks. glutenfritt, nøtteallergi" />
            </label>

            <label className="block text-sm font-medium">
              Serveringsnotat
              <textarea className="mt-1 w-full rounded-lg border border-gray-300 p-2" rows={3} value={draftCustomization.servingNote} onChange={(e) => setDraftCustomization((current) => ({ ...current, servingNote: e.target.value }))} placeholder="f.eks. saus ved siden av" />
            </label>

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

            <div className="flex gap-2">
              <button className="flex-1 rounded-xl bg-olive px-4 py-3 font-semibold text-black" onClick={() => addToCart(selectedItem, draftQty, draftCustomization)}>
                Legg til bestilling
              </button>
              <button className="rounded-xl border border-gray-300 px-4 py-3 font-semibold" onClick={() => setSelectedItem(null)}>
                Lukk
              </button>
            </div>

            {customizationSummary(draftCustomization).length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {customizationSummary(draftCustomization).map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-2 py-1 text-gray-700 shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Handlekurv</h3>
            <span className="text-sm text-gray-500">{cart.length} varer</span>
          </div>

          {cart.length === 0 && <div className="mt-2 text-sm text-gray-600">Ingen varer ennå</div>}

          <ul className="mt-3 space-y-3">
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

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg border border-gray-300 px-3 py-1" onClick={() => changeQty(item.id, item.qty - 1, customizationKey(item.customization))}>
                        -
                      </button>
                      <span className="min-w-8 text-center font-medium">{item.qty}</span>
                      <button className="rounded-lg border border-gray-300 px-3 py-1" onClick={() => changeQty(item.id, item.qty + 1, customizationKey(item.customization))}>
                        +
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">{item.qty} porsjon(er)</div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 rounded-xl bg-forest/5 p-3">
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>{cart.reduce((sum, item) => sum + item.price * item.qty, 0)} kr</span>
            </div>
            <button className="mt-3 w-full rounded-xl bg-chili px-4 py-3 font-semibold text-white" onClick={placeOrder}>
              Send bestilling
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
