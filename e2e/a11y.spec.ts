import { expect, test } from '@playwright/test'
import { connectWallet, isMobile, openWithScenario, startCheckout, USERS } from './support.ts'

test.describe('Teclado e foco', () => {
  test('link "pular para o conteúdo" é o primeiro foco e leva ao main', async ({ page }) => {
    await openWithScenario(page, '/')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    // The app renders after the mock worker starts; tab only once it is on screen
    await expect(page.locator('#catalogo article').first()).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('busca e abertura de NFT só com teclado', async ({ page }) => {
    test.skip(isMobile(page), 'busca do cabeçalho é do layout desktop')
    await openWithScenario(page, '/')
    const card = page.getByRole('link', { name: 'Emerald Ape #042' }).first()
    await card.focus()
    await expect(card).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nfts\/emerald-ape-042/)
  })

  test('revisão do pedido: foco preso no diálogo, Esc fecha e devolve o foco', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    await connectWallet(page)

    const trigger = page.getByRole('button', { name: 'Confirmar compra' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(dialog).toBeVisible()

    // Tabbing never leaves the dialog
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(el.ownerDocument.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('erros do formulário de pagamento ficam associados aos campos', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana)
    const email = page.getByLabel('E-mail *')
    await email.fill('invalido')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.')
  })
})
