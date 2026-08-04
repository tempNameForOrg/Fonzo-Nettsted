import React, { useEffect, useState } from "react"

type MenuItem = {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  category?: string
}

const MenuAdmin: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([])
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    const res = await fetch('/api/menu')
    const data = await res.json()
    setItems(data)
  }

  const save = async (item: Partial<MenuItem>) => {
    if (item.id) {
      await fetch(`/api/menu/${item.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) })
    } else {
      await fetch('/api/menu', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) })
    }
    setEditing(null)
    fetchItems()
  }

  const remove = async (id: string) => {
    if (!confirm('Remove item?')) return
    await fetch(`/api/menu/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-2">Menu Admin</h2>
      <div className="mb-4">
        <button className="px-3 py-1 bg-forest text-white" onClick={() => setEditing({ name: '', price: 0, available: true })}>Add item</button>
      </div>
      {editing && (
        <div className="p-2 border mb-4 max-w-md">
          <label className="block">Name</label>
          <input className="w-full p-1 border" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <label className="block mt-2">Price</label>
          <input className="w-full p-1 border" value={String(editing.price ?? 0)} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
          <label className="block mt-2">Description</label>
          <textarea className="w-full p-1 border" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <div className="mt-2">
            <button className="px-3 py-1 bg-forest text-white" onClick={() => save(editing)}>Save</button>
            <button className="px-3 py-1 ml-2" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="p-2 border rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{it.name} — {it.price} kr</div>
              <div className="text-sm">{it.description}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1" onClick={() => setEditing(it)}>Edit</button>
              <button className="px-2 py-1 bg-red-500 text-white" onClick={() => remove(it.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default MenuAdmin
