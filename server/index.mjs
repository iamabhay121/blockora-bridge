import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import {
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  PrivateKey,
} from '@hashgraph/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const PORT = Number(process.env.PORT || process.env.HEDERA_API_PORT || 8787)
const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || ''
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || ''
const PUBLIC_API_URL = (
  process.env.PUBLIC_API_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`
).replace(/\/$/, '')

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error('Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in the environment')
  process.exit(1)
}

const META_DIR = path.join(__dirname, 'nft-metadata')
fs.mkdirSync(META_DIR, { recursive: true })

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

function getClient() {
  const client = Client.forTestnet()
  const operator = AccountId.fromString(OPERATOR_ID)
  const key = PrivateKey.fromString(OPERATOR_KEY)
  client.setOperator(operator, key)
  return client
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, network: 'testnet' })
})

/**
 * Create a funded Hedera Testnet account using the server operator.
 * Body: { balance?: number, memo?: string }
 */
app.post('/api/hedera/create-account', async (req, res) => {
  const balance = Number(req.body?.balance ?? 50)
  const memo = typeof req.body?.memo === 'string' ? req.body.memo.trim() : ''

  if (!Number.isFinite(balance) || balance < 0 || balance > 500) {
    res.status(400).json({ error: 'Initial balance must be between 0 and 500 HBAR' })
    return
  }

  let client
  try {
    client = getClient()
    const newKey = PrivateKey.generateED25519()

    const tx = new AccountCreateTransaction()
      .setKey(newKey.publicKey)
      .setInitialBalance(new Hbar(balance))
      .setMaxAutomaticTokenAssociations(10)

    if (memo) tx.setAccountMemo(memo)

    const response = await tx.execute(client)
    const receipt = await response.getReceipt(client)

    if (!receipt.accountId) {
      res.status(500).json({ error: 'Account created but no account ID returned' })
      return
    }

    res.json({
      accountId: receipt.accountId.toString(),
      privateKey: newKey.toString(),
      transactionId: response.transactionId.toString(),
      initialBalance: balance,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Account creation failed'
    console.error('[create-account]', message)
    res.status(500).json({ error: message })
  } finally {
    client?.close()
  }
})

/**
 * Store NFT metadata JSON and return a fetchable URL (for tokenURI / Hedera metadata pointer).
 * Body: { json: object | string, filename?: string }
 */
app.post('/api/nft-metadata', (req, res) => {
  try {
    let payload = req.body?.json
    if (payload == null) {
      res.status(400).json({ error: 'Missing json field' })
      return
    }
    if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      res.status(400).json({ error: 'JSON must be an object' })
      return
    }

    const id = crypto.randomBytes(8).toString('hex')
    const filePath = path.join(META_DIR, `${id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')

    const url = `${PUBLIC_API_URL}/api/nft-metadata/${id}`
    res.json({ id, url, bytes: Buffer.byteLength(url, 'utf8') })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store metadata'
    res.status(400).json({ error: message })
  }
})

app.get('/api/nft-metadata/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-f0-9]/gi, '')
  if (!id) {
    res.status(400).json({ error: 'Invalid id' })
    return
  }
  const filePath = path.join(META_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Metadata not found' })
    return
  }
  res.setHeader('Content-Type', 'application/json')
  res.send(fs.readFileSync(filePath, 'utf8'))
})

const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Blockora listening on ${PORT} (${PUBLIC_API_URL})`)
})
