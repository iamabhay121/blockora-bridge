import { useEffect, useState } from 'react'
import type { Client } from '@hashgraph/sdk'
import { associateToken } from '../../services/hedera/tokenService'
import { createNftCollection, mintNft, transferNft } from '../../services/hedera/nftService'
import { HASHSCAN_TX } from '../../lib/constants'
import { Panel, Field, inputClass, btnPrimary, btnSecondary } from '../ui/Panel'
import { NftMetadataInput } from '../ui/NftMetadataInput'

type StatusFn = (msg: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => void

type Props = {
  client: Client
  defaultAccountId: string
  defaultPrivateKey: string
  defaultNftTokenId: string
  onNftCreated: (tokenId: string) => void
  onStatus: StatusFn
}

export function NftPanels({
  client,
  defaultAccountId,
  defaultPrivateKey,
  defaultNftTokenId,
  onNftCreated,
  onStatus,
}: Props) {
  const [accountId, setAccountId] = useState(defaultAccountId)
  const [privateKey, setPrivateKey] = useState(defaultPrivateKey)
  const [name, setName] = useState('Blockora Bridge NFT')
  const [symbol, setSymbol] = useState('BNFT')
  const [nftTokenId, setNftTokenId] = useState(defaultNftTokenId)
  const [metadata, setMetadata] = useState('ipfs://example/1.json')
  const [serial, setSerial] = useState('1')
  const [to, setTo] = useState('')
  const [recipientKey, setRecipientKey] = useState('')
  const [needsAssociate, setNeedsAssociate] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (defaultAccountId) setAccountId(defaultAccountId)
    if (defaultPrivateKey) setPrivateKey(defaultPrivateKey)
  }, [defaultAccountId, defaultPrivateKey])

  useEffect(() => {
    if (defaultNftTokenId) setNftTokenId(defaultNftTokenId)
  }, [defaultNftTokenId])

  const id = () => accountId || defaultAccountId
  const key = () => privateKey || defaultPrivateKey
  const tid = () => nftTokenId || defaultNftTokenId

  const create = async () => {
    setBusy(true)
    onStatus('Creating NFT collection…', 'info')
    try {
      const res = await createNftCollection(client, id(), key(), name, symbol)
      setNftTokenId(res.tokenId)
      onNftCreated(res.tokenId)
      onStatus(`NFT collection created: ${res.tokenId}`, 'success', {
        href: HASHSCAN_TX(res.transactionId),
        label: 'View on HashScan',
      })
    } catch (e) {
      onStatus(e instanceof Error ? e.message : 'NFT create failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const mint = async () => {
    setBusy(true)
    onStatus('Minting NFT…', 'info')
    try {
      const res = await mintNft(client, id(), key(), tid(), metadata)
      if (res.serial) setSerial(res.serial)
      onStatus(`Minted serial #${res.serial || '?'}`, 'success', {
        href: HASHSCAN_TX(res.transactionId),
        label: 'View on HashScan',
      })
    } catch (e) {
      onStatus(e instanceof Error ? e.message : 'Mint failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const transfer = async () => {
    setBusy(true)
    setNeedsAssociate(false)
    onStatus('Transferring NFT…', 'info')
    try {
      const res = await transferNft(client, id(), key(), to, tid(), serial)
      onStatus(`Transferred NFT #${serial}`, 'success', {
        href: HASHSCAN_TX(res.transactionId),
        label: 'View on HashScan',
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transfer failed'
      if (/TOKEN_NOT_ASSOCIATED/i.test(msg)) {
        setNeedsAssociate(true)
        onStatus('Recipient must associate this NFT collection first.', 'error')
      } else {
        onStatus(msg, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const associate = async () => {
    setBusy(true)
    onStatus('Associating NFT collection…', 'info')
    try {
      const res = await associateToken(client, to, recipientKey, tid())
      setNeedsAssociate(false)
      onStatus('Associated — try transfer again.', 'success', {
        href: HASHSCAN_TX(res.transactionId),
        label: 'View on HashScan',
      })
    } catch (e) {
      onStatus(e instanceof Error ? e.message : 'Association failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Create NFT collection"
        subtitle="Hedera NonFungibleUnique token. Mint serials after create. Metadata max 100 bytes."
        accent="amber"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Treasury account ID">
            <input className={inputClass} value={id()} onChange={(e) => setAccountId(e.target.value)} />
          </Field>
          <Field label="Treasury private key">
            <input
              className={inputClass}
              type="password"
              value={key()}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
          </Field>
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Symbol">
            <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </Field>
        </div>
        <button type="button" className={`${btnPrimary} mt-4`} disabled={busy} onClick={() => void create()}>
          {busy ? 'Working…' : 'Create NFT collection'}
        </button>
      </Panel>

      <Panel title="Mint & transfer NFT" subtitle="Mint adds a serial to the collection. Transfer moves one serial.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NFT token ID">
            <input className={inputClass} value={tid()} onChange={(e) => setNftTokenId(e.target.value)} />
          </Field>
          <NftMetadataInput
            value={metadata}
            onChange={setMetadata}
            hederaLimit
            onStatus={(msg, kind) => onStatus(msg, kind)}
          />
        </div>
        <button type="button" className={`${btnPrimary} mt-4`} disabled={busy || !tid() || !metadata.trim()} onClick={() => void mint()}>
          Mint NFT
        </button>

        <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Field label="Serial number">
            <input className={inputClass} value={serial} onChange={(e) => setSerial(e.target.value)} />
          </Field>
          <Field label="Recipient account ID">
            <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <button
          type="button"
          className={`${btnSecondary} mt-4`}
          disabled={busy || !tid() || !to}
          onClick={() => void transfer()}
        >
          Transfer NFT
        </button>

        {needsAssociate && (
          <div className="mt-5 space-y-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
            <p className="text-sm font-semibold text-warn">Associate NFT collection for recipient</p>
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
              disabled={busy || !recipientKey}
              onClick={() => void associate()}
            >
              Associate NFT
            </button>
          </div>
        )}
      </Panel>
    </div>
  )
}
