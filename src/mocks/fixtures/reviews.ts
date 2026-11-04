import type { Review } from '@/api/contracts/catalog'
import { FIXTURE_NOW, prng } from './nfts'

const AUTHORS = [
  'marina.k',
  'joao.p',
  'lia_art',
  'theo.eth',
  'camila.r',
  'rafa.nft',
  'beatriz',
  'igor.m',
]
const COMMENTS = [
  'Acabamento impecável, a arte em alta resolução é ainda melhor ao vivo.',
  'Procedência clara e entrega rápida na carteira. Recomendo.',
  'Os detalhes da roupa são incríveis. Uma das melhores peças da coleção.',
  'Boa peça, mas esperava mais conteúdo desbloqueável.',
  'Comprei a edição 1/50 e não me arrependo. Comunidade muito ativa.',
  'Cores fortes e composição equilibrada. Ficou ótima na minha galeria.',
]

/** Deterministic reviews per NFT: same id, same list on every run. */
export function reviewsFor(nftId: string, count: number): Review[] {
  const seed = [...nftId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const rand = prng(seed)
  return Array.from({ length: count }, (_, i) => ({
    id: `${nftId}-review-${i + 1}`,
    author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
    // Skewed towards 4–5 stars, with the occasional 3
    rating: rand() < 0.15 ? 3 : rand() < 0.5 ? 4 : 5,
    comment: COMMENTS[Math.floor(rand() * COMMENTS.length)],
    createdAt: new Date(FIXTURE_NOW.getTime() - (i + 1) * 2.5 * 86_400_000).toISOString(),
  }))
}

export function averageRating(reviews: Review[]) {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  // One decimal, as shown in the mobile badge ("4.8")
  return Math.round((sum / reviews.length) * 10) / 10
}
