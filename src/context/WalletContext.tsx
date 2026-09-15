import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Signer } from 'ethers'
import {
  connectWallet,
  getEthBalance,
  isMetaMaskInstalled,
  switchToSepolia,
} from '../services/eth/ethereumService'
import { SEPOLIA_CHAIN_ID } from '../lib/constants'
import { formatEther } from 'ethers'

type WalletState = {
  address: string | null
  chainId: number | null
  ethBalance: string
  signer: Signer | null
  connecting: boolean
  connect: () => Promise<void>
  ensureSepolia: () => Promise<void>
  refreshBalance: () => Promise<void>
  installed: boolean
}

const WalletContext = createContext<WalletState | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [ethBalance, setEthBalance] = useState('—')
  const [signer, setSigner] = useState<Signer | null>(null)
  const [connecting, setConnecting] = useState(false)
  const installed = isMetaMaskInstalled()

  const refreshBalance = useCallback(async () => {
    if (!address) return
    try {
      const bal = await getEthBalance(address)
      setEthBalance(formatEther(bal))
    } catch {
      setEthBalance('—')
    }
  }, [address])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const res = await connectWallet()
      setAddress(res.address)
      setChainId(res.chainId)
      setSigner(res.signer)
    } finally {
      setConnecting(false)
    }
  }, [])

  const ensureSepolia = useCallback(async () => {
    await switchToSepolia()
    const res = await connectWallet()
    setAddress(res.address)
    setChainId(res.chainId)
    setSigner(res.signer)
  }, [])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance, chainId])

  useEffect(() => {
    if (!window.ethereum) return
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (!accounts?.length) {
        setAddress(null)
        setSigner(null)
      } else {
        void connect()
      }
    }
    const onChain = () => {
      void connect()
    }
    window.ethereum.on('accountsChanged', onAccounts)
    window.ethereum.on('chainChanged', onChain)
    return () => {
      window.ethereum?.removeListener('accountsChanged', onAccounts)
      window.ethereum?.removeListener('chainChanged', onChain)
    }
  }, [connect])

  const value = useMemo(
    () => ({
      address,
      chainId,
      ethBalance,
      signer,
      connecting,
      connect,
      ensureSepolia,
      refreshBalance,
      installed,
    }),
    [address, chainId, ethBalance, signer, connecting, connect, ensureSepolia, refreshBalance, installed],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

export function isOnSepolia(chainId: number | null) {
  return chainId === SEPOLIA_CHAIN_ID
}
