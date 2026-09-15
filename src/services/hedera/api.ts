/**
 * Create a funded Hedera account via the Blockora Bridge API (operator stays on the server).
 */
export async function createAccountViaApi(balance = 50, memo = '') {
  const res = await fetch('/api/hedera/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ balance, memo }),
  })

  const data = (await res.json()) as {
    accountId?: string
    privateKey?: string
    transactionId?: string
    error?: string
  }

  if (!res.ok || !data.accountId || !data.privateKey) {
    throw new Error(data.error || 'Account creation failed')
  }

  return {
    accountId: data.accountId,
    privateKey: data.privateKey,
    transactionId: data.transactionId || '',
  }
}
