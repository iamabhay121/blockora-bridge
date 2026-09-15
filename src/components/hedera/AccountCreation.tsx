import { useState } from 'react'
import { createAccountViaApi } from '../../services/hedera/api'
import { HASHSCAN_TX } from '../../lib/constants'
import { Panel, Field, inputClass, btnPrimary, btnSecondary } from '../ui/Panel'

type Props = {
  onStatus: (msg: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => void
  onUseAccount?: (accountId: string, privateKey: string) => void
}

export function AccountCreation({ onStatus, onUseAccount }: Props) {
  const [balance, setBalance] = useState('50')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<{ id: string; key: string } | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    onStatus('Creating Hedera account…', 'info')
    try {
      const res = await createAccountViaApi(Number(balance) || 50, memo)
      setCreated({ id: res.accountId, key: res.privateKey })
      onStatus(`Account created: ${res.accountId}`, 'success', {
        href: HASHSCAN_TX(res.transactionId),
        label: 'View on HashScan',
      })
    } catch (e) {
      onStatus(e instanceof Error ? e.message : 'Account creation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel
      title="Create Hedera account"
      subtitle="Funded automatically from the Blockora Bridge operator (Testnet). No operator key needed in the UI."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Initial HBAR">
          <input className={inputClass} value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
        <Field label="Memo (optional)">
          <input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <button type="button" className={btnPrimary} disabled={loading} onClick={() => void handleCreate()}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </div>
      {created && (
        <div className="mt-4 animate-pulse-ok rounded-xl border border-ok/30 bg-ok/5 p-4 text-sm">
          <p className="font-semibold text-ok">New credentials — save these</p>
          <p className="mt-2 break-all text-text">ID: {created.id}</p>
          <p className="mt-1 break-all text-muted">Key: {created.key}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => void navigator.clipboard.writeText(`${created.id}\n${created.key}`)}
            >
              Copy
            </button>
            {onUseAccount && (
              <button
                type="button"
                className={btnPrimary}
                onClick={() => onUseAccount(created.id, created.key)}
              >
                Use in forms below
              </button>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
