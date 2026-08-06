const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const WebSocket = require('ws')

const DB_FILE = path.join(__dirname, 'menu.db')
const initSql = `
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  category TEXT,
  allergens TEXT,
  customization_options TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'placed',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  menu_item_id TEXT,
  name TEXT NOT NULL,
  image TEXT,
  price REAL NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  customization TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL
);
`

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '')
}

const db = new Database(DB_FILE)
db.exec(initSql)

try {
  const menuCols = db.prepare('PRAGMA table_info(menu_items)').all().map((column) => column.name)
  if (!menuCols.includes('image')) db.prepare('ALTER TABLE menu_items ADD COLUMN image TEXT').run()
  if (!menuCols.includes('allergens')) db.prepare('ALTER TABLE menu_items ADD COLUMN allergens TEXT').run()
  if (!menuCols.includes('customization_options')) db.prepare('ALTER TABLE menu_items ADD COLUMN customization_options TEXT').run()

  const orderCols = db.prepare('PRAGMA table_info(order_items)').all().map((column) => column.name)
  if (!orderCols.includes('image')) db.prepare('ALTER TABLE order_items ADD COLUMN image TEXT').run()
  if (!orderCols.includes('customization')) db.prepare('ALTER TABLE order_items ADD COLUMN customization TEXT').run()
} catch (error) {
  console.warn('could not ensure schema columns', error)
}

try {
  const rows = db.prepare('SELECT id, customization_options FROM menu_items').all()
  const updateStmt = db.prepare('UPDATE menu_items SET customization_options = ? WHERE id = ?')
  for (const row of rows) {
    if (row.customization_options && String(row.customization_options).includes('[object Object]')) {
      const cleaned = normalizeCustomizationOptions(row.customization_options)
      updateStmt.run(JSON.stringify(cleaned), row.id)
    }
  }
} catch (e) {
  console.warn('DB cleanup warning', e)
}

function now() {
  return Date.now()
}

function parseCustomization(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (error) {
    return { raw: String(value) }
  }
}

function parseStringList(value) {
  if (!value) return []
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

function normalizeCustomizationOptions(value) {
  if (!value) return []

  let source = value
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source)
    } catch (e) {
      source = source.split('\n').map((s) => s.trim()).filter(Boolean)
    }
  }
  if (typeof source === 'string') {
    try { source = JSON.parse(source) } catch (e) {}
  }

  if (!Array.isArray(source)) return []

  return source
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const label = entry.trim()
        if (!label || label === '[object Object]') return null
        return {
          id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `opt-${index}`,
          label,
          price: 0,
          defaultQty: 0,
          available: true,
        }
      }

      if (!entry || typeof entry !== 'object') return null

      let label = ''
      if (typeof entry.label === 'string') label = entry.label.trim()
      else if (typeof entry.name === 'string') label = entry.name.trim()
      else if (typeof entry.option === 'string') label = entry.option.trim()

      if (!label || label === '[object Object]') return null

      return {
        id: String(entry.id || label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `opt-${index}`),
        label,
        price: Math.max(0, Number(entry.price) || 0),
        defaultQty: Math.max(0, Number(entry.defaultQty ?? entry.qty ?? 0) || 0),
        available: entry.available !== false,
      }
    })
    .filter(Boolean)
}

let wsClient = null
function connectWs() {
  try {
    wsClient = new WebSocket('ws://localhost:4000')
    wsClient.on('open', () => console.log('API connected to WS server'))
    wsClient.on('error', () => {
      wsClient = null
    })
    wsClient.on('close', () => {
      wsClient = null
      setTimeout(connectWs, 2000)
    })
  } catch (error) {
    wsClient = null
  }
}

connectWs()

function broadcast(msg) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    try {
      wsClient.send(JSON.stringify(msg))
    } catch (error) {}
  }
}

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/api/menu', (req, res) => {
  const rows = db.prepare('SELECT * FROM menu_items ORDER BY position ASC').all()
  res.json(
    rows.map((row) => ({
      ...row,
      available: !!row.available,
      customization_options: normalizeCustomizationOptions(row.customization_options),
    })),
  )
})

app.get('/api/orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all()
  res.json(
    rows.map((row) => ({
      ...row,
      items: db
        .prepare('SELECT menu_item_id as id, name, image, price, qty, customization FROM order_items WHERE order_id = ?')
        .all(row.id)
        .map((item) => ({
          ...item,
          customization: parseCustomization(item.customization),
        })),
    })),
  )
})

app.get('/api/orders/:id', (req, res) => {
  const id = req.params.id
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (!order) return res.status(404).json({ error: 'not found' })
  const items = db
    .prepare('SELECT menu_item_id as id, name, image, price, qty, customization FROM order_items WHERE order_id = ?')
    .all(id)
    .map((item) => ({
      ...item,
      customization: parseCustomization(item.customization),
    }))
  res.json({ ...order, items })
})

app.post('/api/orders', (req, res) => {
  const { items, total, status = 'placed' } = req.body
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items required' })

  const id = String(Date.now())
  const createdAt = now()
  const updatedAt = createdAt
  const insertOrder = db.prepare('INSERT INTO orders (id,total,status,createdAt,updatedAt) VALUES (?,?,?,?,?)')
  const insertItem = db.prepare('INSERT INTO order_items (order_id,menu_item_id,name,image,price,qty,customization) VALUES (?,?,?,?,?,?,?)')

  const tx = db.transaction((orderId, itemsArr) => {
    insertOrder.run(orderId, Number(total), status, createdAt, updatedAt)
    for (const item of itemsArr) {
      insertItem.run(orderId, item.id || null, item.name || '', item.image || null, Number(item.price || 0), Number(item.qty || 1), item.customization ? JSON.stringify(item.customization) : null)
    }
  })

  try {
    tx(id, items)
    const order = { id, items, total: Number(total), status, createdAt, updatedAt }
    broadcast({ type: 'order-created', order })
    return res.json(order)
  } catch (error) {
    console.error('Failed to insert order', error)
    return res.status(500).json({ error: 'failed to save order' })
  }
})

app.put('/api/orders/:id', (req, res) => {
  const id = req.params.id
  const { status } = req.body
  const updatedAt = now()
  db.prepare('UPDATE orders SET status = coalesce(?, status), updatedAt = ? WHERE id = ?').run(status, updatedAt, id)
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (!order) return res.status(404).json({ error: 'not found' })
  const items = db
    .prepare('SELECT menu_item_id as id, name, price, qty, customization FROM order_items WHERE order_id = ?')
    .all(id)
    .map((item) => ({
      ...item,
      customization: parseCustomization(item.customization),
    }))
  const full = { ...order, items }
  broadcast({ type: 'order-updated', order: full })
  res.json(full)
})

app.delete('/api/orders/:id', (req, res) => {
  const id = req.params.id
  try {
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id)
    const info = db.prepare('DELETE FROM orders WHERE id = ?').run(id)
    broadcast({ type: 'order-deleted', id })
    return res.json({ success: !!info.changes })
  } catch (error) {
    console.error('Failed to delete order', error)
    return res.status(500).json({ error: 'failed to delete' })
  }
})

app.post('/api/menu', (req, res) => {
  const { name, description = null, price = 0, category = null, allergens = null, customization_options = [], available = true, position = 0, image = null } = req.body
  if (!image) return res.status(400).json({ error: 'image required' })

  const id = String(Date.now())
  const createdAt = now()
  const updatedAt = createdAt
  const options = normalizeCustomizationOptions(customization_options)

  db.prepare('INSERT INTO menu_items (id,name,description,price,category,allergens,customization_options,available,position,image,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, name, description, Number(price), category, allergens, JSON.stringify(options), available ? 1 : 0, Number(position), image, createdAt, updatedAt)

  const item = { id, name, description, price: Number(price), category, allergens, customization_options: options, available, position, image, createdAt, updatedAt }
  broadcast({ type: 'menu-created', item })
  res.json(item)
})

app.put('/api/menu/:id', (req, res) => {
  const id = req.params.id
  const { name, description, price, category, allergens, customization_options, available, position, image } = req.body
  const updatedAt = now()
  const options = customization_options !== undefined ? JSON.stringify(normalizeCustomizationOptions(customization_options)) : undefined

  db.prepare('UPDATE menu_items SET name = coalesce(?, name), description = coalesce(?, description), price = coalesce(?, price), category = coalesce(?, category), allergens = coalesce(?, allergens), customization_options = coalesce(?, customization_options), available = coalesce(?, available), position = coalesce(?, position), image = coalesce(?, image), updatedAt = ? WHERE id = ?')
    .run(name, description, price !== undefined ? Number(price) : undefined, category, allergens, options, available !== undefined ? (available ? 1 : 0) : undefined, position !== undefined ? Number(position) : undefined, image !== undefined ? image : undefined, updatedAt, id)

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id)
  if (!item) return res.status(404).json({ error: 'not found' })
  item.available = !!item.available
  item.customization_options = normalizeCustomizationOptions(item.customization_options)
  broadcast({ type: 'menu-updated', item })
  res.json(item)
})

app.delete('/api/menu/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(id)
  broadcast({ type: 'menu-deleted', id })
  res.json({ success: true })
})

app.get('/api/categories', (req, res) => {
  const rows = db.prepare('SELECT id,name,createdAt FROM categories ORDER BY name ASC').all()
  res.json(rows)
})

app.post('/api/categories', (req, res) => {
  const { name } = req.body
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' })
  const id = String(Date.now())
  const createdAt = now()
  try {
    db.prepare('INSERT INTO categories (id,name,createdAt) VALUES (?,?,?)').run(id, String(name).trim(), createdAt)
    const category = { id, name: String(name).trim(), createdAt }
    broadcast({ type: 'category-created', category })
    res.json(category)
  } catch (error) {
    console.error('failed to create category', error)
    res.status(500).json({ error: 'failed' })
  }
})

app.delete('/api/categories/:id', (req, res) => {
  const id = req.params.id
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  if (!category) return res.status(404).json({ error: 'not found' })
  try {
    db.prepare('UPDATE menu_items SET category = NULL WHERE category = ?').run(category.name)
    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    broadcast({ type: 'category-deleted', id })
    res.json({ success: true })
  } catch (error) {
    console.error('failed to delete category', error)
    res.status(500).json({ error: 'failed' })
  }
})

const port = process.env.PORT || 4001
app.listen(port, () => console.log('API server listening on', port))

process.on('SIGINT', () => {
  db.close()
  process.exit()
})
