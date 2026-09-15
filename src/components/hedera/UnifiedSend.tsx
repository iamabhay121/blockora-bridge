import { useEffect, useState } from 'react'
import type { Client } from '@hashgraph/sdk'
import { associateToken, createToken } from '../../services/hedera/tokenService'
import { transferHbar, transferToken } from '../../services/hedera/transfers'
import { HASHSCAN_TX } from '../../lib/constants'
import { Panel, Field, inputClass, btnPrimary } from '../ui/Panel'

type StatusFn = (msg: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => void

type AssetType = 'hbar' | 'token'

type SendProps = {
  client: Client
  defaultAccountId: string
  defaultPrivateKey: string
  defaultTokenId: string
  onSuccess: () => void
  onStatus: StatusFn
}

export function UnifiedSend({
  client,
  defaultAccountId,
  defaultPrivateKey,
  defaultTokenId,
  onSuccess,
  onStatus,
}: SendProps) {
  const [asset, setAsset] = useState<AssetType>('hbar')
  const [fromId, setFromId] = useState(defaultAccountId)
  const [fromKey, setFromKey] = useState(defaultPrivateKey)
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('1')
  const [tokenId, setTokenId] = useState(defaultTokenId)
  const [loading, setLoading] = useState(false)
  const [needsAssociate, setNeedsAssociate] = useState(false)
  const [recipientKey, setRecipientKey] = useState('')
  const [associating, setAssociating] = useState(false)

  useEffect(() => {
    setFromId(defaultAccountId)
    setFromKey(defaultPrivateKey)
  }, [defaultAccountId, defaultPrivateKey])

  useEffect(() => {
    setTokenId(defaultTokenId)
  }, [defaultTokenId])

  const send = async () => {
    setLoading(true)
    setNeedsAssociate(false)
    onStatus(asset === 'hbar' ? 'Sending HBAR…' : 'Sending tokens…', 'info')
    try {
      if (asset === 'hbar') {
        const res = await transferHbar(client, fromId, fromKey, to, amount)
        onStatus(`Sent ${amount} HBAR`, 'success', {
          href: HASHSCAN_TX(res.transactionId),
          label: 'View on HashScan',
        })
      } else {
        const res = await transferToken(client, fromId, fromKey, to, tokenId, amount)
        onStatus(`Sent ${amount} tokens`, 'success', {
          href: HASHSCAN_TX(res.transactionId),
          label: 'View on HashScan',
        })
      }
      onSuccess()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transfer failed'
      if (asset === 'token' && /TOKEN_NOT_ASSOCIATED/i.test(msg)) {
        setNeedsAssociate(true)
        onStatus('Recipient must associate this token first — use the option below.', 'error')
      } else {
        onStatus(msg, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const associate = async () => {
    setAssociating(true)
    onStatus('Associating token for recipient…', 'info')
    try {
      const res = await associateToken(client, to, recipientKey, tokenId)
      setNeedsAssociate(false)
      onStatus('Token associated — you can send again.', 'success', {
        href: HASHSCAN_TX(res.transactionId),
        label: 'View on HashScan',
      })
    } catch (e) {
      onStatus(e instanceof Error ? e.message : 'Association failed', 'error')
    } finally {
      setAssociating(false)
    }
  }

  return (
    <Panel
      title="Send"
      subtitle="Choose HBAR or token. If a token transfer needs association, that option appears here."
      accent="sky"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asset">
          <select
            className={inputClass}
            value={asset}
            onChange={(e) => {
              setAsset(e.target.value as AssetType)
              setNeedsAssociate(false)
            }}
          >
            <option value="hbar">HBAR</option>
            <option value="token">Fungible token</option>
          </select>
        </Field>
        {asset === 'token' && (
          <Field label="Token ID">
            <input
              className={inputClass}
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="0.0.x"
            />
          </Field>
        )}
        <Field label="From account ID">
          <input
            className={inputClass}
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            placeholder="0.0.x"
          />
        </Field>
        <Field label="From private key">
          <input
            className={inputClass}
            type="password"
            value={fromKey}
            onChange={(e) => setFromKey(e.target.value)}
          />
        </Field>
        <Field label="Recipient account ID">
          <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} placeholder="0.0.x" />
        </Field>
        <Field label={asset === 'hbar' ? 'Amount (HBAR)' : 'Amount (tokens)'}>
          <input className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
      <button
        type="button"
        className={`${btnPrimary} mt-4`}
        disabled={loading || !fromId || !to || (asset === 'token' && !tokenId)}
        onClick={() => void send()}
      >
        {loading ? 'Sending…' : asset === 'hbar' ? 'Send HBAR' : 'Send tokens'}
      </button>

      {needsAssociate && (
        <div className="mt-5 space-y-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
          <p className="text-sm font-semibold text-warn">Associate token for recipient</p>
          <p className="text-xs text-muted">
            The recipient must sign an association. Enter their private key (Testnet only), then associate and retry
            send.
          </p>
          <Field label="Recipient private key">
            <input
              className={inputClass}
              type="password"
              value={recipientKey}
              onChange={(e) => setRecipientKey(e.target.value)}
            />
          </Field>
          <button
            type="button"
            className={btnPrimary}
            disabled={associating || !recipientKey || !to}
            onClick={() => void associate()}
          >
            {associating ? 'Associating…' : 'Associate token'}
          </button>
        </div>
      )}
    </Panel>
  )
}

type CreateProps = {
  client: Client
  defaultAccountId: string
  defaultPrivateKey: string
  onCreated: (tokenId: string) => void
  onStatus: StatusFn
}

export function TokenCreation({
  client,
  defaultAccountId,
  defaultPrivateKey,
  onCreated,
  onStatus,
}: CreateProps) {
  const [accountId, setAccountId] = useState(defaultAccountId)
  const [privateKey, setPrivateKey] = useState(defaultPrivateKey)
  const [name, setName] = useState('Blockora Bridge Token')
  const [symbol, setSymbol] = useState('BORA')
  const [supply, setSupply] = useState('1000')
  const [decimals, setDecimals] = useState('0')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setAccountId(defaultAccountId)
    setPrivateKey(defaultPrivateKey)
  }, [defaultAccountId, defaultPrivateKey])

  const handleCreate = async () => {
    if (!accountId.trim() || !privateKey.trim()) {
      onStatus('Enter the treasury account ID and private key.', 'error')
      return
    }
    setLoading(true)
    onStatus('Creating token…', 'info')
    try {
      const res = await createToken(client, accountId, privateKey, name, symbol, supply, parseInt(decimals, 10) || 0)
      onCreated(res.tokenId)
      onStatus(`Token created: ${res.tokenId}`, 'success', {
        href: HASHSCAN_TX(res.transactionId),
        label: 'View on HashScan',
      })
    } catch (e) {
      onStatus(e instanceof Error ? e.message : 'Token creation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel
      title="Create fungible token"
      subtitle="Supply is in whole tokens (what HashScan shows). Decimals usually 0 for demos."
      accent="sky"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Treasury account ID">
          <input
            className={inputClass}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="0.0.x"
          />
        </Field>
        <Field label="Treasury private key">
          <input
            className={inputClass}
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
          />
        </Field>
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Symbol">
          <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        </Field>
        <Field label="Initial supply (tokens)">
          <input className={inputClass} value={supply} onChange={(e) => setSupply(e.target.value)} />
        </Field>
        <Field label="Decimals">
          <input className={inputClass} value={decimals} onChange={(e) => setDecimals(e.target.value)} />
        </Field>
      </div>
      <button type="button" className={`${btnPrimary} mt-4`} disabled={loading} onClick={() => void handleCreate()}>
        {loading ? 'Creating…' : 'Create token'}
      </button>
    </Panel>
  )
}
