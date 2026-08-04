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
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
`

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '')
}

const db = new Database(DB_FILE)
db.exec(initSql)

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

app.post('/api/menu', (req, res) => {
  const { name, description = null, price = 0, category = null, available = true, position = 0 } = req.body
  const id = String(Date.now())
  const createdAt = now()
  const updatedAt = createdAt
  db.prepare('INSERT INTO menu_items (id,name,description,price,category,available,position,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, name, description, Number(price), category, available ? 1 : 0, Number(position), createdAt, updatedAt)
  const item = { id, name, description, price: Number(price), category, available, position, createdAt, updatedAt }
  broadcast({ type: 'menu-created', item })
  res.json(item)
})

app.put('/api/menu/:id', (req, res) => {
  const id = req.params.id
  const { name, description, price, category, available, position } = req.body
  const updatedAt = now()
  const stmt = db.prepare('UPDATE menu_items SET name = coalesce(?, name), description = coalesce(?, description), price = coalesce(?, price), category = coalesce(?, category), available = coalesce(?, available), position = coalesce(?, position), updatedAt = ? WHERE id = ?')
  stmt.run(name, description, price !== undefined ? Number(price) : undefined, category, available !== undefined ? (available ? 1 : 0) : undefined, position !== undefined ? Number(position) : undefined, updatedAt, id)
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
