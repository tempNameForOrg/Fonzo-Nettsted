import React, { useEffect, useState } from 'react'

type OrderItemCustomization = {
  spiceLevel?: string
  removedIngredients?: string
  extras?: string
  allergyNotes?: string
  servingNote?: string
  raw?: string
}

type OrderItem = { id?: string, name: string, price: number, qty: number, image?: string, customization?: OrderItemCustomization | string | null }
type Order = { id: string, items: OrderItem[], total: number, status: string, createdAt: number }

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/orders')
      const data = await res.json()
      data.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
      setOrders(data)
    } catch (e) {
      console.error('Failed to fetch orders', e)
    } finally { setLoading(false) }
  }

  const parseCustomization = (customization: OrderItem['customization']): OrderItemCustomization | null => {
    if (!customization) return null
    if (typeof customization === 'object') return customization
    try {
      return JSON.parse(customization)
    } catch (e) {
      return { raw: customization }
    }
  }

  const customizationLabels = (customization: OrderItem['customization']) => {
    const parsed = parseCustomization(customization)
    if (!parsed) return []
    return [
      parsed.spiceLevel ? `Krydder: ${parsed.spiceLevel}` : '',
      parsed.removedIngredients ? `Uten: ${parsed.removedIngredients}` : '',
      parsed.extras ? `Ekstra: ${parsed.extras}` : '',
      parsed.allergyNotes ? `Allergi: ${parsed.allergyNotes}` : '',
      parsed.servingNote ? `Notat: ${parsed.servingNote}` : '',
      parsed.raw ? `Rådata: ${parsed.raw}` : '',
    ].filter(Boolean)
  }

  const deleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('Delete failed', res.status, body)
        alert('Kunne ikke fjerne bestillingen (' + res.status + ')')
        return
      }
      // optimistic update
      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (e) {
      console.error('Failed to delete order', e)
      alert('Kunne ikke fjerne bestillingen')
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Bestillinger</h2>
          <p className="text-sm text-gray-600">Kjøkkenvisning med ingrediensvalg, allerginotater og spesialbestillinger per vare.</p>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {orders.map(o => (
          <div key={o.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex justify-between gap-3">
              <div>
                <div className="font-medium">Order {o.id}</div>
                <div className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{o.total} kr</div>
                <div className="text-sm">Status: {o.status}</div>
              </div>
            </div>
            <ul className="space-y-3">
              {o.items.map((it, i) => (
                <li key={i} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    {it.image && <img src={it.image} alt={it.name} className="w-12 h-12 object-cover rounded" />}
                    <div className="min-w-0">
                      <div className="font-semibold">{it.name} x{it.qty}</div>
                      {customizationLabels(it.customization).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                          {customizationLabels(it.customization).map((label) => (
                            <span key={label} className="rounded-full bg-gray-100 px-2 py-1">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm text-gray-600">{(it.price * it.qty).toFixed(0)} kr</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white" onClick={() => deleteOrder(o.id)}>
                Fjern bestilling
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
