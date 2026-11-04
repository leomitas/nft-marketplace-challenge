import Big from 'big.js'

// ETH values travel as decimal strings; Big keeps arithmetic exact (no floats).
export type EthAmount = string

export const ETH_DECIMALS = 2

export function formatEth(value: EthAmount, decimals = ETH_DECIMALS) {
  return `${new Big(value).toFixed(decimals)} ETH`
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
