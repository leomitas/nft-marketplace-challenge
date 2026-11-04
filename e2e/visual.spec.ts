import { expect, test, type Page } from '@playwright/test'
import { addToCartFromDetail, openWithScenario, startCheckout, USERS } from './support.ts'

/**
 * Visual regression of the four Figma screens with deterministic fixtures. A single baseline set
 * (`e2e/__screenshots__/`) serves every OS, with a tolerance for font anti-aliasing; regenerate
 * after an intended UI change with `pnpm test:e2e:update-visual`.
 */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  // Every image decoded, web font ready: no half-loaded frames in the baseline
  // (string form: the e2e tsconfig has no DOM types)
  await page.evaluate(`(async () => {
    await document.fonts.ready
    await Promise.all(
      [...document.images].map((img) => {
        // Lazy images below the fold would otherwise be blank (or not) depending on timing
        img.loading = 'eager'
        return img.decode().catch(() => null)
      }),
    )
  })()`)
}

// Tolerance and animations come from playwright.config.ts (shared by every OS)
const options = { fullPage: true } as const

test.describe('Regressão visual', { tag: '@visual' }, () => {
  test('início', async ({ page }) => {
    await openWithScenario(page, '/')
    await expect(page.locator('#catalogo article').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', options)
  })

  test('detalhe do NFT', async ({ page }) => {
    await openWithScenario(page, '/nfts/emerald-ape-042')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' }).first(),
    ).toBeAttached()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', options)
  })

  test('carrinho', async ({ page }) => {
    await openWithScenario(page, '/')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await addToCartFromDetail(page, 'violet-nomad-314')
    await expect(
      page.locator('dl').filter({ hasText: 'Subtotal' }).filter({ visible: true }),
    ).toContainText('2.596 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', options)
  })

  test('pagamento', async ({ page }) => {
    await openWithScenario(page, '/')
    await startCheckout(page, USERS.ana, ['emerald-ape-042', 'violet-nomad-314'])
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', options)
  })
})
