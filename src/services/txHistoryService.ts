import { ETHERSCAN_TX, HASHSCAN_TX } from '../lib/constants'
import type { TxHistoryItem } from '../hooks/useTxHistory'

type ChainMode = 'hedera' | 'ethereum'

function mapEthTx(tx: {
  hash: string
  timeStamp?: string
  timestamp?: string
  from?: string
  to?: string
  value?: string
  functionName?: string
  methodId?: string
  isError?: string
}): TxHistoryItem {
  const ts = Number(tx.timeStamp || tx.timestamp || 0) * 1000
  const valueEth = tx.value ? Number(tx.value) / 1e18 : 0
  const method = (tx.functionName || '').split('(')[0] || (tx.methodId && tx.methodId !== '0x' ? 'Contract call' : 'Transfer')
  const failed = tx.isError === '1'
  const msg =
    valueEth > 0
      ? `${failed ? 'Failed · ' : ''}${method} · ${valueEth.toFixed(6)} ETH`
      : `${failed ? 'Failed · ' : ''}${method}`

  return {
    id: `onchain-eth-${tx.hash}`,
    chain: 'ethereum',
    message: msg,
    href: ETHERSCAN_TX(tx.hash),
    label: 'Etherscan',
    at: ts || Date.now(),
  }
}

/** Recent normal txs for an address on Sepolia (Blockscout explorer API). */
export async function fetchSepoliaTxHistory(address: string, limit = 25): Promise<TxHistoryItem[]> {
  const url =
    `https://eth-sepolia.blockscout.com/api?module=account&action=txlist` +
    `&address=${encodeURIComponent(address)}&page=1&offset=${limit}&sort=desc`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load Sepolia transactions')
  const data = (await res.json()) as { status?: string; result?: unknown; message?: string }

  if (!Array.isArray(data.result)) {
    // status "0" with "No transactions found" is normal
    if (typeof data.result === 'string' && /no transaction/i.test(data.result)) return []
    throw new Error(data.message || 'Could not load wallet transactions')
  }

  return (data.result as Parameters<typeof mapEthTx>[0][]).map(mapEthTx)
}

/** Recent txs involving a Hedera account (Testnet mirror node). */
export async function fetchHederaTxHistory(accountId: string, limit = 25): Promise<TxHistoryItem[]> {
  const url =
    `https://testnet.mirrornode.hedera.com/api/v1/transactions` +
    `?account.id=${encodeURIComponent(accountId)}&limit=${limit}&order=desc`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load Hedera transactions')
  const data = (await res.json()) as {
    transactions?: Array<{
      transaction_id: string
      name?: string
      result?: string
      consensus_timestamp?: string
    }>
  }

  const txs = data.transactions || []
  return txs.map((tx) => {
    const [sec, nanos] = (tx.consensus_timestamp || '0').split('.')
    const at = Number(sec) * 1000 + Math.floor(Number(nanos || 0) / 1e6)
    // Mirror tx id is 0.0.x-sssssssss-nnnnnnnnn; HashScan prefers 0.0.x@sssssssss.nnnnnnnnn
    const hashscanId = tx.transaction_id.includes('-')
      ? tx.transaction_id.replace(/^(\d+\.\d+\.\d+)-(\d+)-(\d+)$/, '$1@$2.$3')
      : tx.transaction_id

    return {
      id: `onchain-hedera-${tx.transaction_id}`,
      chain: 'hedera' as ChainMode,
      message: `${tx.name || 'Transaction'}${tx.result && tx.result !== 'SUCCESS' ? ` · ${tx.result}` : ''}`,
      href: HASHSCAN_TX(hashscanId),
      label: 'HashScan',
      at: at || Date.now(),
    }
  })
}
