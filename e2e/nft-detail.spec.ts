import { expect, test, type Page } from '@playwright/test'
import { isMobile, mockControl, openWithScenario, signIn, USERS } from './support.ts'

/** Desktop and mobile layouts both exist in the DOM; role queries only see the visible one. */
function view(page: Page) {
  return page
}

test.describe('Detalhe do NFT', () => {
  test('mostra galeria, edições, quantidade com limite e edição esgotada', async ({ page }) => {
    await openWithScenario(page, '/nfts/emerald-ape-042')
    const detail = view(page)
    await expect(detail.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

    // 1/1 is sold out: disabled; 1/50 selected by default
    await expect(detail.getByRole('radio', { name: /^1\/1 / })).toBeDisabled()
    await expect(detail.getByRole('radio', { name: /^1\/50 / })).toBeChecked()

    // 1/50 has 4 in stock: the stepper stops at 4 and explains why
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true })
    for (let i = 0; i < 5; i++) {
      if (await plus.isEnabled()) await plus.click()
    }
    await expect(page.locator('output').filter({ visible: true })).toHaveText('4')
    await expect(plus).toBeDisabled()

    // Changing edition keeps it in the URL and resets the quantity
    await detail.getByText('ABERTA').filter({ visible: true }).click()
    await expect(page).toHaveURL(/edition=open/)
    await expect(page.locator('output').filter({ visible: true })).toHaveText('1')
    await page.reload()
    await expect(view(page).getByRole('radio', { name: /ABERTA/ })).toBeChecked()
  })

  test('aba de avaliações carrega sob demanda', async ({ page }) => {
    await openWithScenario(page, '/nfts/emerald-ape-042')
    const detail = view(page)
    await detail.getByRole('tab', { name: /Avaliações de colecionadores \(19\)/ }).click()
    await expect(detail.getByRole('tabpanel').getByRole('listitem')).toHaveCount(19)
  })

  test('favoritar exige login e volta ao NFT', async ({ page }) => {
    await openWithScenario(page, '/nfts/emerald-ape-042')
    await page
      .getByRole('button', { name: 'Favoritar Emerald Ape #042' })
      .filter({ visible: true })
      .click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Femerald-ape-042/)
  })

  test('favorito com atualização otimista, persistência e rollback em falha', async ({ page }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.ana, '/nfts/emerald-ape-042')
    const toggle = page
      .getByRole('button', { name: /(Favoritar|Remover) Emerald Ape #042/ })
      .filter({ visible: true })

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Emerald Ape #042 adicionado aos favoritos.')).toBeVisible()

    // Persisted for the user
    await page.reload()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    // Failure: the UI flips immediately, then rolls back with a message
    await mockControl(page, 'scenario/favorites-error')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(
      page.getByText('Não foi possível remover Emerald Ape #042 dos favoritos.'),
    ).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    // Recovery once the API is back
    await mockControl(page, 'scenario/default')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await page.goto('/favoritos')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toHaveCount(0)
  })

  test('zoom abre a imagem em diálogo com foco gerenciado', async ({ page }) => {
    test.skip(isMobile(page), 'Zoom pertence à galeria desktop')
    await openWithScenario(page, '/nfts/emerald-ape-042')
    const trigger = page.getByRole('button', { name: 'Ampliar imagem' })
    await trigger.click()
    await expect(page.getByRole('dialog', { name: 'Emerald Ape #042' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
