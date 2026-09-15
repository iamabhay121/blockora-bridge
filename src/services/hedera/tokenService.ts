import {
  AccountBalanceQuery,
  AccountId,
  Hbar,
  PrivateKey,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenId,
  TokenSupplyType,
  TokenType,
  type Client,
} from '@hashgraph/sdk'
import { toTokenBaseUnits } from './tokenAmount'

/** TokenCreateTransaction SDK default is 30 ℏ; network rejects lower caps with INSUFFICIENT_TX_FEE. */
const TOKEN_CREATE_MAX_FEE = new Hbar(30)
const ASSOCIATE_MAX_FEE = new Hbar(5)

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
      // try next format
    }
  }

  throw new Error('Invalid private key format. Paste the DER or hex key for this account.')
}

function extractStatus(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  if ('status' in error && error.status != null) {
    return String((error as { status: { toString(): string } | string }).status)
  }
  if (error instanceof Error) {
    const m = error.message.match(
      /\b(INSUFFICIENT_[A-Z_]+|INVALID_[A-Z_]+|TOKEN_[A-Z_]+|BUSY|UNKNOWN)\b/,
    )
    return m?.[1] ?? null
  }
  return null
}

function formatHederaError(error: unknown, payerAccountId?: string): Error {
  const status = extractStatus(error)
  const payer = payerAccountId ? ` (payer ${payerAccountId})` : ''

  if (status && /INVALID_SIGNATURE/i.test(status)) {
    return new Error(
      `Invalid signature${payer}. The private key does not match this Working account ID.`,
    )
  }
  if (status && /INSUFFICIENT_PAYER_BALANCE|INSUFFICIENT_ACCOUNT_BALANCE/i.test(status)) {
    return new Error(
      `Insufficient HBAR on the Working account${payer}. Hedera reserves up to ${TOKEN_CREATE_MAX_FEE.toString()} for the fee cap (actual fee is usually lower). Fund Working account ${payerAccountId ?? ''} to at least that amount, then Refresh balances.`,
    )
  }
  if (status && /INSUFFICIENT_TX_FEE/i.test(status)) {
    return new Error(
      `Fee cap too low for token create${payer}. The app now uses a ${TOKEN_CREATE_MAX_FEE.toString()} max fee — try Create token again.`,
    )
  }
  if (status && /INVALID_ACCOUNT_ID|INVALID_TREASURY_ACCOUNT/i.test(status)) {
    return new Error('Invalid treasury Account ID. Use a valid Testnet account like 0.0.xxxxx.')
  }
  if (status) {
    return new Error(`Hedera rejected token create: ${status}${payer}`)
  }
  if (error instanceof Error) return error
  return new Error('Token operation failed')
}

async function getHbarBalance(client: Client, accountId: AccountId): Promise<Hbar> {
  const bal = await new AccountBalanceQuery().setAccountId(accountId).execute(client)
  return bal.hbars
}

export async function createToken(
  client: Client,
  treasuryAccountId: string,
  treasuryPrivateKey: string,
  tokenName: string,
  tokenSymbol: string,
  initialSupply: string | number = '0',
  decimals = 0,
) {
  const accountId = treasuryAccountId.trim()
  const name = tokenName.trim()
  const symbol = tokenSymbol.trim()
  const supplyInput = String(initialSupply).trim()

  if (!accountId || !treasuryPrivateKey?.trim() || !name || !symbol) {
    throw new Error('Treasury Account ID, Private Key, Token Name, and Token Symbol are required')
  }

  if (name.length > 100) {
    throw new Error('Token name must be 100 characters or fewer')
  }
  if (symbol.length > 100) {
    throw new Error('Token symbol must be 100 characters or fewer')
  }
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 18 || !Number.isInteger(decimals)) {
    throw new Error('Decimals must be a whole number between 0 and 18')
  }

  let payerHint = accountId

  try {
    const treasury = AccountId.fromString(accountId)
    const treasuryKey = parsePrivateKey(treasuryPrivateKey)
    client.setOperator(treasury, treasuryKey)
    payerHint = treasury.toString()

    // Preflight: payer must cover max-fee cap (Hedera checks this, not only actual fee)
    const balance = await getHbarBalance(client, treasury)
    if (balance.toTinybars().lt(TOKEN_CREATE_MAX_FEE.toTinybars())) {
      throw new Error(
        `Working account ${payerHint} has ${balance.toString()}, but needs at least ${TOKEN_CREATE_MAX_FEE.toString()} available for Hedera’s fee cap on token create (you are only charged the real fee, usually ~1–2 ℏ). Fund this Working account — portal/operator balance does not pay this tx.`,
      )
    }

    // Human-readable supply → HTS base units (HashScan shows human amount)
    const supplyBase = toTokenBaseUnits(supplyInput || '0', decimals)

    const transaction = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(supplyBase)
      .setTreasuryAccountId(treasury)
      .setAdminKey(treasuryKey.publicKey)
      .setSupplyKey(treasuryKey.publicKey)
      .setSupplyType(TokenSupplyType.Infinite)
      .setAutoRenewAccountId(treasury)
      .setMaxTransactionFee(TOKEN_CREATE_MAX_FEE)

    const frozen = await transaction.freezeWith(client)
    const signed = await frozen.sign(treasuryKey)
    const txResponse = await signed.execute(client)
    const receipt = await txResponse.getReceipt(client)

    const status = receipt.status.toString()
    if (status !== 'SUCCESS') {
      throw Object.assign(new Error(`Token create failed: ${status}`), { status })
    }
    if (!receipt.tokenId) {
      throw new Error('Token create returned SUCCESS but no token ID')
    }

    return {
      tokenId: receipt.tokenId.toString(),
      transactionId: txResponse.transactionId.toString(),
    }
  } catch (error) {
    throw formatHederaError(error, payerHint)
  }
}

export async function associateToken(
  client: Client,
  accountId: string,
  privateKey: string,
  tokenId: string,
) {
  const id = accountId.trim()
  const tid = tokenId.trim()
  if (!id || !privateKey?.trim() || !tid) {
    throw new Error('Account ID, Private Key, and Token ID are required')
  }

  try {
    const account = AccountId.fromString(id)
    const accountKey = parsePrivateKey(privateKey)
    client.setOperator(account, accountKey)

    const frozen = await new TokenAssociateTransaction()
      .setAccountId(account)
      .setTokenIds([TokenId.fromString(tid)])
      .setMaxTransactionFee(ASSOCIATE_MAX_FEE)
      .freezeWith(client)

    const signed = await frozen.sign(accountKey)
    const tx = await signed.execute(client)
    await tx.getReceipt(client)

    return {
      transactionId: tx.transactionId.toString(),
    }
  } catch (error) {
    throw formatHederaError(error, id)
  }
}
