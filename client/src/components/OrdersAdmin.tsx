import React, { useEffect, useState } from 'react'

type OrderItem = { id?: string, name: string, price: number, qty: number }
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
      setOrders(data)
    } catch (e) {
      console.error('Failed to fetch orders', e)
    } finally { setLoading(false) }
  }

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/orders/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) })
    fetchOrders()
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Bestillinger</h2>
      {loading && <div>Loading...</div>}
      <div className="space-y-4">
        {orders.map(o => (
          <div key={o.id} className="p-3 border rounded">
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
                <li key={i} className="flex justify-between">
                  <div>{it.name} x{it.qty}</div>
                  <div>{(it.price * it.qty).toFixed(0)} kr</div>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button className="px-2 py-1" onClick={() => setStatus(o.id, 'preparing')}>Forbered</button>
              <button className="px-2 py-1" onClick={() => setStatus(o.id, 'ready')}>Klar</button>
              <button className="px-2 py-1" onClick={() => setStatus(o.id, 'picked')}>Hentet</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
