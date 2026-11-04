import { api } from './client'
import { userSchema } from './contracts/auth'
import type { PasswordChange, ProfileUpdate, WalletInput } from './contracts/profile'
import { walletSchema, type WalletRole } from './contracts/wallets'

export async function updateProfile(body: ProfileUpdate) {
  const { data } = await api.patch('/me/profile', body)
  return userSchema.parse(data)
}

export async function uploadAvatar(dataUrl: string) {
  const { data } = await api.put('/me/avatar', { dataUrl })
  return userSchema.parse(data)
}

export async function removeAvatar() {
  const { data } = await api.delete('/me/avatar')
  return userSchema.parse(data)
}

export async function changePassword(body: PasswordChange) {
  await api.post('/me/password', body)
}

export async function saveWallet(role: WalletRole, body: WalletInput) {
  const { data } = await api.put(`/me/wallets/${role}`, body)
  return walletSchema.parse(data)
}
