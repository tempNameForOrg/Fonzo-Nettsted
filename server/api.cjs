const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')
const WebSocket = require('ws')

const prisma = new PrismaClient()
const app = express()
app.use(cors())
app.use(bodyParser.json())

// optional: broadcast to WS server if available
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

function broadcast(msg) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    try { wsClient.send(JSON.stringify(msg)) } catch (e) {}
  }
}

app.get('/api/menu', async (req, res) => {
  const items = await prisma.menuItem.findMany({ orderBy: { position: 'asc' } })
  res.json(items)
})

app.post('/api/menu', async (req, res) => {
  const { name, description, price = 0, category = null, available = true, position = 0 } = req.body
  const item = await prisma.menuItem.create({ data: { name, description, price: Number(price), category, available: Boolean(available), position: Number(position) } })
  broadcast({ type: 'menu-created', item })
  res.json(item)
})

app.put('/api/menu/:id', async (req, res) => {
  const id = req.params.id
  const data = req.body
  if (data.price !== undefined) data.price = Number(data.price)
  if (data.available !== undefined) data.available = Boolean(data.available)
  const item = await prisma.menuItem.update({ where: { id }, data })
  broadcast({ type: 'menu-updated', item })
  res.json(item)
})

app.delete('/api/menu/:id', async (req, res) => {
  const id = req.params.id
  await prisma.menuItem.delete({ where: { id } })
  broadcast({ type: 'menu-deleted', id })
  res.json({ success: true })
})

const port = process.env.PORT || 4001
app.listen(port, () => console.log('API server listening on', port))

process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit() })
