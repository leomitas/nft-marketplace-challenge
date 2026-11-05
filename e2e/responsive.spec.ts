import { expect, test, type Locator, type Page } from '@playwright/test'
import { addToCartFromDetail, cartLines, openWithScenario, signIn, USERS } from './support.ts'

/**
 * Widths required by the challenge (390, 768, 1440): every screen renders its main content
 * without horizontal overflow. Light on purpose: one pass per width, no screenshots (layout
 * fidelity is covered by the visual suite).
 */
const WIDTHS = [390, 768, 1440]

async function expectFits(page: Page, path: string, content: Locator) {
  await expect(content, `${path}: conteúdo principal`).toBeVisible()
  // (string form: the e2e tsconfig has no DOM types)
  const [scrollWidth, clientWidth] = (await page.evaluate(
    '[document.documentElement.scrollWidth, document.documentElement.clientWidth]',
  )) as [number, number]
  expect(scrollWidth, `${path}: overflow horizontal em ${clientWidth}px`).toBeLessThanOrEqual(
    clientWidth,
  )
}

test.describe('Larguras 390, 768 e 1440', () => {
  for (const width of WIDTHS) {
    test(`${width}px: telas sem overflow horizontal e com conteúdo visível`, async ({ page }) => {
      // The viewport is set here; running it again under the mobile project would add nothing
      test.skip(test.info().project.name !== 'desktop', 'só no projeto desktop')
      await page.setViewportSize({ width, height: 900 })
      await openWithScenario(page, '/')
      await expectFits(page, '/', page.locator('#catalogo article').first())

      await page.goto('/nfts/emerald-ape-042')
      await expectFits(
        page,
        '/nfts/emerald-ape-042',
        page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' }).filter({ visible: true }),
      )

      await addToCartFromDetail(page, 'emerald-ape-042')
      await expectFits(page, '/carrinho', cartLines(page).first())

      for (const path of ['/login', '/cadastro']) {
        await page.goto(path)
        await expectFits(page, path, page.getByRole('dialog').getByLabel('E-mail'))
      }

      // Private screens (the visitor cart is merged into the account on login)
      await signIn(page, USERS.ana, '/pagamento')
      await expectFits(page, '/pagamento', page.getByRole('form', { name: 'Pagamento' }))
      await page.goto('/perfil')
      await expectFits(
        page,
        '/perfil',
        page.getByRole('heading', { name: 'Perfil do colecionador' }),
      )
      await page.goto('/carteiras')
      await expectFits(page, '/carteiras', page.getByRole('region', { name: 'Carteira principal' }))
    })
  }
})
