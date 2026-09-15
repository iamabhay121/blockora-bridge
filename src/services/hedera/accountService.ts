import {
  AccountBalanceQuery,
  AccountId,
  TokenId,
  TokenInfoQuery,
  type Client as HederaClient,
} from '@hashgraph/sdk'
import { fromTokenBaseUnits } from './tokenAmount'

export async function fetchAccountBalances(
  client: HederaClient,
  accountId: string,
  tokenId: string | null = null,
) {
  if (!accountId) throw new Error('Account ID is required')

  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(AccountId.fromString(accountId.trim()))
    .execute(client)

  const hbarBalance = accountBalance.hbars.toString()
  let tokenBalance = '0'
  let tokenDecimals = 0

  if (tokenId) {
    try {
      const tokenIdObj = TokenId.fromString(tokenId.trim())
      const bal = accountBalance.tokens?.get(tokenIdObj)
      const raw = bal ? bal.toString() : '0'
      const info = await new TokenInfoQuery().setTokenId(tokenIdObj).execute(client)
      tokenDecimals = info.decimals
      tokenBalance = fromTokenBaseUnits(raw, tokenDecimals)
    } catch {
      tokenBalance = '0'
    }
  }

  return { hbarBalance, tokenBalance, tokenDecimals }
}
