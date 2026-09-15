# Blockora Bridge

**Blockora Bridge** is a hands-on testnet dashboard for learning and demoing blockchain operations across two networks in one UI.

Use the top switcher to move between:

- **Hedera Testnet** — create funded accounts, issue fungible tokens and NFTs, send HBAR or tokens, associate when needed, and follow activity on HashScan
- **Ethereum Sepolia** — connect MetaMask, deploy ERC-20 / ERC-721 contracts, mint, burn, transfer, set allowances, and follow activity on Etherscan

Built for builders and learners who want real on-chain flows without mainnet risk.

## Features

### Hedera
- Create funded accounts via **backend API** (operator key stays on the server)
- Unified **Send** panel: HBAR or token dropdown; associate option appears only when needed
- Fungible token create + transfer
- NFT collection create, mint, transfer (+ associate on demand)
- On-chain + in-app transaction history
- HashScan deep links

### Ethereum (Sepolia + MetaMask)
- Deploy `BlockoraToken` (ERC20 + mint/burn)
- Deploy `BlockoraNFT` (ERC721 + URI + mint/burn)
- Transfer, approve / allowance / transferFrom
- ERC721 approve + setApprovalForAll
- On-chain + in-app transaction history
- Sepolia Etherscan links

## Setup

```bash
cd blockora
npm install
cp .env.example .env   # set HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY
npm run dev            # starts API (:8787) + Vite UI
```

Open the URL Vite prints (usually http://localhost:5173).

### Compile contracts (optional, for ETH deploy from UI)

```bash
npm run compile-contracts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite together |
| `npm run server` | API only (port 8787) |
| `npm run build` | Production UI build |
| `npm run compile-contracts` | Compile Solidity + export ABI |

## Security

- Operator private key lives in **server `.env` only** — never ship it to the browser.
- User Hedera keys for signing (token/NFT/send) may be kept in browser session storage for form convenience — **Testnet only**.
- Never use mainnet keys in this app.

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) and [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md).
