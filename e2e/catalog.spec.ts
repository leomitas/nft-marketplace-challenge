import { expect, test } from '@playwright/test'
import {
  cardTitles,
  catalog,
  expectCards,
  isMobile,
  openWithScenario,
  setScenario,
} from './support.ts'

test.describe('Catálogo (Início)', () => {
  test('carrega o catálogo padrão com os NFTs do layout', async ({ page }) => {
    await openWithScenario(page, '/')
    await expectCards(page, 9)
    await expect(cardTitles(page).first()).toHaveText('Emerald Ape #042')
    await expect(catalog(page).getByText('1.19 ETH').first()).toBeVisible()
    // Mock controls are removed from the URL after boot
    await expect(page).toHaveURL(/\/$/)
  })

  test('busca, filtro, ordenação e paginação ficam na URL e sobrevivem a refresh e histórico', async ({
    page,
  }) => {
    test.skip(
      isMobile(page),
      'Filtros da sidebar são desktop; o mobile usa o drawer (teste próprio)',
    )
    await openWithScenario(page, '/')
    await expectCards(page, 9)

    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)

    // Changing a filter goes back to page 1
    const sidebar = page.getByRole('complementary', { name: 'Filtros do catálogo' })
    await sidebar.getByText('Música').click()
    await expect(page).not.toHaveURL(/page=/)
    await expect(page).toHaveURL(/collections=/)
    await sidebar.getByText('Ethereum').click()

    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(cardTitles(page)).toHaveText(['Golden Beat #207', 'Hidden Relic #529'])

    await page.reload()
    await expect(cardTitles(page)).toHaveText(['Golden Beat #207', 'Hidden Relic #529'])
    await expect(sidebar.getByRole('checkbox', { name: /Música/ })).toBeChecked()

    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await page.goBack()
    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('busca por nome e estado vazio com limpeza de filtros', async ({ page }) => {
    await openWithScenario(page, '/?q=zzz-nada')
    await expect(catalog(page).getByRole('status')).toContainText('Nenhum NFT encontrado')
    await catalog(page).getByRole('button', { name: 'Limpar filtros' }).click()
    await expectCards(page, 9)
    await expect(page).not.toHaveURL(/q=/)
  })

  test('abas filtram pela API e reiniciam a paginação', async ({ page }) => {
    await openWithScenario(page, '/?page=2')
    await page.getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)
    await expect(page).not.toHaveURL(/page=/)
    await expect(page.getByRole('button', { name: 'Em alta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('mostra skeleton durante carregamento lento', async ({ page }) => {
    await openWithScenario(page, '/', 'slow')
    await expect(page.getByLabel('Carregando NFTs')).toBeVisible()
    await expectCards(page, 9)
    await expect(page.getByLabel('Carregando NFTs')).toHaveCount(0)
  })

  test('falha do servidor exibe erro e recupera com nova tentativa', async ({ page }) => {
    await openWithScenario(page, '/', 'server-error')
    const alert = catalog(page).getByRole('alert')
    await expect(alert).toContainText('Não foi possível carregar os NFTs', { timeout: 10_000 })
    await setScenario(page, 'default')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expectCards(page, 9)
  })

  test('falha transitória é recuperada pelo retry automático', async ({ page }) => {
    await openWithScenario(page, '/', 'flaky-catalog')
    await expectCards(page, 9)
    await expect(catalog(page).getByRole('alert')).toHaveCount(0)
  })

  test('respostas fora de ordem não sobrescrevem o filtro atual', async ({ page }) => {
    await openWithScenario(page, '/', 'out-of-order')
    await expectCards(page, 9)
    await page.getByRole('button', { name: 'Novos lançamentos' }).click()
    await page.getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)
    // Let every pending response land, then check the screen matches the last choice
    await page.waitForTimeout(2500)
    const trending = await cardTitles(page).allTextContents()
    await page.reload()
    await expect(cardTitles(page)).toHaveText(trending)
  })

  test('filtros no drawer mobile com foco gerenciado', async ({ page }) => {
    test.skip(!isMobile(page), 'Drawer de filtros é o layout mobile')
    await openWithScenario(page, '/')
    const trigger = page.getByRole('button', { name: 'Abrir filtros' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Filtros' })
    await expect(dialog).toBeVisible()
    await dialog.getByText('Fotografia').click()
    await expect(page).toHaveURL(/collections=/)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toContainText('1')
  })
})

test.describe('Detalhe (acesso direto)', () => {
  test('abre o NFT a partir do card e por URL direta', async ({ page }) => {
    await openWithScenario(page, '/')
    await cardTitles(page).first().getByRole('link').click()
    await expect(page).toHaveURL(/\/nfts\/emerald-ape-042$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('NFT inexistente mostra estado de não encontrado', async ({ page }) => {
    await openWithScenario(page, '/nfts/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  })

  test('rota inexistente mostra página 404', async ({ page }) => {
    await page.goto('/rota-que-nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
