import { BrowserProvider, Contract, ContractFactory, parseUnits, type Signer } from 'ethers'
import BlockoraToken from '../../abi/BlockoraToken.json'
import BlockoraNFT from '../../abi/BlockoraNFT.json'
import { SEPOLIA_CHAIN_ID, SEPOLIA_HEX } from '../../lib/constants'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && Boolean(window.ethereum)
}

export async function getProvider() {
  if (!window.ethereum) throw new Error('MetaMask is not installed')
  return new BrowserProvider(window.ethereum)
}

export async function connectWallet() {
  const provider = await getProvider()
  await provider.send('eth_requestAccounts', [])
  const network = await provider.getNetwork()
  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    await switchToSepolia()
  }
  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  const refreshed = await getProvider()
  const net = await refreshed.getNetwork()
  return { address, chainId: Number(net.chainId), signer: await refreshed.getSigner() }
}

export async function switchToSepolia() {
  if (!window.ethereum) throw new Error('MetaMask is not installed')
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_HEX }],
    })
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code
    if (code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SEPOLIA_HEX,
            chainName: 'Sepolia',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      })
    } else {
      throw err
    }
  }
}

export async function getEthBalance(address: string) {
  const provider = await getProvider()
  const bal = await provider.getBalance(address)
  return bal
}

export async function deployErc20(
  signer: Signer,
  name: string,
  symbol: string,
  initialSupply: string,
  decimals = 18,
) {
  const supply = parseUnits(initialSupply || '0', decimals)
  const factory = new ContractFactory(BlockoraToken.abi, BlockoraToken.bytecode, signer)
  const contract = await factory.deploy(name, symbol, supply)
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  const tx = contract.deploymentTransaction()
  return { address, hash: tx?.hash ?? '', contract }
}

export async function deployErc721(signer: Signer, name: string, symbol: string) {
  const factory = new ContractFactory(BlockoraNFT.abi, BlockoraNFT.bytecode, signer)
  const contract = await factory.deploy(name, symbol)
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  const tx = contract.deploymentTransaction()
  return { address, hash: tx?.hash ?? '', contract }
}

export function getErc20(address: string, signerOrProvider: Signer | BrowserProvider) {
  return new Contract(address, BlockoraToken.abi, signerOrProvider)
}

export function getErc721(address: string, signerOrProvider: Signer | BrowserProvider) {
  return new Contract(address, BlockoraNFT.abi, signerOrProvider)
}
