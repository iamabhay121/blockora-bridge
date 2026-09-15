import { useCallback, useEffect, useState } from 'react'
import { ChainSwitcher } from './components/layout/ChainSwitcher'
import { HelpFab } from './components/layout/HelpFab'
import { StatusToast } from './components/layout/StatusToast'
import { TransactionHistory } from './components/layout/TransactionHistory'
import { HederaDashboard } from './components/hedera/HederaDashboard'
import { EthDashboard } from './components/eth/EthDashboard'
import { WalletProvider, useWallet } from './context/WalletContext'
import { useToast } from './hooks/useToast'
import { useTxHistory } from './hooks/useTxHistory'
import { useHederaSession } from './hooks/useHederaSession'
import { CHAIN_MODE_KEY, type ChainMode } from './lib/constants'

function AppInner() {
  const [mode, setMode] = useState<ChainMode>(() => {
    const saved = localStorage.getItem(CHAIN_MODE_KEY)
    return saved === 'ethereum' ? 'ethereum' : 'hedera'
  })
  const { toast, show, clear } = useToast()
  const history = useTxHistory()
  const wallet = useWallet()
  const hedera = useHederaSession()

  useEffect(() => {
    localStorage.setItem(CHAIN_MODE_KEY, mode)
  }, [mode])

  const onStatus = useCallback(
    (message: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => {
      show(message, kind, link)
      if (kind === 'success' && link?.href) {
        history.add({
          chain: mode,
          message,
          href: link.href,
          label: link.label,
        })
      }
    },
    [show, history.add, mode],
  )

  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-ink/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Testnet workspace</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
              Blockora Bridge
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              One place to practice real blockchain workflows on <span className="text-text">Hedera Testnet</span> and{' '}
              <span className="text-text">Ethereum Sepolia</span> — create accounts, issue tokens and NFTs, send assets,
              manage approvals, and review transaction history with explorer links.
            </p>
          </div>
          <ChainSwitcher mode={mode} onChange={setMode} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {mode === 'hedera' ? (
          <HederaDashboard onStatus={onStatus} />
        ) : (
          <EthDashboard onStatus={onStatus} />
        )}

        <TransactionHistory
          chain={mode}
          items={history.items}
          onClear={() => history.clear(mode)}
          ethAddress={mode === 'ethereum' ? wallet.address : null}
          hederaAccountId={mode === 'hedera' ? hedera.accountId : null}
        />
      </main>

      <footer className="border-t border-line/60 py-8 text-center text-xs text-muted">
        Hedera Testnet · Ethereum Sepolia · Keys stored locally in your browser
      </footer>

      <StatusToast toast={toast} onClose={clear} />
      <HelpFab />
    </div>
  )
}

function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  )
}

export default App
