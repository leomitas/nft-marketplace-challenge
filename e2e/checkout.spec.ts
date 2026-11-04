import { expect, test, type Page } from '@playwright/test'
import {
  cartLines,
  connectWallet,
  fillLogin,
  mockControl,
  mockControlJson,
  mockOrders,
  openReview,
  openWithScenario,
  startCheckout,
  USERS,
} from './support.ts'

const RECEIPT_TITLE = 'Seus NFTs agora estão na sua carteira'

function confirmButton(page: Page) {
  return page.getByRole('button', { name: /Confirmar e pagar/ })
}

test.describe('Pagamento e confirmação', () => {
  test('compra completa: valida, revisa, aguarda a rede e mostra o recibo como snapshot', async ({
    page,
  }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana, ['emerald-ape-042', 'violet-nomad-314'])

    // Validation on the layout fields, with focus on the first error
    const displayName = page.getByLabel('Nome de exibição *')
    await displayName.fill('')
    await page.getByLabel('E-mail *').fill('nao-e-email')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(displayName).toBeFocused()
    await expect(page.getByText('Informe como você quer ser exibido.')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()

    await displayName.fill('Ana Colecionadora')
    await page.getByLabel('E-mail *').fill('ana@kurio.dev')
    await page.getByLabel('Observação do colecionador (opcional)').fill('Primeira compra')

    // Not connected yet: the purchase can't be reviewed
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Conecte a carteira' })).toBeVisible()
    await connectWallet(page)

    const dialog = await openReview(page)
    // 1.19 + 1.39 + 0.016 fee, from the API quote
    await expect(dialog).toContainText('2.596 ETH')
    await expect(dialog).toContainText('Ana Colecionadora')
    await expect(dialog).toContainText('Primeira compra')
    await confirmButton(page).click()

    await expect(page).toHaveURL(/\/pedidos\/ord_\w+$/)
    await expect(page.getByRole('status')).toContainText('Aguardando confirmação')
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({
      timeout: 10_000,
    })
    const receipt = page.getByRole('article')
    await expect(receipt).toContainText('Emerald Ape #042')
    await expect(receipt).toContainText('Violet Nomad #314')
    await expect(receipt).toContainText('2.596 ETH')

    // Catalog changes after the purchase never alter the receipt
    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '9.99' })
    await page.reload()
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible()
    await expect(page.getByRole('article')).toContainText('1.19 ETH')
    await expect(page.getByRole('article')).not.toContainText('9.99 ETH')

    // Bought items left the cart
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
    await openWithScenario(page, '/', 'payment-refused')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    await openReview(page)
    await confirmButton(page).click()

    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toHaveCount(0)
    await page.getByRole('link', { name: 'Ver carrinho' }).click()
    await expect(cartLines(page)).toHaveCount(1)
  })

  test('cliques repetidos e reenvio criam um único pedido', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    await openReview(page)
    await confirmButton(page).dblclick()
    await expect(page).toHaveURL(/\/pedidos\/ord_\w+$/)
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({
      timeout: 10_000,
    })
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('a mesma chave com outro conteúdo gera conflito na API', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    await openReview(page)
    await confirmButton(page).click()
    await expect(page).toHaveURL(/\/pedidos\/ord_\w+$/)

    // Replays the stored attempt key with different content, straight against the API
    const statuses = await page.evaluate(async () => {
      const token = localStorage.getItem('kurio:auth-token')
      const attempt = Object.keys(sessionStorage).find((k) =>
        k.startsWith('kurio:checkout:attempt'),
      )
      const { key, fingerprint } = JSON.parse(sessionStorage.getItem(attempt!)!)
      const send = (body: string) =>
        fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': key,
          },
          body,
        }).then((r) => r.status)
      const changed = JSON.parse(fingerprint)
      changed.collector.note = 'outro conteúdo'
      return [await send(fingerprint), await send(JSON.stringify(changed))]
    })
    expect(statuses).toEqual([200, 409])
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido pela chave de idempotência', async ({
    page,
  }) => {
    await openWithScenario(page, '/', 'order-timeout')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    await openReview(page)
    await confirmButton(page).click()
    await expect(page.getByRole('button', { name: 'Enviando pedido...' })).toBeVisible()

    // The first response never arrives; the automatic retry with the same key gets the order
    await expect(page).toHaveURL(/\/pedidos\/ord_\w+$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({
      timeout: 10_000,
    })
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('pedido pendente é recuperado após refresh, sem duplicar', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    await openReview(page)
    await confirmButton(page).click()
    await expect(page.getByRole('status')).toContainText('Aguardando confirmação')
    const url = page.url()

    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({
      timeout: 10_000,
    })
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('preço alterado ao confirmar exige aceitar os novos valores', async ({ page }) => {
    await openWithScenario(page, '/', 'checkout-price-change')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    const dialog = await openReview(page)
    await expect(dialog).toContainText('1.206 ETH')
    await confirmButton(page).click()

    // The server rejected the stale quote; the new price must be accepted explicitly
    const notice = dialog.getByRole('status').filter({ hasText: 'Seu carrinho mudou' })
    await expect(notice).toContainText('para 1.29 ETH')
    await expect(confirmButton(page)).toBeDisabled()
    await notice.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(dialog).toContainText('1.306 ETH')
    await confirmButton(page).click()

    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('article')).toContainText('1.306 ETH')
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('edição esgotada ao confirmar bloqueia o pedido e preserva o carrinho', async ({ page }) => {
    await openWithScenario(page, '/', 'checkout-sold-out')
    await startCheckout(page, USERS.ana, ['emerald-ape-042', 'violet-nomad-314'])
    await connectWallet(page)
    const dialog = await openReview(page)
    await confirmButton(page).click()

    await expect(dialog.getByRole('status')).toContainText('esgotou')
    await expect(confirmButton(page)).toBeDisabled()
    expect(await mockOrders(page)).toHaveLength(0)
  })

  test('carteira: conexão recusada, nova tentativa e desconexão', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await mockControl(page, 'scenario/wallet-rejected')

    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByRole('alert')).toContainText('A conexão foi recusada na carteira.')

    await mockControl(page, 'scenario/default')
    await connectWallet(page)
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()

    // Choosing another registered wallet and network needs a new connection
    await page.getByRole('radio', { name: /Reserva/ }).check()
    await expect(page.getByLabel('Rede *')).toHaveValue('polygon')
    await connectWallet(page)
    await expect(page.getByRole('status').filter({ hasText: 'Conectada' })).toContainText('Polygon')
  })

  test('sessão expirada no checkout volta ao pagamento com o formulário preservado', async ({
    page,
  }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await page.getByLabel('Observação do colecionador (opcional)').fill('Guardar este texto')

    await mockControl(page, 'sessions/expire')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpagamento&reason=expired/)

    await fillLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue(
      'Guardar este texto',
    )
  })

  test('pedido de outro usuário não é exibido', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)
    await openReview(page)
    await confirmButton(page).click()
    await expect(page).toHaveURL(/\/pedidos\/ord_\w+$/)
    const orderPath = new URL(page.url()).pathname

    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto(`/login?redirect=${encodeURIComponent(orderPath)}`)
    await fillLogin(page, USERS.bruno)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
    await expect(page.getByText('Emerald Ape #042')).toHaveCount(0)
  })
})
