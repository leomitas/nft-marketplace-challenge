import Big from 'big.js'

// ETH values travel as decimal strings; Big keeps arithmetic exact (no floats).
export type EthAmount = string

export const ETH_DECIMALS = 2
const MAX_DISPLAY_DECIMALS = 6

/**
 * "1.19 ETH", "0.016 ETH", "26.846 ETH": at least 2 decimals, more only when the value has them
 * (network fees and totals are often finer than cents). Values up to 6 decimals are never rounded.
 */
export function formatEth(value: EthAmount, decimals = ETH_DECIMALS) {
  const fixed = new Big(value).toFixed(MAX_DISPLAY_DECIMALS)
  const [int, frac = ''] = fixed.split('.')
  const trimmed = frac.replace(/0+$/, '').padEnd(decimals, '0')
  return `${int}.${trimmed} ETH`
}

/** Slider positions are integer hundredths of ETH, so the UI never handles fractional numbers. */
export function ethToHundredths(value: EthAmount, round: 'down' | 'up' = 'down') {
  return new Big(value)
    .times(100)
    .round(0, round === 'down' ? Big.roundDown : Big.roundUp)
    .toNumber()
}

export function hundredthsToEth(value: number): EthAmount {
  return new Big(value).div(100).toFixed(ETH_DECIMALS)
}

/** Unit price × integer quantity, exact. */
export function multiplyEth(value: EthAmount, quantity: number): EthAmount {
  return new Big(value).times(quantity).toString()
}
