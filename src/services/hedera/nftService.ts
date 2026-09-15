import {
  AccountId,
  Hbar,
  NftId,
  PrivateKey,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenSupplyType,
  TokenType,
  TransferTransaction,
  type Client,
} from '@hashgraph/sdk'

const NFT_CREATE_MAX_FEE = new Hbar(30)
const NFT_MINT_MAX_FEE = new Hbar(10)

function parsePrivateKey(raw: string): PrivateKey {
  const key = raw.trim()
  if (!key) throw new Error('Private key is required')
  const attempts = [
    () => PrivateKey.fromString(key),
    () => PrivateKey.fromStringDer(key),
    () => PrivateKey.fromStringED25519(key),
    () => PrivateKey.fromStringECDSA(key),
  ]
  for (const attempt of attempts) {
    try {
      return attempt()
    } catch {
      // continue
    }
  }
  throw new Error('Invalid private key format')
}

function formatError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error('NFT operation failed')
  const status =
    'status' in error && error.status != null
      ? String((error as { status: { toString(): string } | string }).status)
      : error.message
  if (/TOKEN_NOT_ASSOCIATED/i.test(status)) {
    return Object.assign(new Error('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT'), {
      code: 'TOKEN_NOT_ASSOCIATED',
    })
  }
  if (/INVALID_SIGNATURE/i.test(status)) {
    return new Error('Invalid signature — private key does not match the account ID.')
  }
  if (/INSUFFICIENT_PAYER_BALANCE|INSUFFICIENT_ACCOUNT_BALANCE/i.test(status)) {
    return new Error('Not enough HBAR on this account to pay fees.')
  }
  return error
}

/** Create an NFT collection (HTS NonFungibleUnique). Initial supply is always 0. */
export async function createNftCollection(
  client: Client,
  treasuryAccountId: string,
  treasuryPrivateKey: string,
  tokenName: string,
  tokenSymbol: string,
) {
  const name = tokenName.trim()
  const symbol = tokenSymbol.trim()
  if (!treasuryAccountId.trim() || !treasuryPrivateKey.trim() || !name || !symbol) {
    throw new Error('Treasury account, private key, name, and symbol are required')
  }

  try {
    const treasury = AccountId.fromString(treasuryAccountId.trim())
    const treasuryKey = parsePrivateKey(treasuryPrivateKey)
    client.setOperator(treasury, treasuryKey)

    const tx = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(treasury)
      .setSupplyType(TokenSupplyType.Infinite)
      .setSupplyKey(treasuryKey.publicKey)
      .setAdminKey(treasuryKey.publicKey)
      .setAutoRenewAccountId(treasury)
      .setMaxTransactionFee(NFT_CREATE_MAX_FEE)

    const frozen = await tx.freezeWith(client)
    const signed = await frozen.sign(treasuryKey)
    const response = await signed.execute(client)
    const receipt = await response.getReceipt(client)

    if (!receipt.tokenId) throw new Error('NFT collection created but no token ID returned')

    return {
      tokenId: receipt.tokenId.toString(),
      transactionId: response.transactionId.toString(),
    }
  } catch (error) {
    throw formatError(error)
  }
}

/** Mint one NFT with metadata (UTF-8 string, e.g. ipfs://… — max 100 bytes). */
export async function mintNft(
  client: Client,
  supplyAccountId: string,
  supplyPrivateKey: string,
  tokenId: string,
  metadata: string,
) {
  if (!supplyAccountId.trim() || !supplyPrivateKey.trim() || !tokenId.trim()) {
    throw new Error('Account, private key, and NFT token ID are required')
  }
  const meta = metadata.trim()
  if (!meta) throw new Error('Metadata / URI is required')

  try {
    const account = AccountId.fromString(supplyAccountId.trim())
    const key = parsePrivateKey(supplyPrivateKey)
    client.setOperator(account, key)

    const bytes = new TextEncoder().encode(meta)
    if (bytes.length > 100) {
      throw new Error('Metadata must be 100 bytes or fewer on Hedera (use a short URI)')
    }

    const tx = await new TokenMintTransaction()
      .setTokenId(tokenId.trim())
      .setMetadata([bytes])
      .setMaxTransactionFee(NFT_MINT_MAX_FEE)
      .freezeWith(client)

    const signed = await tx.sign(key)
    const response = await signed.execute(client)
    const receipt = await response.getReceipt(client)
    const serial = receipt.serials?.[0]

    return {
      serial: serial != null ? serial.toString() : '',
      transactionId: response.transactionId.toString(),
    }
  } catch (error) {
    throw formatError(error)
  }
}

/** Transfer a single NFT serial from sender to recipient. */
export async function transferNft(
  client: Client,
  senderAccountId: string,
  senderPrivateKey: string,
  recipientAccountId: string,
  tokenId: string,
  serial: string | number,
) {
  if (
    !senderAccountId.trim() ||
    !senderPrivateKey.trim() ||
    !recipientAccountId.trim() ||
    !tokenId.trim() ||
    serial === '' ||
    serial == null
  ) {
    throw new Error('Sender, recipient, token ID, and serial are required')
  }

  try {
    const sender = AccountId.fromString(senderAccountId.trim())
    const senderKey = parsePrivateKey(senderPrivateKey)
    const recipient = AccountId.fromString(recipientAccountId.trim())
    client.setOperator(sender, senderKey)

    const nftId = NftId.fromString(`${tokenId.trim()}/${serial}`)

    const tx = await new TransferTransaction()
      .addNftTransfer(nftId, sender, recipient)
      .freezeWith(client)

    const signed = await tx.sign(senderKey)
    const response = await signed.execute(client)
    await response.getReceipt(client)

    return {
      transactionId: response.transactionId.toString(),
    }
  } catch (error) {
    throw formatError(error)
  }
}
