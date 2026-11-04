import { api } from './client'
import { connectionResponseSchema, walletsSchema, type ConnectWallet } from './contracts/wallets'

export async function getWallets(signal?: AbortSignal) {
  const { data } = await api.get('/me/wallets', { signal })
  return walletsSchema.parse(data).items
}

export async function getWalletConnection(signal?: AbortSignal) {
  const { data } = await api.get('/me/wallet-connection', { signal })
  return connectionResponseSchema.parse(data).connection
}

export async function connectWallet(body: ConnectWallet) {
  const { data } = await api.put('/me/wallet-connection', body)
  return connectionResponseSchema.parse(data).connection
}

export async function disconnectWallet() {
  const { data } = await api.delete('/me/wallet-connection')
  return connectionResponseSchema.parse(data).connection
}
