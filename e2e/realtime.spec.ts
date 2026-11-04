import { expect, test } from '@playwright/test'
import {
  addToCartFromDetail,
  cartLines,
  connectWallet,
  mockControl,
  mockControlJson,
  mockOrders,
  openReview,
  openWithScenario,
  startCheckout,
  USERS,
} from './support.ts'

// Every change here goes through the mock server, which pushes `nft.updated`/`order.updated`
// over Socket.IO (socket.io-client ↔ @mswjs/socket.io-binding); no page is reloaded.
test.describe('Tempo real (Socket.IO)', () => {
  test('nft.updated atualiza preço no detalhe e no catálogo sem recarregar', async ({ page }) => {
    await openWithScenario(page, '/nfts/emerald-ape-042')
    const detail = page.getByRole('main')
    await expect(detail.getByText('1.19 ETH').filter({ visible: true }).first()).toBeVisible()

    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '1.49' })
    await expect(detail.getByText('1.49 ETH').filter({ visible: true }).first()).toBeVisible()

    await page.goto('/')
    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '1.77' })
    const card = page.locator('#catalogo article').filter({ hasText: 'Emerald Ape #042' })
    await expect(card).toContainText('1.77')
  })

  test('mudança de preço com o carrinho aberto avisa e atualiza o resumo', async ({ page }) => {
    await openWithScenario(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const summary = page.locator('dl').filter({ hasText: 'Subtotal' }).filter({ visible: true })
    await expect(summary).toContainText('1.206 ETH')

    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '1.49' })
    const notice = page.getByRole('status').filter({ hasText: 'Seu carrinho mudou' })
    await expect(notice).toContainText('mudou de 1.19 ETH para 1.49 ETH')
    await expect(summary).toContainText('1.506 ETH')
    // Checkout stays blocked until the change is accepted
    await expect(page.getByRole('link', { name: 'Conectar e finalizar' })).toHaveCount(0)

    await mockControlJson(page, 'nfts/emerald-ape-042/stock', { editionId: '1-50', available: 0 })
    await expect(notice).toContainText('esgotou')
    await expect(cartLines(page)).toHaveCount(1)
  })

  test('checkout não confirma com cotação desatualizada por evento', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    const dialog = await openReview(page)
    const confirm = page.getByRole('button', { name: 'Confirmar e pagar' })
    await expect(confirm).toBeEnabled()

    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '1.49' })
    await expect(dialog.getByRole('status').filter({ hasText: 'Seu carrinho mudou' })).toBeVisible()
    await expect(confirm).toBeDisabled()

    await dialog.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(dialog).toContainText('1.506 ETH')
    await expect(confirm).toBeEnabled()
  })

  test('eventos duplicados ou antigos não regridem o estado', async ({ page }) => {
    await openWithScenario(page, '/nfts/emerald-ape-042')
    const detail = page.getByRole('main')
    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '1.49' })
    await expect(detail.getByText('1.49 ETH').filter({ visible: true }).first()).toBeVisible()
    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '1.59' })
    await expect(detail.getByText('1.59 ETH').filter({ visible: true }).first()).toBeVisible()

    // Server re-sends the 1.59 event twice and then the older 1.49 one
    await mockControl(page, 'realtime/replay/emerald-ape-042')
    await page.waitForTimeout(500)
    await expect(detail.getByText('1.59 ETH').filter({ visible: true }).first()).toBeVisible()
    // A stale 1.49 event would also bring back 1.19 as the previous price
    await expect(detail.getByText('1.19 ETH').filter({ visible: true })).toHaveCount(0)
  })

  test('desconexão com pedido pendente: reconecta, reconcilia e não duplica', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    await openReview(page)
    await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/pedidos\/ord_\w+$/)

    await mockControl(page, 'realtime/offline')
    await expect(page.getByText('Tempo real desconectado. Reconectando...')).toBeVisible()
    // The payment settles while offline: the event is lost, the page still shows pending
    await page.waitForTimeout(3_500)
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação do pagamento' }),
    ).toBeVisible()

    await mockControl(page, 'realtime/online')
    await expect(page.getByText('Tempo real desconectado. Reconectando...')).toBeHidden({
      timeout: 10_000,
    })
    await expect(
      page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
    ).toBeVisible()
    expect(await mockOrders(page)).toHaveLength(1)
  })
})
