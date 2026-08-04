import React, { useEffect, useState } from 'react'

type MenuItem = {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  image?: string
}

type CartItem = MenuItem & { qty: number }

export default function OrderMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchMenu() }, [])

  const fetchMenu = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/menu')
      const data = await res.json()
      setMenu(data.filter((m: MenuItem) => m.available))
    } catch (e) {
      console.error('Failed to fetch menu', e)
    } finally { setLoading(false) }
  }

  const addToCart = (item: MenuItem) => {
    setCart((c) => {
      const found = c.find(x => x.id === item.id)
      if (found) return c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x)
      return [...c, { ...item, qty: 1 }]
    })
  }

  const changeQty = (id: string, qty: number) => {
    setCart(c => c.map(x => x.id === id ? { ...x, qty: Math.max(0, qty) } : x).filter(x => x.qty > 0))
  }

  const placeOrder = async () => {
    if (cart.length === 0) { alert('Cart is empty'); return }
    const payload = {
      items: cart.map(({ id, name, price, qty, image }) => ({ id, name, price, qty, image })),
      total: cart.reduce((s, it) => s + it.price * it.qty, 0),
      status: 'placed'
    }
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('server error')
      const saved = await res.json()
      setCart([])
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
        alert('Order placed locally — ID: ' + order.id)
      } catch (e2) {
        console.error('Failed to save locally', e2)
        alert('Failed to place order')
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h2 className="text-2xl font-semibold mb-4">Meny</h2>
        {loading && <div>Loading...</div>}
        <ul className="space-y-3">
          {menu.map(it => (
            <li key={it.id} className="p-3 border rounded flex justify-between items-center">
              <div className="flex items-center gap-3">
                {it.image && <img src={it.image} alt={it.name} className="w-16 h-16 object-cover rounded" />}
                <div>
                  <div className="font-medium">{it.name} — {it.price} kr</div>
                  <div className="text-sm text-gray-600">{it.description}</div>
                </div>
              </div>
              <div>
                <button className="px-3 py-1 bg-forest text-white" onClick={() => addToCart(it)}>Add</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="p-3 border rounded">
        <h3 className="font-semibold mb-2">Cart</h3>
        {cart.length === 0 && <div className="text-sm text-gray-600">No items</div>}
        <ul className="space-y-2 mb-3">
          {cart.map(it => (
            <li key={it.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {it.image && <img src={it.image} alt={it.name} className="w-12 h-12 object-cover rounded" />}
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm">{it.price} kr</div>
                  </div>
                </div>
              <div className="flex items-center gap-2">
                <input className="w-14 p-1 border" type="number" value={it.qty} onChange={(e) => changeQty(it.id, Number(e.target.value))} />
                <div className="font-medium">{(it.price * it.qty).toFixed(0)} kr</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <div className="font-semibold">Total: {cart.reduce((s, it) => s + it.price * it.qty, 0)} kr</div>
          <div className="mt-3">
            <button className="px-3 py-2 bg-chili text-white" onClick={placeOrder}>Place Order</button>
          </div>
        </div>
      </aside>
    </div>
  )
}
