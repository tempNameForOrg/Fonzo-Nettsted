import React, { useEffect, useState } from 'react'

type OrderItem = { id?: string, name: string, price: number, qty: number, image?: string }
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
      // sort ascending (oldest first) so left-to-right oldest -> newest
      data.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0))
      setOrders(data)
    } catch (e) {
      console.error('Failed to fetch orders', e)
    } finally { setLoading(false) }
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
      <h2 className="text-2xl font-semibold mb-4">Bestillinger</h2>
      {loading && <div>Loading...</div>}
      <div className="flex gap-4 overflow-x-auto py-2">
        {orders.map(o => (
          <div key={o.id} className="p-3 border rounded min-w-[300px] cursor-pointer" onClick={() => deleteOrder(o.id)} title="Klikk for å fjerne bestillingen">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="font-medium">Order {o.id}</div>
                <div className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{o.total} kr</div>
                <div className="text-sm">Status: {o.status}</div>
              </div>
            </div>
            <ul className="mb-2">
              {o.items.map((it, i) => (
                <li key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {it.image && <img src={it.image} alt={it.name} className="w-12 h-12 object-cover rounded" />}
                    <div>{it.name} x{it.qty}</div>
                  </div>
                  <div>{(it.price * it.qty).toFixed(0)} kr</div>
                </li>
              ))}
            </ul>
            
          </div>
        ))}
      </div>
    </section>
  )
}
