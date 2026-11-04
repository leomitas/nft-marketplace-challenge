import type { Wallet } from '@/api/contracts/wallets'

export type WalletRecord = Wallet & { userId: string }

const UPDATED_AT = '2026-10-01T12:00:00.000Z'

/** Ana has both wallets (as in the mobile payment frame); Bruno only a primary one. */
export function createWalletFixtures(): WalletRecord[] {
  return [
    {
      id: 'wallet-ana-primary',
      userId: 'user-ana',
      role: 'primary',
      label: 'Principal',
      address: '0xA91F3c5e7B2d4086a1F3C9e27b5D4086e3a8E82C',
      ens: null,
      network: 'ethereum',
      provider: 'metamask',
      updatedAt: UPDATED_AT,
    },
    {
      id: 'wallet-ana-secondary',
      userId: 'user-ana',
      role: 'secondary',
      label: 'Reserva',
      address: '0x5C2e8B1d9F4a7036c2E8b1D9f4A70365c2e8B1d9',
      ens: 'nova.kurio.eth',
      network: 'polygon',
      provider: 'coinbase',
      updatedAt: UPDATED_AT,
    },
    {
      id: 'wallet-bruno-primary',
      userId: 'user-bruno',
      role: 'primary',
      label: 'Principal',
      address: '0x7E2d91B0c4A8f5137e2D91b0C4a8F5137E2d91B0',
      ens: 'bruno.kurio.eth',
      network: 'ethereum',
      provider: 'walletconnect',
      updatedAt: UPDATED_AT,
    },
  ]
}
