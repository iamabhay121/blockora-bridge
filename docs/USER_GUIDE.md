# User guide

**Blockora Bridge** is a testnet workspace for real blockchain actions on **Hedera** and **Ethereum** from one screen.

Use the switcher at the top to choose a network:

- **Hedera** — create accounts, create/send fungible tokens and NFTs, and send HBAR
- **Ethereum** — connect MetaMask on Sepolia to deploy and operate ERC-20 tokens and ERC-721 NFTs

Every successful action can be verified in explorers (HashScan / Etherscan), and the **Transaction history** panel lists recent activity for the account you’re using.

---

## Before you start

### For Hedera
- The app creates Testnet accounts for you (funded by the Blockora Bridge operator).
- Keep the new Account ID and private key somewhere safe — you need them to create tokens, send assets, and mint NFTs.
- Run the app with `npm run dev` so both the UI and the account API are running.

### For Ethereum
- Install **MetaMask** in your browser.
- Switch MetaMask to the **Sepolia** test network.
- Get a little **Sepolia ETH** from a faucet so you can confirm transactions.

---

## Hedera

### Create a new account
1. Choose **Hedera** at the top.
2. Optionally set initial HBAR (default **50**).
3. Click **Create account**.
4. Copy the new ID and key when they appear.
5. Click **Use in forms below** to fill later panels, or paste the credentials yourself.

### Fungible tokens
1. Open the **Fungible tokens** tab.
2. Under **Create fungible token**, enter your account ID/key (or use the ones from create), name, symbol, supply, decimals → **Create token**.
3. Under **Send**, pick **HBAR** or **Fungible token** from the Asset dropdown.
4. Fill from account, recipient, amount (and Token ID if sending a token) → send.
5. If you see an associate error for tokens, enter the **recipient’s private key** in the yellow box and click **Associate token**, then send again.

### NFTs
1. Open the **NFTs** tab.
2. **Create NFT collection** with your treasury account and a name/symbol.
3. **Mint NFT** — paste a metadata URL, or switch to **Upload JSON** and choose a `.json` file. Tiny JSON (≤100 bytes) is stored on-chain; larger files are hosted by the API and the short URL is used as metadata.
4. **Transfer NFT** with the serial number and recipient.
5. If association is required, use the associate option that appears (same pattern as fungible tokens).

---

## Ethereum

### Connect your wallet
1. Choose **Ethereum NFT** at the top.
2. Pick **ERC20** (fungible tokens) or **ERC721 NFT** (collectibles).
3. Click **Connect MetaMask** and approve in the wallet popup.
4. If asked, switch to **Sepolia**.

### Create a token (ERC20)
1. Stay on **ERC20**.
2. Enter name, symbol, and how many tokens to create at the start.
3. Click **Deploy ERC20** and confirm in MetaMask.
4. Your token address appears — you can open it on Etherscan from the link.

### Use your ERC20 token
After you have a token address:

- **Mint** — create more tokens (only the creator can do this). Enter who receives them and how many → **Mint**.
- **Burn** — destroy tokens from your wallet → **Burn**.
- **Transfer** — send tokens to another address → **Transfer**.
- **Approve** — allow another address to spend some of your tokens → **Approve**.
- **TransferFrom** — if you were approved to spend someone’s tokens, move them from their address to another → **TransferFrom**.

Use **Refresh** anytime to update your balance and allowance.

### Transaction history
Successful Hedera and Ethereum actions with an explorer link appear in **Transaction history** at the bottom of the page (saved in this browser). Switch chains to see each network’s list.

### Create an NFT collection (ERC721)
1. Switch to **ERC721 NFT**.
2. Enter a name and symbol.
3. Click **Deploy ERC721** and confirm in MetaMask.

### Use your NFTs
- **Mint NFT** — enter who gets it and a Token URI (link to the artwork/metadata) → **Mint NFT**.
- **Transfer** — enter the Token ID and the new owner → **Transfer**.
- **Burn** — enter the Token ID → **Burn**.
- **Approve** — let one address move a specific NFT.
- **Approve all** — let one address manage all your NFTs in this collection.
- **Revoke** — remove that full access.

---

## Tips

- Green/red messages appear in the corner after each action. Click the explorer link to verify on HashScan (Hedera) or Etherscan (Ethereum).
- On Ethereum, MetaMask will ask you to confirm every important step — read the popup before approving.
- Stick to **test networks** only. Do not use real mainnet keys or money in this app.

---

## If something goes wrong

| What you see | What to try |
|--------------|-------------|
| Account creation fails | Make sure `npm run dev` started the API; check operator has HBAR |
| Token send fails with associate | Use the **Associate token** box that appears under Send |
| Connect doesn’t work | Install MetaMask, unlock it, refresh the page |
| Wrong network | Click **Switch to Sepolia** |
| Deploy or mint fails | You need Sepolia ETH for fees; minting is only for the creator |
| NFT metadata error | Keep the URI under 100 bytes on Hedera |
