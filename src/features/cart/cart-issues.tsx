import type { Cart } from '@/api/contracts/cart'
import { toast } from '@/components/ui/toaster'
import { formatEth } from '@/lib/money'
import { useAcknowledgeCart, useRemoveCartLine, useUpdateCartLine } from './use-cart'

/**
 * Changes the server found since items were added (price, stock). Each one must be resolved by
 * the user — accepting new prices, lowering the quantity or removing the line — before checkout.
 */
export function CartIssues({ cart }: { cart: Cart }) {
  const acknowledge = useAcknowledgeCart()
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()

  const priceChanges = cart.lines.flatMap((line) =>
    line.issues.flatMap((issue) => (issue.type === 'PRICE_CHANGED' ? [{ line, issue }] : [])),
  )
  const stockProblems = cart.lines.flatMap((line) =>
    line.issues.flatMap((issue) =>
      issue.type === 'SOLD_OUT' || issue.type === 'INSUFFICIENT_STOCK' ? [{ line, issue }] : [],
    ),
  )
  if (!priceChanges.length && !stockProblems.length) return null

  return (
    <section
      role="status"
      aria-labelledby="cart-issues-title"
      className="flex flex-col gap-3 rounded-[6px] border border-primary/70 bg-primary/10 p-4 text-sm"
    >
      <h2 id="cart-issues-title" className="font-bold text-foreground">
        Seu carrinho mudou
      </h2>

      {priceChanges.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1">
            {priceChanges.map(({ line, issue }) => (
              <li key={line.id}>
                O preço de <strong>{line.name}</strong> ({line.editionLabel}) mudou de{' '}
                <s>{formatEth(issue.previousPriceEth)}</s> para{' '}
                <strong className="text-text-accent">{formatEth(issue.currentPriceEth)}</strong>.
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={acknowledge.isPending}
            onClick={() =>
              acknowledge.mutate(undefined, {
                onSuccess: () => toast.success('Novos preços aceitos.'),
                onError: (e) => toast.error(e.message),
              })
            }
            className="self-start rounded-[3px] bg-primary px-3 py-1.5 font-bold text-ink disabled:opacity-70"
          >
            Aceitar novos preços
          </button>
        </div>
      )}

      {stockProblems.length > 0 && (
        <ul className="flex flex-col gap-2">
          {stockProblems.map(({ line, issue }) => (
            <li key={line.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {issue.type === 'SOLD_OUT' ? (
                <>
                  <span>
                    <strong>{line.name}</strong> ({line.editionLabel}) esgotou.
                  </span>
                  <button
                    type="button"
                    onClick={() => remove.mutate(line.id)}
                    className="font-bold text-text-accent underline underline-offset-4"
                  >
                    Remover do carrinho
                  </button>
                </>
              ) : (
                <>
                  <span>
                    Restam apenas {issue.available} de <strong>{line.name}</strong> (
                    {line.editionLabel}).
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update.mutate({
                        lineId: line.id,
                        quantity: Math.min(issue.available, line.maxPerOrder),
                      })
                    }
                    className="font-bold text-text-accent underline underline-offset-4"
                  >
                    Ajustar para {Math.min(issue.available, line.maxPerOrder)}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
