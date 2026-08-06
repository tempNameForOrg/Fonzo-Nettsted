import React, { useEffect, useState } from 'react'

type OrderItemCustomization = {
  optionQuantities?: Record<string, number>
  optionLabels?: Record<string, string>
  details?: string[]
  raw?: string
}

type OrderItem = {
  id?: string
  name: string
  price: number
  qty: number
  image?: string
  customization?: OrderItemCustomization | string | null
}

type Order = {
  id: string
  items: OrderItem[]
  total: number
  status: string
  createdAt: number
}

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/orders')
      const data = await res.json()
      data.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
      setOrders(data)
    } catch (e) {
      console.error('Failed to fetch orders', e)
    } finally {
      setLoading(false)
    }
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
    if (Array.isArray(parsed.details) && parsed.details.length > 0) {
      return parsed.details
    }
    const labelsMap = parsed.optionLabels || {}
    const items = parsed.optionQuantities
      ? Object.entries(parsed.optionQuantities)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => {
            const label = labelsMap[id] || id
            return `${label} x${qty}`
          })
      : []
    if (parsed.raw) {
      items.push(`Rådata: ${parsed.raw}`)
    }
    return items
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
      setOrders((prev) => prev.filter((o) => o.id !== id))
    } catch (e) {
      console.error('Failed to delete order', e)
      alert('Kunne ikke fjerne bestillingen')
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Innkomne Bestillinger</h2>
          <p className="text-sm text-gray-600">Kjøkkenvisning med alle valgte tilpasninger per rett.</p>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500 italic">Laster bestillinger...</div>}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <div className="font-bold text-gray-900 text-lg">Ordre #{o.id}</div>
                <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString('no-NO')}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-forest text-lg">{o.total} kr</div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {o.status}
                </span>
              </div>
            </div>

            <ul className="space-y-3">
              {o.items.map((it, i) => {
                const labels = customizationLabels(it.customization)
                return (
                  <li key={i} className="rounded-2xl border border-gray-100 p-3 bg-gray-50/70">
                    <div className="flex items-center gap-3">
                      {it.image ? (
                        <img src={it.image} alt={it.name} className="w-12 h-12 object-cover rounded-xl shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center text-[10px] text-gray-400">Ikke bilde</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900">{it.name} <span className="text-forest">x{it.qty}</span></div>
                        <div className="text-xs text-gray-500">{it.price} kr stk</div>
                      </div>
                      <div className="font-bold text-gray-800 text-sm">{(it.price * it.qty).toFixed(0)} kr</div>
                    </div>

                    {labels.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200/60 flex flex-wrap gap-1.5 text-xs">
                        {labels.map((label, idx) => (
                          <span key={idx} className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-gray-800 font-medium text-[11px]">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="pt-2 border-t flex justify-end">
              <button
                className="rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-600 transition-colors cursor-pointer"
                onClick={() => deleteOrder(o.id)}
              >
                Fjern bestilling
              </button>
            </div>
          </div>
        ))}
        {orders.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-200">
            Ingen bestillinger mottatt ennå.
          </div>
        )}
      </div>
    </section>
  )
}
