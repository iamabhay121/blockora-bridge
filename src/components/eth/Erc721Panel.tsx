import { useEffect, useState } from 'react'
import { isOnSepolia, useWallet } from '../../context/WalletContext'
import { deployErc721, getErc721 } from '../../services/eth/ethereumService'
import { ETHERSCAN_ADDRESS, ETHERSCAN_TX } from '../../lib/constants'
import { Panel, Field, inputClass, btnPrimary, btnSecondary } from '../ui/Panel'
import { NftMetadataInput } from '../ui/NftMetadataInput'

type StatusFn = (msg: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => void

const NFT_KEY = 'blockora_erc721_address'

export function Erc721Panel({ onStatus }: { onStatus: StatusFn }) {
  const wallet = useWallet()
  const [nftAddress, setNftAddress] = useState(() => localStorage.getItem(NFT_KEY) || '')
  const [name, setName] = useState('Blockora Bridge NFT')
  const [symbol, setSymbol] = useState('BNFT')
  const [mintTo, setMintTo] = useState('')
  const [tokenUri, setTokenUri] = useState('ipfs://example/1.json')
  const [tokenId, setTokenId] = useState('0')
  const [transferTo, setTransferTo] = useState('')
  const [approveTo, setApproveTo] = useState('')
  const [operator, setOperator] = useState('')
  const [approvedForAll, setApprovedForAll] = useState(false)
  const [ownerOf, setOwnerOf] = useState('—')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (nftAddress) localStorage.setItem(NFT_KEY, nftAddress)
  }, [nftAddress])

  useEffect(() => {
    if (wallet.address && !mintTo) setMintTo(wallet.address)
  }, [wallet.address, mintTo])

  const refresh = async () => {
    if (!wallet.signer || !nftAddress) return
    const nft = getErc721(nftAddress, wallet.signer)
    try {
      const owner = await nft.ownerOf(BigInt(tokenId || '0'))
      setOwnerOf(owner)
    } catch {
      setOwnerOf('—')
    }
    if (wallet.address && operator) {
      const ok = await nft.isApprovedForAll(wallet.address, operator)
      setApprovedForAll(Boolean(ok))
    }
  }

  useEffect(() => {
    void refresh().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nftAddress, tokenId, operator, wallet.address, wallet.signer])

  const guard = async () => {
    if (!wallet.installed) throw new Error('Install MetaMask first')
    if (!wallet.signer) await wallet.connect()
    if (!isOnSepolia(wallet.chainId)) await wallet.ensureSepolia()
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true)
    onStatus(label, 'info')
    try {
      await guard()
      await fn()
    } catch (e) {
      onStatus(e instanceof Error ? e.message : 'Operation failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Deploy ERC721 NFT" subtitle="Mintable / burnable NFT with per-token URI on Sepolia." accent="amber">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Symbol">
            <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </Field>
        </div>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={busy}
          onClick={() =>
            void run('Deploying NFT…', async () => {
              const res = await deployErc721(wallet.signer!, name, symbol)
              setNftAddress(res.address)
              onStatus(`Deployed NFT at ${res.address}`, 'success', {
                href: ETHERSCAN_TX(res.hash),
                label: 'View deploy tx',
              })
            })
          }
        >
          Deploy ERC721
        </button>
      </Panel>

      <Panel title="NFT operations" subtitle="Mint, burn, transfer, approve, and setApprovalForAll.">
        <Field label="NFT contract">
          <input
            className={inputClass}
            value={nftAddress}
            onChange={(e) => setNftAddress(e.target.value)}
            placeholder="0x…"
          />
        </Field>
        {nftAddress && (
          <a
            className="mt-2 inline-block text-sm text-accent hover:underline"
            href={ETHERSCAN_ADDRESS(nftAddress)}
            target="_blank"
            rel="noreferrer"
          >
            View contract on Etherscan
          </a>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-muted">Owner of tokenId</p>
            <p className="font-mono text-accent-2">{ownerOf}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted">Operator approved for all</p>
            <p className="font-semibold text-accent">{approvedForAll ? 'Yes' : 'No'}</p>
          </div>
          <button type="button" className={btnSecondary} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">Mint</h3>
            <Field label="To">
              <input className={inputClass} value={mintTo} onChange={(e) => setMintTo(e.target.value)} />
            </Field>
            <NftMetadataInput
              value={tokenUri}
              onChange={setTokenUri}
              label="Token URI"
              onStatus={(msg, kind) => onStatus(msg, kind)}
            />
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !nftAddress || !tokenUri.trim()}
              onClick={() =>
                void run('Minting NFT…', async () => {
                  const nft = getErc721(nftAddress, wallet.signer!)
                  const tx = await nft.mint(mintTo, tokenUri)
                  const receipt = await tx.wait()
                  onStatus('NFT minted', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                  await refresh()
                })
              }
            >
              Mint NFT
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">Burn / Transfer</h3>
            <Field label="Token ID">
              <input className={inputClass} value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
            </Field>
            <Field label="Transfer to">
              <input className={inputClass} value={transferTo} onChange={(e) => setTransferTo(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={busy || !nftAddress}
                onClick={() =>
                  void run('Transferring NFT…', async () => {
                    const nft = getErc721(nftAddress, wallet.signer!)
                    const tx = await nft['safeTransferFrom(address,address,uint256)'](
                      wallet.address,
                      transferTo,
                      BigInt(tokenId),
                    )
                    const receipt = await tx.wait()
                    onStatus('NFT transferred', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                    await refresh()
                  })
                }
              >
                Transfer
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={busy || !nftAddress}
                onClick={() =>
                  void run('Burning NFT…', async () => {
                    const nft = getErc721(nftAddress, wallet.signer!)
                    const tx = await nft.burn(BigInt(tokenId))
                    const receipt = await tx.wait()
                    onStatus('NFT burned', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                    await refresh()
                  })
                }
              >
                Burn
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">Approve token</h3>
            <Field label="Operator / spender">
              <input className={inputClass} value={approveTo} onChange={(e) => setApproveTo(e.target.value)} />
            </Field>
            <Field label="Token ID">
              <input className={inputClass} value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
            </Field>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !nftAddress}
              onClick={() =>
                void run('Approving NFT…', async () => {
                  const nft = getErc721(nftAddress, wallet.signer!)
                  const tx = await nft.approve(approveTo, BigInt(tokenId))
                  const receipt = await tx.wait()
                  onStatus('Approved', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                })
              }
            >
              Approve
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <h3 className="font-semibold text-accent">setApprovalForAll</h3>
            <Field label="Operator">
              <input className={inputClass} value={operator} onChange={(e) => setOperator(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={busy || !nftAddress}
                onClick={() =>
                  void run('setApprovalForAll(true)…', async () => {
                    const nft = getErc721(nftAddress, wallet.signer!)
                    const tx = await nft.setApprovalForAll(operator, true)
                    const receipt = await tx.wait()
                    onStatus('Operator approved for all', 'success', {
                      href: ETHERSCAN_TX(receipt.hash),
                      label: 'View tx',
                    })
                    await refresh()
                  })
                }
              >
                Approve all
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={busy || !nftAddress}
                onClick={() =>
                  void run('setApprovalForAll(false)…', async () => {
                    const nft = getErc721(nftAddress, wallet.signer!)
                    const tx = await nft.setApprovalForAll(operator, false)
                    const receipt = await tx.wait()
                    onStatus('Operator revoked', 'success', {
                      href: ETHERSCAN_TX(receipt.hash),
                      label: 'View tx',
                    })
                    await refresh()
                  })
                }
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}
