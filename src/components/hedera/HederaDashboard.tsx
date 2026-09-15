import { useState } from 'react'
import { Client } from '@hashgraph/sdk'
import { useHederaSession } from '../../hooks/useHederaSession'
import { AccountCreation } from './AccountCreation'
import { TokenCreation, UnifiedSend } from './UnifiedSend'
import { NftPanels } from './NftPanels'

const client = Client.forTestnet()

type Props = {
  onStatus: (msg: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => void
}

type HederaTab = 'fungible' | 'nft'

export function HederaDashboard({ onStatus }: Props) {
  const session = useHederaSession()
  const [tab, setTab] = useState<HederaTab>('fungible')
  const [formKey, setFormKey] = useState(0)

  const useAccount = (accountId: string, privateKey: string) => {
    session.setAccountId(accountId)
    session.setPrivateKey(privateKey)
    setFormKey((k) => k + 1)
    onStatus(`Using ${accountId} in the forms below`, 'info')
  }

  return (
    <div className="space-y-6">
      <AccountCreation onStatus={onStatus} onUseAccount={useAccount} />

      <div className="inline-flex rounded-full border border-line bg-panel p-1">
        {(
          [
            { id: 'fungible' as const, label: 'Fungible tokens' },
            { id: 'nft' as const, label: 'NFTs' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-accent text-ink' : 'text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fungible' ? (
        <div key={`ft-${formKey}`} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <TokenCreation
              client={client}
              defaultAccountId={session.accountId}
              defaultPrivateKey={session.privateKey}
              onCreated={session.setTokenId}
              onStatus={onStatus}
            />
            <UnifiedSend
              client={client}
              defaultAccountId={session.accountId}
              defaultPrivateKey={session.privateKey}
              defaultTokenId={session.tokenId}
              onSuccess={() => undefined}
              onStatus={onStatus}
            />
          </div>
        </div>
      ) : (
        <div key={`nft-${formKey}`}>
          <NftPanels
            client={client}
            defaultAccountId={session.accountId}
            defaultPrivateKey={session.privateKey}
            defaultNftTokenId={session.nftTokenId}
            onNftCreated={session.setNftTokenId}
            onStatus={onStatus}
          />
        </div>
      )}
    </div>
  )
}
