import type { ChainMode } from '../../lib/constants'

type Props = {
  mode: ChainMode
  onChange: (mode: ChainMode) => void
}

export function ChainSwitcher({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-full border border-line bg-panel p-1">
      {([
        { id: 'hedera' as const, label: 'Hedera' },
        { id: 'ethereum' as const, label: 'Ethereum NFT' },
      ]).map((opt) => {
        const active = mode === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-accent text-ink shadow-[0_0_24px_rgba(45,212,191,0.35)]'
                : 'text-muted hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
