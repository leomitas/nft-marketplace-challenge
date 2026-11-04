import { expect, test } from '@playwright/test'
import {
  addToCartFromDetail,
  cartLines,
  isMobile,
  mockControlJson,
  openWithScenario,
  signIn,
  USERS,
} from './support.ts'

test.describe('Carrinho', () => {
  test('adiciona, altera quantidade, remove com desfazer e persiste após refresh', async ({
    page,
  }) => {
    await openWithScenario(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await addToCartFromDetail(page, 'violet-nomad-314')
    await expect(cartLines(page)).toHaveCount(2)
    // Badge lives in the header (desktop) and tab bar; the mobile cart screen hides both
    if (!isMobile(page)) {
      await expect(page.getByRole('link', { name: 'Carrinho, 2 itens' })).toBeVisible()
    }

    // Quantity is bounded by stock: Emerald 1/50 has 4 left
    const emerald = cartLines(page).filter({ hasText: 'Emerald Ape #042' })
    const plus = emerald.getByRole('button', { name: 'Aumentar quantidade' })
    for (let i = 0; i < 3; i++) await plus.click()
    await expect(emerald.locator('output')).toHaveText('4')
    await expect(plus).toBeDisabled()
    await expect(emerald).toContainText('4.76 ETH')

    // Totals come from the API quote: 4 × 1.19 + 1.39 + 0.016 fee
    const summary = page.locator('dl').filter({ hasText: 'Subtotal' }).filter({ visible: true })
    await expect(summary).toContainText('6.15 ETH')
    await expect(summary).toContainText('6.166 ETH')

    // Remove with undo
    await cartLines(page)
      .filter({ hasText: 'Violet Nomad #314' })
      .getByRole('button', { name: /Remover Violet Nomad/ })
      .click()
    await expect(cartLines(page)).toHaveCount(1)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(cartLines(page)).toHaveCount(2)

    await page.reload()
    await expect(cartLines(page)).toHaveCount(2)
    await expect(cartLines(page).filter({ hasText: 'Emerald' }).locator('output')).toHaveText('4')
  })

  test('cupom válido aplica desconto; inválido e expirado mostram erro', async ({ page }) => {
    await openWithScenario(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const coupon = page.getByPlaceholder('Digite o código promocional...').filter({ visible: true })
    const apply = page.getByRole('button', { name: 'Aplicar' }).filter({ visible: true })

    await coupon.fill('NAOEXISTE')
    await apply.click()
    await expect(page.getByRole('alert').filter({ hasText: 'Cupom inválido.' })).toBeVisible()
    await expect(coupon).toHaveAttribute('aria-invalid', 'true')

    await coupon.fill('genesis20')
    await apply.click()
    await expect(page.getByRole('alert').filter({ hasText: 'Este cupom expirou.' })).toBeVisible()

    await coupon.fill('KURIO10')
    await apply.click()
    const summary = page.locator('dl').filter({ hasText: 'Subtotal' }).filter({ visible: true })
    await expect(summary).toContainText('Desconto (KURIO10)')
    await expect(summary).toContainText('(-) 0.119 ETH')
    // 1.19 - 0.119 + 0.016
    await expect(summary).toContainText('1.087 ETH')

    await page
      .getByRole('button', { name: 'Remover', exact: true })
      .filter({ visible: true })
      .click()
    await expect(summary).toContainText('(-) 0.00 ETH')
  })

  test('preço alterado no servidor é sinalizado e exige aceite', async ({ page }) => {
    await openWithScenario(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await mockControlJson(page, 'nfts/emerald-ape-042/price', { priceEth: '1.49' })
    await page.reload()

    const notice = page.getByRole('status').filter({ hasText: 'Seu carrinho mudou' })
    await expect(notice).toContainText('mudou de 1.19 ETH para 1.49 ETH')
    await notice.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(notice).toBeHidden()
    await expect(cartLines(page).first()).toContainText('1.49 ETH')
  })

  test('estoque insuficiente pode ser ajustado e esgotado pode ser removido', async ({ page }) => {
    await openWithScenario(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    const plus = cartLines(page).first().getByRole('button', { name: 'Aumentar quantidade' })
    await plus.click()
    await plus.click()
    await expect(cartLines(page).first().locator('output')).toHaveText('3')

    await mockControlJson(page, 'nfts/emerald-ape-042/stock', { editionId: '1-50', available: 1 })
    await page.reload()
    const notice = page.getByRole('status').filter({ hasText: 'Seu carrinho mudou' })
    await notice.getByRole('button', { name: 'Ajustar para 1' }).click()
    await expect(notice).toBeHidden()
    await expect(cartLines(page).first().locator('output')).toHaveText('1')

    await mockControlJson(page, 'nfts/emerald-ape-042/stock', { editionId: '1-50', available: 0 })
    await page.reload()
    await notice.getByRole('button', { name: 'Remover do carrinho' }).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('itens do visitante são preservados ao fazer login', async ({ page }) => {
    await openWithScenario(page, '/')
    await addToCartFromDetail(page, 'golden-signal-160')
    await expect(cartLines(page)).toHaveCount(1)

    await signIn(page, USERS.bruno, '/carrinho')
    await expect(cartLines(page)).toHaveCount(1)
    await expect(cartLines(page).first()).toContainText('Golden Signal #160')

    // The account keeps the cart; signing out shows an empty visitor cart
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()

    await signIn(page, USERS.bruno, '/carrinho')
    await expect(cartLines(page).first()).toContainText('Golden Signal #160')
  })

  test('carrinho vazio orienta a continuar explorando', async ({ page }) => {
    await openWithScenario(page, '/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    await page.getByRole('link', { name: 'Continuar explorando' }).first().click()
    await expect(page).toHaveURL(/\/#catalogo$/)
  })
})
