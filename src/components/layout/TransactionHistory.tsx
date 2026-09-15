import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChainMode } from '../../lib/constants'
import type { TxHistoryItem } from '../../hooks/useTxHistory'
import { fetchHederaTxHistory, fetchSepoliaTxHistory } from '../../services/txHistoryService'
import { Panel, btnSecondary } from '../ui/Panel'

function formatTime(at: number) {
  try {
    return new Date(at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return String(at)
  }
}

function shortHref(href: string) {
  try {
    const u = new URL(href)
    const tail = u.pathname.split('/').filter(Boolean).pop() || ''
    if (tail.length > 18) return `${tail.slice(0, 10)}…${tail.slice(-6)}`
    return tail || href
  } catch {
    return href.slice(0, 24)
  }
}

export function TransactionHistory({
  chain,
  items,
  onClear,
  ethAddress,
  hederaAccountId,
}: {
  chain: ChainMode
  items: TxHistoryItem[]
  onClear: () => void
  ethAddress?: string | null
  hederaAccountId?: string | null
}) {
  const [onChain, setOnChain] = useState<TxHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const localItems = useMemo(() => items.filter((i) => i.chain === chain), [items, chain])

  const loadOnChain = useCallback(async () => {
    setError(null)
    if (chain === 'ethereum') {
      if (!ethAddress) {
        setOnChain([])
        return
      }
      setLoading(true)
      try {
        const txs = await fetchSepoliaTxHistory(ethAddress)
        setOnChain(txs)
      } catch (e) {
        setOnChain([])
        setError(e instanceof Error ? e.message : 'Failed to load on-chain history')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!hederaAccountId?.trim()) {
      setOnChain([])
      return
    }
    setLoading(true)
    try {
      const txs = await fetchHederaTxHistory(hederaAccountId.trim())
      setOnChain(txs)
    } catch (e) {
      setOnChain([])
      setError(e instanceof Error ? e.message : 'Failed to load on-chain history')
    } finally {
      setLoading(false)
    }
  }, [chain, ethAddress, hederaAccountId])

  useEffect(() => {
    void loadOnChain()
  }, [loadOnChain])

  const merged = useMemo(() => {
    const map = new Map<string, TxHistoryItem>()
    // Prefer local (app) labels when same href exists
    for (const item of onChain) map.set(item.href, item)
    for (const item of localItems) map.set(item.href, { ...item, message: `App · ${item.message}` })
    return [...map.values()].sort((a, b) => b.at - a.at)
  }, [onChain, localItems])

  const title = chain === 'hedera' ? 'Hedera transaction history' : 'Ethereum transaction history'
  const subtitle =
    chain === 'ethereum'
      ? ethAddress
        ? `On-chain Sepolia txs for ${ethAddress.slice(0, 6)}…${ethAddress.slice(-4)} plus actions from this app.`
        : 'Connect MetaMask to load on-chain Sepolia history. App actions also appear here after they succeed.'
      : hederaAccountId
        ? `On-chain Testnet txs for ${hederaAccountId} plus actions from this app.`
        : 'Create/use a Hedera account (Use in forms) to load on-chain history. App actions also appear here after they succeed.'

  return (
    <Panel title={title} subtitle={subtitle} accent="amber">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {loading ? 'Loading on-chain history…' : `${merged.length} transaction${merged.length === 1 ? '' : 's'}`}
        </p>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} disabled={loading} onClick={() => void loadOnChain()}>
            Refresh
          </button>
          <button type="button" className={btnSecondary} disabled={localItems.length === 0} onClick={onClear}>
            Clear app history
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {merged.length === 0 && !loading ? (
        <p className="text-sm text-muted">
          {chain === 'ethereum' && !ethAddress
            ? 'No wallet connected — connect MetaMask above, then refresh.'
            : chain === 'hedera' && !hederaAccountId
              ? 'No Hedera account selected — create one and click “Use in forms below”.'
              : 'No transactions found for this account yet.'}
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-line overflow-y-auto overflow-x-hidden rounded-xl border border-line overscroll-contain sm:max-h-80">
          {merged.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 bg-panel-2/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{item.message}</p>
                <p className="mt-0.5 text-xs text-muted">{formatTime(item.at)}</p>
              </div>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm font-medium text-accent underline-offset-2 hover:underline"
                title={item.href}
              >
                {item.label ?? 'View'} · {shortHref(item.href)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
