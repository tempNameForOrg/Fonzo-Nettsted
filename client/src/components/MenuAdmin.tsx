import React, { useEffect, useState } from "react"

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
  allergens?: string
  customization_options?: CustomizationOption[] | string | null
}

const emptyOption = (label = ''): CustomizationOption => ({
  id: 'opt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
  label,
  price: 0,
  defaultQty: 0,
  available: true,
})

const normalizeOptions = (value?: MenuItem['customization_options'], preserveEmpty = false): CustomizationOption[] => {
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
        if (!preserveEmpty && (!label || label === '[object Object]')) return null
        if (label === '[object Object]') return null
        return {
          id: label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `opt-${index}`,
          label,
          price: 0,
          defaultQty: 0,
          available: true,
        }
      }

      if (!option || typeof option !== 'object') return null

      let label = ''
      if (typeof option.label === 'string') label = option.label
      else if (typeof option.name === 'string') label = option.name
      else if (typeof option.option === 'string') label = option.option

      if (!preserveEmpty && (!label.trim() || label === '[object Object]')) return null
      if (label === '[object Object]') return null

      return {
        id: String(option.id || (label.trim() ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `opt-${Date.now()}-${index}`)),
        label,
        price: Math.max(0, Number(option.price) || 0),
        defaultQty: Math.max(0, Number(option.defaultQty ?? 0) || 0),
        available: option.available !== false,
      }
    })
    .filter(Boolean) as CustomizationOption[]
}

const MenuAdmin: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([])
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string, name: string }>>([])
  const [newCategory, setNewCategory] = useState('')

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
    try {
      const res = await fetch('/api/menu')
      const data = await res.json()
      setItems(data)
    } catch (e) {
      console.error('Failed to fetch menu items', e)
    }
  }

  const toggleAvailability = async (id: string, currentAvailable: boolean) => {
    const nextAvailable = !currentAvailable
    // Optimistic update
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, available: nextAvailable } : item)))
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ available: nextAvailable }),
      })
      if (!res.ok) {
        fetchItems()
      }
    } catch (error) {
      console.error('Failed to toggle availability', error)
      fetchItems()
    }
  }

  const save = async (item: Partial<MenuItem>) => {
    if (!item.name || !item.name.trim()) { alert('Navn er påkrevd'); return }
    if (!item.image) { alert('Bilde (URL eller opplastet) er påkrevd'); return }
    if (!item.category) { alert('Kategori er påkrevd'); return }

    const rawOptions = Array.isArray(item.customization_options)
      ? item.customization_options
      : normalizeOptions(item.customization_options, true)

    // Clean up empty option labels before saving
    const customization_options = rawOptions
      .filter((opt) => opt.label && opt.label.trim() !== '')
      .map((opt) => ({
        id: opt.id || opt.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: opt.label.trim(),
        price: Math.max(0, Number(opt.price) || 0),
        defaultQty: Math.max(0, Number(opt.defaultQty) || 0),
        available: opt.available !== false,
      }))

    const payload = {
      ...item,
      name: item.name.trim(),
      price: Number(item.price) || 0,
      available: item.available !== false,
      customization_options,
    }

    try {
      if (item.id) {
        await fetch(`/api/menu/${item.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/menu', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      }
      setEditing(null)
      fetchItems()
    } catch (e) {
      console.error('Failed to save menu item', e)
      alert('Kunne ikke lagre retten')
    }
  }

  const startEdit = (item: MenuItem) => {
    setEditing({
      ...item,
      customization_options: normalizeOptions(item.customization_options, true),
    })
  }

  const startNewItem = () => {
    setEditing({
      name: '',
      price: 0,
      available: true,
      category: categories[0]?.name || '',
      description: '',
      allergens: '',
      customization_options: [emptyOption('')],
      image: '',
    })
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
    if (!confirm('Vil du slette kategorien? Retter i kategorien mister sin kategori.')) return
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      fetchCategories()
      fetchItems()
    } catch (e) { console.error('failed delete category', e) }
  }

  const remove = async (id: string) => {
    if (!confirm('Vil du slette retten fra menyen?')) return
    await fetch(`/api/menu/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  const getOptionsList = (optionsVal?: CustomizationOption[] | string | null): CustomizationOption[] => {
    if (Array.isArray(optionsVal)) return optionsVal
    return normalizeOptions(optionsVal, true)
  }

  const addOption = () => {
    setEditing((current) => {
      if (!current) return current
      const currentOpts = getOptionsList(current.customization_options)
      return {
        ...current,
        customization_options: [...currentOpts, emptyOption('')],
      }
    })
  }

  const updateOption = (index: number, patch: Partial<CustomizationOption>) => {
    setEditing((current) => {
      if (!current) return current
      const currentOpts = getOptionsList(current.customization_options)
      const nextOpts = [...currentOpts]
      if (nextOpts[index]) {
        nextOpts[index] = { ...nextOpts[index], ...patch }
      }
      return { ...current, customization_options: nextOpts }
    })
  }

  const deleteOption = (index: number) => {
    setEditing((current) => {
      if (!current) return current
      const currentOpts = getOptionsList(current.customization_options)
      const nextOpts = [...currentOpts]
      nextOpts.splice(index, 1)
      return { ...current, customization_options: nextOpts }
    })
  }

  const editingOptions = editing ? getOptionsList(editing.customization_options) : []

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Menystyring (Admin)</h2>
          <p className="text-sm text-gray-600">Legg til retter, tilpasningsvalg og endre status på menyen.</p>
        </div>
        <button
          className="inline-flex items-center justify-center px-4 py-2.5 bg-forest text-white font-medium rounded-xl shadow-sm hover:bg-forest/90 transition-colors"
          onClick={startNewItem}
        >
          + Legg til ny rett
        </button>
      </div>

      <div className="p-4 border border-gray-200 rounded-2xl bg-white shadow-sm max-w-xl">
        <div className="font-semibold text-gray-900 mb-2">Kategorier</div>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Ny kategori (f.eks. Tacos, Drikke)"
          />
          <button className="px-4 py-2 bg-forest text-white text-sm font-medium rounded-xl hover:bg-forest/90" onClick={addCategory}>
            Legg til
          </button>
        </div>
        <ul className="divide-y divide-gray-100 text-sm">
          {categories.map(c => (
            <li key={c.id} className="flex justify-between items-center py-2">
              <span className="font-medium text-gray-800">{c.name}</span>
              <button className="text-xs text-red-600 hover:text-red-800 font-medium" onClick={() => removeCategory(c.id)}>
                Slett
              </button>
            </li>
          ))}
          {categories.length === 0 && <li className="text-gray-500 py-1">Ingen kategorier lagt til enda</li>}
        </ul>
      </div>

      {editing && (
        <div className="p-6 border border-gray-200 rounded-3xl bg-white shadow-lg max-w-3xl space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900">
              {editing.id ? `Rediger rett: ${editing.name || ''}` : 'Ny rett'}
            </h3>
            <button className="text-gray-400 hover:text-gray-600 text-lg font-bold" onClick={() => setEditing(null)}>
              ✕
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Navn på rett</label>
              <input
                className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest"
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="f.eks. Birria Taco"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Kategori</label>
              <select
                className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-white"
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                <option value="">-- Velg kategori --</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Pris (NOK)</label>
              <input
                className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest"
                type="number"
                min={0}
                value={editing.price ?? 0}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={editing.available !== false}
                  onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                <span className="ml-3 text-sm font-semibold text-gray-800">
                  {editing.available !== false ? 'Tilgjengelig i menyen' : 'Utsolgt'}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Beskrivelse</label>
            <textarea
              className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest"
              rows={2}
              value={editing.description || ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Ingredienser, smak, servering..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Allergener / dietter</label>
            <input
              className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest"
              value={editing.allergens || ''}
              onChange={(e) => setEditing({ ...editing, allergens: e.target.value })}
              placeholder="f.eks. gluten, melk, sesam, vegansk"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold text-gray-900">Tilpasningsvalg (Customization options)</div>
                <div className="text-xs text-gray-500">Valg kunden kan velge antall av (f.eks. Ekstra kjøtt, Ekstra saus).</div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                onClick={addOption}
              >
                + Legg til valg
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {editingOptions.map((option, index) => (
                <div key={option.id || index} className="p-3 border border-gray-200 rounded-2xl bg-gray-50/80 space-y-2">
                  <div className="grid gap-3 sm:grid-cols-[1fr_100px_100px_auto] items-end">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Valgnavn</label>
                      <input
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-forest"
                        value={option.label}
                        onChange={(e) => updateOption(index, { label: e.target.value })}
                        placeholder="f.eks. Ekstra guacamole"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Tillegg (kr)</label>
                      <input
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-forest"
                        type="number"
                        min={0}
                        value={option.price ?? 0}
                        onChange={(e) => updateOption(index, { price: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Standard antall</label>
                      <input
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-forest"
                        type="number"
                        min={0}
                        value={option.defaultQty}
                        onChange={(e) => updateOption(index, { defaultQty: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-forest focus:ring-forest"
                          checked={option.available !== false}
                          onChange={(e) => updateOption(index, { available: e.target.checked })}
                        />
                        På lager
                      </label>
                      <button
                        type="button"
                        className="p-1 text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                        onClick={() => deleteOption(index)}
                        title="Fjern valg"
                      >
                        Slett
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {editingOptions.length === 0 && (
                <div className="text-xs text-gray-500 italic py-2">Ingen tilpasningsvalg enda. Trykk "+ Legg til valg".</div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Bilde URL</label>
            <input
              className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest"
              value={editing.image || ''}
              onChange={(e) => setEditing({ ...editing, image: e.target.value })}
              placeholder="https://..."
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Eller last opp bilde:</span>
              <input
                className="text-xs text-gray-600"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files && e.target.files[0]
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = () => setEditing({ ...editing, image: String(reader.result) })
                  reader.readAsDataURL(f)
                }}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <button className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer" onClick={() => setEditing(null)}>
              Avbryt
            </button>
            <button className="px-5 py-2.5 bg-forest text-white text-sm font-semibold rounded-xl hover:bg-forest/90 shadow-sm cursor-pointer" onClick={() => save(editing)}>
              Lagre rett
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Menyretter ({items.length})</h3>
        <ul className="space-y-3">
          {items.map((it) => {
            const opts = normalizeOptions(it.customization_options, true)
            return (
              <li key={it.id} className="p-4 border border-gray-200 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white shadow-sm hover:border-gray-300 transition-colors">
                <div className="flex items-start sm:items-center min-w-0 gap-3">
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="w-16 h-16 object-cover rounded-xl shrink-0 bg-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center text-xs text-gray-400">Ikke bilde</div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{it.name}</span>
                      <span className="font-semibold text-forest text-sm">{it.price} kr</span>
                      {it.category && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{it.category}</span>
                      )}
                    </div>
                    {it.description && <div className="text-xs text-gray-600 line-clamp-1">{it.description}</div>}
                    <div className="flex flex-wrap gap-2 items-center text-xs pt-1">
                      {/* Quick 1-click availability toggle */}
                      <button
                        type="button"
                        onClick={() => toggleAvailability(it.id, it.available)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          it.available
                            ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
                        }`}
                        title="Klikk for å endre tilgjengelighet for kunden"
                      >
                        {it.available ? '✓ Tilgjengelig' : '✕ Utsolgt'}
                      </button>

                      {it.allergens && (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800 text-[11px] font-medium">
                          Allergi: {it.allergens}
                        </span>
                      )}
                    </div>
                    {opts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 text-xs pt-1">
                        {opts.map((option) => (
                          <span
                            key={option.id}
                            className={`rounded-lg px-2 py-0.5 border text-[11px] ${
                              option.available !== false
                                ? 'bg-gray-50 border-gray-200 text-gray-700'
                                : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                            }`}
                          >
                            {option.label} {option.price ? `(+${option.price} kr)` : ''} {option.defaultQty > 0 ? `(std: ${option.defaultQty})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => startEdit(it)}
                  >
                    Rediger
                  </button>
                  <button
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-semibold text-red-600 transition-colors cursor-pointer"
                    onClick={() => remove(it.id)}
                  >
                    Slett
                  </button>
                </div>
              </li>
            )
          })}
          {items.length === 0 && <li className="text-gray-500 text-center py-6">Ingen retter registrert i menyen enda.</li>}
        </ul>
      </div>
    </section>
  )
}

export default MenuAdmin
