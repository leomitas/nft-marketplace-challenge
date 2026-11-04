import { expect, type Page } from '@playwright/test'

/**
 * Opens a path with a fresh mock database and the given scenario. Each Playwright test has
 * its own browser context (empty localStorage), and `reset=1` makes the seed explicit.
 */
export async function openWithScenario(page: Page, path: string, scenario = 'default') {
  const url = new URL(path, 'http://placeholder')
  url.searchParams.set('reset', '1')
  url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}`)
  // The mock layer strips both params once applied; navigating earlier would lose them
  await page.waitForURL((current) => !current.searchParams.has('reset'))
}

/** Switches the scenario through the mock layer's own storage, as `?scenario=` does. */
export async function setScenario(page: Page, scenario: string) {
  await page.evaluate((id) => {
    if (id === 'default') localStorage.removeItem('kurio:mock-scenario')
    else localStorage.setItem('kurio:mock-scenario', id)
  }, scenario)
}

export function catalog(page: Page) {
  return page.locator('#catalogo')
}

export function cardTitles(page: Page) {
  return catalog(page).locator('article h3')
}

export async function expectCards(page: Page, count: number) {
  await expect(cardTitles(page)).toHaveCount(count)
}

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 0) < 768
}

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana Souza' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@2026', name: 'Bruno Lima' },
} as const

/** Calls a control endpoint of the fake backend (scenario, session expiry, reset). */
export async function mockControl(page: Page, path: string) {
  const status = await page.evaluate(
    async (p) => (await fetch(`/api/__mock/${p}`, { method: 'POST' })).status,
    path,
  )
  expect(status).toBe(204)
}

/** Fills the login dialog (works for the desktop modal and the mobile screen). */
export async function fillLogin(page: Page, user: { email: string; password: string }) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Signs in through the UI starting from `/login`, landing on `redirect`. */
export async function signIn(
  page: Page,
  user: { email: string; password: string },
  redirect = '/',
) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await fillLogin(page, user)
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === redirect)
}

/** Calls a mock control that takes a JSON body (price/stock changes on the fake server). */
export async function mockControlJson(page: Page, path: string, body: unknown) {
  // Server-side changes are pushed over the socket: make sure it is listening first
  await waitForRealtime(page)
  const status = await page.evaluate(
    async ([p, b]) =>
      (
        await fetch(`/api/__mock/${p}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(b),
        })
      ).status,
    [path, body] as const,
  )
  expect(status).toBe(204)
}

/** Adds an NFT edition to the cart through the detail page UI (desktop or mobile layout). */
export async function addToCartFromDetail(page: Page, nftId: string, edition = '1-50') {
  await page.goto(`/nfts/${nftId}?edition=${edition}`)
  const buy = page
    .getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })
    .filter({ visible: true })
  await buy.click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

export function cartLines(page: Page) {
  return page
    .getByRole('list', { name: 'Itens do carrinho' })
    .filter({ visible: true })
    .getByRole('listitem')
}

/** Every order on the fake server (id, owner, status), to assert no duplicates were created. */
export async function mockOrders(page: Page) {
  return page.evaluate(
    async () =>
      (await (await fetch('/api/__mock/orders')).json()) as {
        id: string
        userId: string
        status: string
      }[],
  )
}

/** Signs in, fills the cart from the detail page and opens payment through the cart CTA. */
export async function startCheckout(
  page: Page,
  user: { email: string; password: string },
  nftIds: string[] = ['emerald-ape-042'],
) {
  await signIn(page, user, '/')
  for (const id of nftIds) await addToCartFromDetail(page, id)
  await page.getByRole('link', { name: 'Conectar e finalizar' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(page.getByRole('form', { name: 'Pagamento' })).toBeVisible()
}

export async function connectWallet(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Conectada' })).toBeVisible()
}

/** Opens the review dialog from the payment form. */
export async function openReview(page: Page) {
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(dialog).toBeVisible()
  return dialog
}

/** Resolves once socket.io-client is connected to the mock server (so pushes are received). */
export async function waitForRealtime(page: Page) {
  await expect(page.locator('html[data-realtime="online"]')).toBeAttached()
}
