import { useCallback, useEffect, useState } from 'react'
import type { ChainMode } from '../lib/constants'

export type TxHistoryItem = {
  id: string
  chain: ChainMode
  message: string
  href: string
  label?: string
  at: number
}

const STORAGE_KEY = 'blockora_tx_history'
const MAX_ITEMS = 50

function load(): TxHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TxHistoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(items: TxHistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function useTxHistory() {
  const [items, setItems] = useState<TxHistoryItem[]>(() => load())

  useEffect(() => {
    save(items)
  }, [items])

  const add = useCallback((entry: Omit<TxHistoryItem, 'id' | 'at'> & { at?: number }) => {
    const item: TxHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: entry.at ?? Date.now(),
      chain: entry.chain,
      message: entry.message,
      href: entry.href,
      label: entry.label,
    }
    setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS))
  }, [])

  const clear = useCallback((chain?: ChainMode) => {
    setItems((prev) => (chain ? prev.filter((i) => i.chain !== chain) : []))
  }, [])

  const forChain = useCallback(
    (chain: ChainMode) => items.filter((i) => i.chain === chain),
    [items],
  )

  return { items, add, clear, forChain }
}
