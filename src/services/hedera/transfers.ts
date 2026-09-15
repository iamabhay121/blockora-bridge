import {
  AccountId,
  Hbar,
  PrivateKey,
  TokenId,
  TokenInfoQuery,
  TransferTransaction,
  type Client,
} from '@hashgraph/sdk'
import { toTokenBaseUnits } from './tokenAmount'

function parsePrivateKey(raw: string): PrivateKey {
  const key = raw.trim()
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

export async function transferHbar(
  client: Client,
  senderAccountId: string,
  senderPrivateKey: string,
  recipientAccountId: string,
  amount: string,
) {
  if (!senderAccountId || !senderPrivateKey || !recipientAccountId || !amount) {
    throw new Error('All fields are required for HBAR transfer')
  }

  const sender = AccountId.fromString(senderAccountId.trim())
  const senderKey = parsePrivateKey(senderPrivateKey)
  client.setOperator(sender, senderKey)

  const recipient = AccountId.fromString(recipientAccountId.trim())
  const hbarAmount = Hbar.fromString(amount.trim())

  const transferTx = await new TransferTransaction()
    .addHbarTransfer(sender, hbarAmount.negated())
    .addHbarTransfer(recipient, hbarAmount)
    .execute(client)

  const receipt = await transferTx.getReceipt(client)
  return {
    receipt,
    transactionId: transferTx.transactionId.toString(),
  }
}

export async function transferToken(
  client: Client,
  senderAccountId: string,
  senderPrivateKey: string,
  recipientAccountId: string,
  tokenId: string,
  amount: string | number,
) {
  if (!senderAccountId || !senderPrivateKey || !recipientAccountId || !tokenId || amount === '' || amount == null) {
    throw new Error('All fields are required for token transfer')
  }

  const sender = AccountId.fromString(senderAccountId.trim())
  const senderKey = parsePrivateKey(senderPrivateKey)
  client.setOperator(sender, senderKey)

  const tokenIdObj = TokenId.fromString(tokenId.trim())
  const info = await new TokenInfoQuery().setTokenId(tokenIdObj).execute(client)
  const decimals = info.decimals
  const qty = toTokenBaseUnits(String(amount), decimals)

  if (qty.isZero()) {
    throw new Error(
      `Amount is too small for this token’s ${decimals} decimals — HashScan would show 0. Enter a larger amount.`,
    )
  }

  const transferTx = await new TransferTransaction()
    .addTokenTransfer(tokenIdObj, sender, qty.negate())
    .addTokenTransfer(tokenIdObj, AccountId.fromString(recipientAccountId.trim()), qty)
    .execute(client)

  const receipt = await transferTx.getReceipt(client)
  return {
    receipt,
    transactionId: transferTx.transactionId.toString(),
    decimals,
    baseUnits: qty.toString(),
  }
}
