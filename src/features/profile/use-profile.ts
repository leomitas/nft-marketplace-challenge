import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@/api/contracts/auth'
import type { WalletInput } from '@/api/contracts/profile'
import type { WalletRole } from '@/api/contracts/wallets'
import {
  changePassword,
  removeAvatar,
  saveWallet,
  updateProfile,
  uploadAvatar,
} from '@/api/profile'
import { sessionQuery } from '@/features/auth/session'
import { useSession } from '@/features/auth/use-session'
import { checkoutKeys } from '@/features/checkout/keys'

/** Profile changes return the updated user; the session cache (header, menus) follows. */
function useUserMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<User>) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: 'profile' },
    mutationFn,
    onSuccess: (user) =>
      queryClient.setQueryData<Session | null>(sessionQuery().queryKey, (session) =>
        session ? { ...session, user } : session,
      ),
  })
}

export const useUpdateProfile = () => useUserMutation(updateProfile)
export const useUploadAvatar = () => useUserMutation(uploadAvatar)
export const useRemoveAvatar = () => useUserMutation(() => removeAvatar())

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? ''
  return useMutation({
    mutationFn: ({ role, body }: { role: WalletRole; body: WalletInput }) => saveWallet(role, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkoutKeys.wallets(userId) })
      // The server drops a checkout connection made with the old wallet data
      void queryClient.invalidateQueries({ queryKey: checkoutKeys.connection(userId) })
    },
  })
}
