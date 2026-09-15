import { useState } from 'react'
import { Erc20Panel } from './Erc20Panel'
import { Erc721Panel } from './Erc721Panel'

type StatusFn = (msg: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => void

export function EthDashboard({ onStatus }: { onStatus: StatusFn }) {
  const [tab, setTab] = useState<'erc20' | 'erc721'>('erc20')

  return (
    <>
      <div className="mb-6 inline-flex rounded-full border border-line bg-panel p-1">
        {(
          [
            { id: 'erc20' as const, label: 'ERC20' },
            { id: 'erc721' as const, label: 'ERC721 NFT' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-accent-2 text-ink' : 'text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'erc20' ? <Erc20Panel onStatus={onStatus} /> : <Erc721Panel onStatus={onStatus} />}
    </>
  )
}
