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
