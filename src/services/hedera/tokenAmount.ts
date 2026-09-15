import Long from 'long'

/** Convert a human token amount (e.g. "100000" or "1.5") to base units for HTS. */
export function toTokenBaseUnits(amount: string, decimals: number): Long {
  const trimmed = amount.trim()
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a valid token amount (e.g. 100000 or 1.5)')
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Decimals must be between 0 and 18')
  }

  const [wholeRaw, fracRaw = ''] = trimmed.split('.')
  if (fracRaw.length > decimals) {
    throw new Error(`This token allows at most ${decimals} decimal places`)
  }

  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0'
  const frac = fracRaw.padEnd(decimals, '0')
  const combined = `${whole}${frac}`.replace(/^0+(?=\d)/, '') || '0'

  return Long.fromString(combined)
}

/** Format HTS base units for display (what HashScan shows). */
export function fromTokenBaseUnits(baseAmount: string | number | Long, decimals: number): string {
  const raw =
    typeof baseAmount === 'string'
      ? baseAmount
      : Long.isLong(baseAmount)
        ? baseAmount.toString()
        : String(baseAmount)

  const negative = raw.startsWith('-')
  const digits = (negative ? raw.slice(1) : raw).replace(/^0+(?=\d)/, '') || '0'

  if (decimals <= 0) return negative ? `-${digits}` : digits

  const padded = digits.padStart(decimals + 1, '0')
  const whole = padded.slice(0, -decimals) || '0'
  const frac = padded.slice(-decimals).replace(/0+$/, '')
  const formatted = frac ? `${whole}.${frac}` : whole
  return negative ? `-${formatted}` : formatted
}
