import { expect, test } from '@playwright/test'
import { fillLogin, mockControl, openWithScenario, signIn, USERS } from './support.ts'

test.describe('Autenticação e sessão', () => {
  test('login valida campos, rejeita senha errada e volta ao fluxo anterior', async ({ page }) => {
    await openWithScenario(page, '/login?redirect=%2Fnfts%2Femerald-ape-042')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('E-mail')).toBeFocused()

    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(dialog.getByLabel('E-mail')).toBeFocused()

    await fillLogin(page, { email: USERS.ana.email, password: 'senhaErrada1' })
    await expect(dialog.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

    await fillLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/nfts\/emerald-ape-042$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' }).first(),
    ).toBeAttached()
  })

  test('cadastro valida, trata conflito e cria a conta com sessão ativa', async ({ page }) => {
    await openWithScenario(page, '/cadastro')
    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Nome de usuário').fill('a')
    await dialog.getByLabel('E-mail').fill('nao-e-email')
    await dialog.getByLabel('Senha', { exact: true }).fill('curta')
    await dialog.getByLabel('Confirmar senha').fill('outra')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
    await expect(dialog.getByText('Use ao menos 3 caracteres.')).toBeVisible()
    await expect(dialog.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(dialog.getByText('A senha precisa ter ao menos 8 caracteres.')).toBeVisible()

    // Conflict comes from the API (e-mail already registered)
    await dialog.getByLabel('Nome de usuário').fill('nova.pessoa')
    await dialog.getByLabel('E-mail').fill(USERS.ana.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('Segura123')
    await dialog.getByLabel('Confirmar senha').fill('Segura123')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
    await expect(dialog.getByText('Já existe uma conta com este e-mail.')).toBeVisible()
    await expect(dialog.getByLabel('E-mail')).toBeFocused()

    await dialog.getByLabel('E-mail').fill('nova@kurio.dev')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
    await expect(page).toHaveURL(/\/$/)

    // Session survives a refresh
    await page.goto('/perfil')
    await expect(page.getByText('nova@kurio.dev')).toBeVisible()
    await page.reload()
    await expect(page.getByText('nova@kurio.dev')).toBeVisible()
  })

  test('rota privada redireciona visitante ao login e retorna após autenticar', async ({
    page,
  }) => {
    await openWithScenario(page, '/')
    await page.goto('/favoritos')
    await expect(page).toHaveURL(/\/login\?redirect=%2Ffavoritos/)
    await fillLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/favoritos$/)
    await expect(page.getByRole('heading', { name: 'Meus favoritos' })).toBeVisible()
  })

  test('sessão expirada durante a navegação leva ao login e preserva o destino', async ({
    page,
  }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.ana, '/favoritos')
    await expect(page.getByRole('link', { name: 'Sage Nomad #009' })).toBeVisible()

    await mockControl(page, 'sessions/expire')
    await page.goto('/perfil')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil&reason=expired/)
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('Sua sessão expirou')

    await fillLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/perfil$/)
  })

  test('sessão expirada em uma ação (favoritar) redireciona e não deixa dados privados', async ({
    page,
  }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.ana, '/nfts/emerald-ape-042')
    await mockControl(page, 'sessions/expire')

    // Any authenticated request after expiry ends the session — the favorite click, or a
    // background refetch (e.g. the cart on window focus) that may get there first
    const favorite = page
      .getByRole('button', { name: 'Favoritar Emerald Ape #042' })
      .filter({ visible: true })
    await favorite.click({ timeout: 5_000 }).catch(() => undefined)
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Femerald-ape-042&reason=expired/)

    // Signing back in resumes on the same NFT, as the same user
    await fillLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/nfts\/emerald-ape-042$/)
  })

  test('logout e troca de usuário não expõem dados do usuário anterior', async ({ page }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.ana, '/favoritos')
    await expect(page.getByRole('link', { name: 'Sage Nomad #009' })).toBeVisible()

    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)

    await signIn(page, USERS.bruno, '/favoritos')
    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sage Nomad #009' })).toHaveCount(0)
  })

  test('falha do serviço de autenticação mostra erro sem perder o formulário', async ({ page }) => {
    await openWithScenario(page, '/login', 'auth-unavailable')
    await fillLogin(page, USERS.ana)
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
      'Autenticação temporariamente indisponível.',
    )
    await expect(page.getByRole('dialog').getByLabel('E-mail')).toHaveValue(USERS.ana.email)
  })
})
