# Developer guide

Technical reference for **Blockora Bridge** — a dual-network testnet app (Hedera Testnet + Ethereum Sepolia) for account creation, token/NFT issuance, transfers, approvals, and transaction history.

---

## Stack

- **App:** Vite + React + TypeScript + Tailwind CSS v4
- **API:** Express (`server/index.mjs`) — Hedera account create with operator credentials
- **Hedera:** `@hashgraph/sdk` (Testnet)
- **Ethereum:** `ethers` v6 + MetaMask (Sepolia)
- **Contracts:** Hardhat + OpenZeppelin (`BlockoraToken`, `BlockoraNFT`)

---

## Project layout

```
blockora/
├── server/                 # Express API (operator-funded account create)
├── src/                    # Vite React app
│   ├── components/hedera/  # Account create, unified send, fungible + NFT
│   ├── components/eth/     # ERC20 / ERC721 UI
│   ├── services/hedera/    # SDK wrappers + /api client
│   ├── services/eth/       # Deploy, wallet helpers
│   └── abi/                # Compiled ABI + bytecode for browser deploy
├── contracts/              # Hardhat workspace
└── docs/                   # User + developer guides
```

---

## Local setup

```bash
cd blockora
npm install
cp .env.example .env
npm run dev
```

- UI: `http://localhost:5173` (proxies `/api` → `:8787`)
- API: `http://localhost:8787`

Env vars:

| Variable | Purpose |
|----------|---------|
| `HEDERA_OPERATOR_ID` | Pays for `POST /api/hedera/create-account` |
| `HEDERA_OPERATOR_KEY` | Operator private key (server only) |
| `HEDERA_API_PORT` | Default `8787` |

`buffer` is required for `@hashgraph/sdk` in the browser (already in `package.json`).

---

## Compile & export contracts

```bash
npm run compile-contracts
```

This runs Hardhat compile and writes:

- `src/abi/BlockoraToken.json`
- `src/abi/BlockoraNFT.json`

Manual equivalent:

```bash
cd contracts
npm install
npm run compile
npm run export-abi
```

Solidity is configured for `0.8.28` with `evmVersion: cancun` (OpenZeppelin 5.x).

---

## Contracts

### BlockoraToken
- `ERC20` + `ERC20Burnable` + `Ownable` (contract may still include Permit extension; UI does not expose it)
- Constructor: `name`, `symbol`, `initialSupply` (minted to deployer)
- `mint(to, amount)` — owner only

### BlockoraNFT
- `ERC721` + `ERC721URIStorage` + `ERC721Burnable` + `Ownable`
- `mint(to, uri)` — owner only, returns `tokenId`

Frontend deploys via `ContractFactory(abi, bytecode, signer)`.

---

## Hedera integration notes

- Account create: `POST /api/hedera/create-account` (operator in server env)
- Client UI uses `Client.forTestnet()` for token/NFT/transfer signing with **user** keys
- Fungible amounts: human-readable → base units via `tokenAmount.ts`
- NFT: `TokenType.NonFungibleUnique`, mint with `setMetadata`, transfer via `NftId` + `addNftTransfer`
- Associate UI is shown only after `TOKEN_NOT_ASSOCIATED` on send/transfer
- Session prefs: `blockora_hedera_*` in `localStorage` (optional form prefill)

---

## Ethereum integration notes

- Sepolia chain id `11155111` (`0xaa36a7`)
- Wallet context: `src/context/WalletContext.tsx`
- Deployed contract addresses cached in `localStorage` (`blockora_erc20_address`, `blockora_erc721_address`)
- Tx history: `blockora_tx_history` in `localStorage` (success + explorer link)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Express API + Vite |
| `npm run server` | API only |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run compile-contracts` | Compile Solidity + export ABI/bytecode |

---

## Networks & explorers

| Network | Explorer |
|---------|----------|
| Hedera Testnet | `https://hashscan.io/testnet/transaction/{id}` |
| Ethereum Sepolia | `https://sepolia.etherscan.io/tx/{hash}` |

---

## Security

- Do not use mainnet keys in this UI.
- Operator key: **server `.env` only**.
- Ethereum actions go through MetaMask; never ask users to paste ETH private keys.
- Treat this as a Testnet / demo tool, not a production wallet.
