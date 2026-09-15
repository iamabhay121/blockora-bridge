import { useEffect, useState } from 'react'
import { formatUnits, parseUnits } from 'ethers'
import { isOnSepolia, useWallet } from '../../context/WalletContext'
import {
  deployErc20,
  getErc20,
} from '../../services/eth/ethereumService'
import { ETHERSCAN_ADDRESS, ETHERSCAN_TX } from '../../lib/constants'
import { Panel, Field, inputClass, btnPrimary, btnSecondary } from '../ui/Panel'

type StatusFn = (msg: string, kind: 'info' | 'success' | 'error', link?: { href: string; label: string }) => void

const TOKEN_KEY = 'blockora_erc20_address'

export function Erc20Panel({ onStatus }: { onStatus: StatusFn }) {
  const wallet = useWallet()
  const [tokenAddress, setTokenAddress] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [name, setName] = useState('Blockora Bridge Token')
  const [symbol, setSymbol] = useState('BORA')
  const [initialSupply, setInitialSupply] = useState('1000')
  const [balance, setBalance] = useState('—')
  const [allowance, setAllowance] = useState('—')
  const [mintTo, setMintTo] = useState('')
  const [mintAmt, setMintAmt] = useState('10')
  const [burnAmt, setBurnAmt] = useState('1')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmt, setTransferAmt] = useState('1')
  const [spender, setSpender] = useState('')
  const [approveAmt, setApproveAmt] = useState('100')
  const [fromOwner, setFromOwner] = useState('')
  const [tfAmt, setTfAmt] = useState('1')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (tokenAddress) localStorage.setItem(TOKEN_KEY, tokenAddress)
  }, [tokenAddress])

  useEffect(() => {
    if (wallet.address && !mintTo) setMintTo(wallet.address)
  }, [wallet.address, mintTo])

  const refreshMeta = async () => {
    if (!wallet.signer || !tokenAddress || !wallet.address) return
    const token = getErc20(tokenAddress, wallet.signer)
    const [bal, dec] = await Promise.all([token.balanceOf(wallet.address), token.decimals()])
    setBalance(formatUnits(bal, dec))
    if (spender) {
      const a = await token.allowance(wallet.address, spender)
      setAllowance(formatUnits(a, dec))
    }
  }

  useEffect(() => {
    void refreshMeta().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress, wallet.address, wallet.signer, spender])

  const guard = async () => {
    if (!wallet.installed) throw new Error('Install MetaMask first')
    if (!wallet.signer || !wallet.address) {
      await wallet.connect()
    }
    if (!isOnSepolia(wallet.chainId)) {
      await wallet.ensureSepolia()
    }
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
      <Panel title="Deploy ERC20" subtitle="OpenZeppelin ERC20 + Ownable mint/burn on Sepolia.">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">Wallet:</span>
          <span className="font-mono text-accent">{wallet.address ?? 'Not connected'}</span>
          <span className="text-muted">ETH:</span>
          <span>{wallet.ethBalance}</span>
          {!wallet.address ? (
            <button type="button" className={btnPrimary} disabled={busy || wallet.connecting} onClick={() => void wallet.connect()}>
              {wallet.connecting ? 'Connecting…' : 'Connect MetaMask'}
            </button>
          ) : !isOnSepolia(wallet.chainId) ? (
            <button type="button" className={btnSecondary} onClick={() => void wallet.ensureSepolia()}>
              Switch to Sepolia
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Symbol">
            <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </Field>
          <Field label="Initial supply">
            <input className={inputClass} value={initialSupply} onChange={(e) => setInitialSupply(e.target.value)} />
          </Field>
        </div>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={busy}
          onClick={() =>
            void run('Deploying ERC20…', async () => {
              const res = await deployErc20(wallet.signer!, name, symbol, initialSupply)
              setTokenAddress(res.address)
              onStatus(`Deployed ERC20 at ${res.address}`, 'success', {
                href: ETHERSCAN_TX(res.hash),
                label: 'View deploy tx',
              })
              await wallet.refreshBalance()
              await refreshMeta()
            })
          }
        >
          Deploy ERC20
        </button>
      </Panel>

      <Panel title="Token operations" subtitle="Mint, burn, transfer, approve, and transferFrom." accent="sky">
        <Field label="Token contract">
          <input
            className={inputClass}
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x…"
          />
        </Field>
        {tokenAddress && (
          <a
            className="mt-2 inline-block text-sm text-accent hover:underline"
            href={ETHERSCAN_ADDRESS(tokenAddress)}
            target="_blank"
            rel="noreferrer"
          >
            View contract on Etherscan
          </a>
        )}
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="text-xs uppercase text-muted">Your balance</p>
            <p className="font-display text-lg font-bold text-accent">{balance}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted">Allowance → spender</p>
            <p className="font-display text-lg font-bold text-accent-2">{allowance}</p>
          </div>
          <button type="button" className={btnSecondary} onClick={() => void refreshMeta()}>
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">Mint</h3>
            <Field label="To">
              <input className={inputClass} value={mintTo} onChange={(e) => setMintTo(e.target.value)} />
            </Field>
            <Field label="Amount">
              <input className={inputClass} value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} />
            </Field>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !tokenAddress}
              onClick={() =>
                void run('Minting…', async () => {
                  const token = getErc20(tokenAddress, wallet.signer!)
                  const tx = await token.mint(mintTo, parseUnits(mintAmt, 18))
                  const receipt = await tx.wait()
                  onStatus('Minted', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                  await refreshMeta()
                })
              }
            >
              Mint
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">Burn</h3>
            <Field label="Amount">
              <input className={inputClass} value={burnAmt} onChange={(e) => setBurnAmt(e.target.value)} />
            </Field>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !tokenAddress}
              onClick={() =>
                void run('Burning…', async () => {
                  const token = getErc20(tokenAddress, wallet.signer!)
                  const tx = await token.burn(parseUnits(burnAmt, 18))
                  const receipt = await tx.wait()
                  onStatus('Burned', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                  await refreshMeta()
                })
              }
            >
              Burn
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">Transfer</h3>
            <Field label="To">
              <input className={inputClass} value={transferTo} onChange={(e) => setTransferTo(e.target.value)} />
            </Field>
            <Field label="Amount">
              <input className={inputClass} value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} />
            </Field>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !tokenAddress}
              onClick={() =>
                void run('Transferring…', async () => {
                  const token = getErc20(tokenAddress, wallet.signer!)
                  const tx = await token.transfer(transferTo, parseUnits(transferAmt, 18))
                  const receipt = await tx.wait()
                  onStatus('Transferred', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                  await refreshMeta()
                })
              }
            >
              Transfer
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">Approve (allowance)</h3>
            <Field label="Spender">
              <input className={inputClass} value={spender} onChange={(e) => setSpender(e.target.value)} />
            </Field>
            <Field label="Amount">
              <input className={inputClass} value={approveAmt} onChange={(e) => setApproveAmt(e.target.value)} />
            </Field>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !tokenAddress}
              onClick={() =>
                void run('Approving…', async () => {
                  const token = getErc20(tokenAddress, wallet.signer!)
                  const tx = await token.approve(spender, parseUnits(approveAmt, 18))
                  const receipt = await tx.wait()
                  onStatus('Approved', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                  await refreshMeta()
                })
              }
            >
              Approve
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-4">
            <h3 className="font-semibold">TransferFrom</h3>
            <Field label="From (owner)">
              <input className={inputClass} value={fromOwner} onChange={(e) => setFromOwner(e.target.value)} />
            </Field>
            <Field label="To">
              <input className={inputClass} value={transferTo} onChange={(e) => setTransferTo(e.target.value)} />
            </Field>
            <Field label="Amount">
              <input className={inputClass} value={tfAmt} onChange={(e) => setTfAmt(e.target.value)} />
            </Field>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !tokenAddress}
              onClick={() =>
                void run('transferFrom…', async () => {
                  const token = getErc20(tokenAddress, wallet.signer!)
                  const tx = await token.transferFrom(fromOwner, transferTo, parseUnits(tfAmt, 18))
                  const receipt = await tx.wait()
                  onStatus('transferFrom ok', 'success', { href: ETHERSCAN_TX(receipt.hash), label: 'View tx' })
                  await refreshMeta()
                })
              }
            >
              TransferFrom
            </button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
