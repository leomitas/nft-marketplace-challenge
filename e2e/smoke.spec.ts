import { expect, test } from '@playwright/test'

test('home loads data from the MSW-mocked API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByTestId('api-status')).toContainText('(mock)')
})

test('unknown route renders the not-found page after a direct access', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})
