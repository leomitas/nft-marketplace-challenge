import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFavorites, setFavorite } from '@/api/auth'
import type { Favorites } from '@/api/contracts/auth'
import type { NftSummary } from '@/api/contracts/catalog'
import { toast } from '@/components/ui/toaster'
import { meKeys } from '@/features/auth/session'
import { useSession } from '@/features/auth/use-session'

export const favoritesKey = (userId: string) => [...meKeys.user(userId), 'favorites'] as const

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: favoritesKey(userId),
    queryFn: ({ signal }) => getFavorites(signal),
  })

/** Ids favorited by the current user, or an empty set for visitors. */
export function useFavoriteIds() {
  const { user } = useSession()
  const favorites = useQuery({ ...favoritesQuery(user?.id ?? ''), enabled: Boolean(user) })
  return new Set(favorites.data?.items.map((nft) => nft.id) ?? [])
}

/**
 * Optimistic toggle: the heart changes immediately, the previous list is restored if the API
 * fails. Mutations on the same NFT share a scope, so they run in order and a fast double click
 * can't leave the cache in the wrong state.
 */
export function useToggleFavorite(nft: NftSummary) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = favoritesKey(user?.id ?? '')

  return useMutation({
    scope: { id: `favorite:${nft.id}` },
    mutationFn: (favorited: boolean) => setFavorite(nft.id, favorited),
    onMutate: async (favorited) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (current) => {
        const items = (current?.items ?? []).filter((item) => item.id !== nft.id)
        return { items: favorited ? [nft, ...items] : items }
      })
      return { previous }
    },
    onError: (error, favorited, context) => {
      queryClient.setQueryData(key, context?.previous)
      toast.error(
        favorited
          ? `Não foi possível favoritar ${nft.name}.`
          : `Não foi possível remover ${nft.name} dos favoritos.`,
        { description: `${error.message} O estado anterior foi restaurado.` },
      )
    },
    onSuccess: (_result, favorited) => {
      toast.success(
        favorited ? `${nft.name} adicionado aos favoritos.` : `${nft.name} removido dos favoritos.`,
      )
    },
    // Server is the source of truth once the dust settles
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
