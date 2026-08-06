import React, { useEffect, useState } from "react"

type MenuItem = {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  category?: string
  image?: string
  allergens?: string
  customization_options?: string[] | string | null
}

const MenuAdmin: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([])
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string, name: string }>>([])
  const [newCategory, setNewCategory] = useState('')

  const formatCustomizationOptions = (value?: MenuItem['customization_options']) => {
    if (!value) return ''
    if (Array.isArray(value)) return value.join('\n')
    return String(value)
  }

  const parseCustomizationOptions = (value?: string | string[] | null) => {
    if (!value) return [] as string[]
    if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean)
    return String(value)
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  useEffect(() => { fetchItems() }, [])

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (e) {
      console.error('Failed to fetch categories', e)
    }
  }

  const fetchItems = async () => {
    const res = await fetch('/api/menu')
    const data = await res.json()
    setItems(data)
  }

  const save = async (item: Partial<MenuItem>) => {
    if (!item.image) { alert('Image is required'); return }
    if (!item.category) { alert('Category is required'); return }
    const customization_options = parseCustomizationOptions(item.customization_options)
    if (item.id) {
      await fetch(`/api/menu/${item.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...item, customization_options }) })
    } else {
      await fetch('/api/menu', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...item, customization_options }) })
    }
    setEditing(null)
    fetchItems()
  }

  const addCategory = async () => {
    if (!newCategory || !newCategory.trim()) return
    try {
      await fetch('/api/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: newCategory.trim() }) })
      setNewCategory('')
      fetchCategories()
    } catch (e) { console.error('failed add category', e) }
  }

  const removeCategory = async (id: string) => {
    if (!confirm('Remove category? This will unset the category on items.')) return
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      fetchCategories()
      fetchItems()
    } catch (e) { console.error('failed delete category', e) }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove item?')) return
    await fetch(`/api/menu/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-2">Menu Admin</h2>
      <div className="mb-4 flex items-start gap-6">
        <div>
          <button className="px-3 py-1 bg-forest text-white" onClick={() => setEditing({ name: '', price: 0, available: true })}>Add item</button>
        </div>
        <div className="p-2 border rounded max-w-md w-full">
          <div className="font-medium mb-2">Categories</div>
          <div className="flex gap-2 mb-2">
            <input className="flex-1 p-1 border" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
            <button className="px-2 py-1 bg-forest text-white" onClick={addCategory}>Add</button>
          </div>
          <ul className="text-sm">
            {categories.map(c => (
              <li key={c.id} className="flex justify-between items-center py-1">
                <div>{c.name}</div>
                <div>
                  <button className="px-2 py-1 text-sm" onClick={() => removeCategory(c.id)}>Delete</button>
                </div>
              </li>
            ))}
            {categories.length === 0 && <li className="text-gray-500">No categories yet</li>}
          </ul>
        </div>
      </div>
      {editing && (
        <div className="p-2 border mb-4 max-w-md">
          <label className="block">Name</label>
          <input className="w-full p-1 border" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <label className="block mt-2">Category</label>
          <select className="w-full p-1 border" value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
            <option value="">-- choose category --</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <label className="block mt-2">Price</label>
          <input className="w-full p-1 border" value={String(editing.price ?? 0)} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
          <label className="block mt-2">Description</label>
          <textarea className="w-full p-1 border" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <label className="block mt-2">Allergens / special diet notes</label>
          <input className="w-full p-1 border" value={editing.allergens || ''} onChange={(e) => setEditing({ ...editing, allergens: e.target.value })} placeholder="f.eks. gluten, melk, sesam" />
          <label className="block mt-2">Customization options</label>
          <textarea
            className="w-full p-1 border"
            rows={5}
            value={formatCustomizationOptions(editing.customization_options)}
            onChange={(e) => setEditing({ ...editing, customization_options: e.target.value })}
            placeholder={"One option per line\nEkstra kjøtt\nEkstra ost\nMild\nSterk"}
          />
          <label className="block mt-2">Image URL (or upload)</label>
          <input className="w-full p-1 border" value={editing.image || ''} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
          <input className="mt-2" type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files && e.target.files[0]
            if (!f) return
            const reader = new FileReader()
            reader.onload = () => setEditing({ ...editing, image: String(reader.result) })
            reader.readAsDataURL(f)
          }} />
          <div className="mt-2">
            <button className="px-3 py-1 bg-forest text-white" onClick={() => save(editing)}>Save</button>
            <button className="px-3 py-1 ml-2" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="p-2 border rounded flex justify-between items-center">
            <div className="flex items-center">
              {it.image && <img src={it.image} alt={it.name} className="w-16 h-16 object-cover mr-3" />}
              <div>
                <div className="font-medium">{it.name} — {it.price} kr</div>
                <div className="text-sm">{it.description}</div>
                <div className="text-xs text-gray-500">{it.category}</div>
                {it.allergens && <div className="mt-1 text-xs text-amber-700">Allergi: {it.allergens}</div>}
                {Array.isArray(it.customization_options) && it.customization_options.length > 0 && (
                  <div className="mt-1 text-xs text-gray-600">Tilpasninger: {it.customization_options.join(', ')}</div>
                )}
              </div>
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
