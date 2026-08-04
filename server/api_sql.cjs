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
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
`

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '')
}

const db = new Database(DB_FILE)
db.exec(initSql)

// ensure image column exists (in case DB created before this change)
try {
  const cols = db.prepare("PRAGMA table_info(menu_items)").all().map(c => c.name)
  if (!cols.includes('image')) {
    db.prepare('ALTER TABLE menu_items ADD COLUMN image TEXT').run()
  }
  const itemCols = db.prepare("PRAGMA table_info(order_items)").all().map(c => c.name)
  if (!itemCols.includes('image')) {
    db.prepare('ALTER TABLE order_items ADD COLUMN image TEXT').run()
  }
} catch (e) { console.warn('could not ensure image column', e) }

// helper
function now() { return Date.now() }

// optional ws client
let wsClient = null
function connectWs() {
  try {
    wsClient = new WebSocket('ws://localhost:4000')
    wsClient.on('open', () => console.log('API connected to WS server'))
    wsClient.on('error', () => { wsClient = null })
    wsClient.on('close', () => { wsClient = null; setTimeout(connectWs, 2000) })
  } catch (e) { wsClient = null }
}
connectWs()
function broadcast(msg) { if (wsClient && wsClient.readyState === WebSocket.OPEN) { try { wsClient.send(JSON.stringify(msg)) } catch (e) {} } }

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/api/menu', (req, res) => {
  const rows = db.prepare('SELECT * FROM menu_items ORDER BY position ASC').all()
  res.json(rows.map(r => ({ ...r, available: !!r.available })))
})

// Orders endpoints
app.get('/api/orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all()
  const result = rows.map(r => {
    const items = db.prepare('SELECT menu_item_id as id, name, image, price, qty FROM order_items WHERE order_id = ?').all(r.id)
    return { ...r, items }
  })
  res.json(result)
})

app.get('/api/orders/:id', (req, res) => {
  const id = req.params.id
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (!order) return res.status(404).json({ error: 'not found' })
  const items = db.prepare('SELECT menu_item_id as id, name, image, price, qty FROM order_items WHERE order_id = ?').all(id)
  res.json({ ...order, items })
})

app.post('/api/orders', (req, res) => {
  const { items, total, status = 'placed' } = req.body
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items required' })
  const id = String(Date.now())
  const createdAt = now()
  const updatedAt = createdAt
  const insertOrder = db.prepare('INSERT INTO orders (id,total,status,createdAt,updatedAt) VALUES (?,?,?,?,?)')
  const insertItem = db.prepare('INSERT INTO order_items (order_id,menu_item_id,name,image,price,qty) VALUES (?,?,?,?,?,?)')
  const tx = db.transaction((orderId, itemsArr) => {
    insertOrder.run(orderId, Number(total), status, createdAt, updatedAt)
    for (const it of itemsArr) {
      insertItem.run(orderId, it.id || null, it.name || '', it.image || null, Number(it.price || 0), Number(it.qty || 1))
    }
  })
  try {
    tx(id, items)
    const order = { id, items, total: Number(total), status, createdAt, updatedAt }
    broadcast({ type: 'order-created', order })
    return res.json(order)
  } catch (e) {
    console.error('Failed to insert order', e)
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
  const items = db.prepare('SELECT menu_item_id as id, name, price, qty FROM order_items WHERE order_id = ?').all(id)
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
  } catch (e) {
    console.error('Failed to delete order', e)
    return res.status(500).json({ error: 'failed to delete' })
  }
})

app.post('/api/menu', (req, res) => {
  const { name, description = null, price = 0, category = null, available = true, position = 0, image = null } = req.body
  const id = String(Date.now())
  const createdAt = now()
  const updatedAt = createdAt
  db.prepare('INSERT INTO menu_items (id,name,description,price,category,available,position,image,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, name, description, Number(price), category, available ? 1 : 0, Number(position), image, createdAt, updatedAt)
  const item = { id, name, description, price: Number(price), category, available, position, image, createdAt, updatedAt }
  broadcast({ type: 'menu-created', item })
  res.json(item)
})

app.put('/api/menu/:id', (req, res) => {
  const id = req.params.id
  const { name, description, price, category, available, position, image } = req.body
  const updatedAt = now()
  const stmt = db.prepare('UPDATE menu_items SET name = coalesce(?, name), description = coalesce(?, description), price = coalesce(?, price), category = coalesce(?, category), available = coalesce(?, available), position = coalesce(?, position), image = coalesce(?, image), updatedAt = ? WHERE id = ?')
  stmt.run(name, description, price !== undefined ? Number(price) : undefined, category, available !== undefined ? (available ? 1 : 0) : undefined, position !== undefined ? Number(position) : undefined, image !== undefined ? image : undefined, updatedAt, id)
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id)
  if (!item) return res.status(404).json({ error: 'not found' })
  item.available = !!item.available
  broadcast({ type: 'menu-updated', item })
  res.json(item)
})

app.delete('/api/menu/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(id)
  broadcast({ type: 'menu-deleted', id })
  res.json({ success: true })
})

const port = process.env.PORT || 4001
app.listen(port, () => console.log('API server listening on', port))

process.on('SIGINT', () => { db.close(); process.exit() })
