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
