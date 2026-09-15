export type ChainMode = 'hedera' | 'ethereum'

export const CHAIN_MODE_KEY = 'blockora_chain_mode'
export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_HEX = '0xaa36a7'

export const HASHSCAN_TX = (txId: string) =>
  `https://hashscan.io/testnet/transaction/${encodeURIComponent(txId)}`

export const ETHERSCAN_TX = (hash: string) =>
  `https://sepolia.etherscan.io/tx/${hash}`

export const ETHERSCAN_ADDRESS = (address: string) =>
  `https://sepolia.etherscan.io/address/${address}`
