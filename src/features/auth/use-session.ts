import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { login, logout, register } from '@/api/auth'
import type { LoginRequest, RegisterRequest } from '@/api/contracts/auth'
import { mergeGuestCartAfterLogin } from '@/features/cart/merge'
import { checkoutDraft } from '@/features/checkout/draft'
import { endSession, sessionQuery, startSession } from './session'

export function useSession() {
  const session = useQuery(sessionQuery())
  return { user: session.data?.user ?? null, isPending: session.isPending }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    // The visitor cart moves into the account before the user is sent onwards
    onSuccess: async (auth) => {
      startSession(queryClient, auth)
      await mergeGuestCartAfterLogin(queryClient, auth.user.id)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterRequest) => register(body),
    // The visitor cart moves into the account before the user is sent onwards
    onSuccess: async (auth) => {
      startSession(queryClient, auth)
      await mergeGuestCartAfterLogin(queryClient, auth.user.id)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logout(),
    // Local session ends even if the server call fails: the user asked to leave
    onSettled: () => {
      endSession(queryClient)
      checkoutDraft.clearAll()
    },
  })
}
