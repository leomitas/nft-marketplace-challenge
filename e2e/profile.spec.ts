import { expect, test } from '@playwright/test'
import { fillLogin, openWithScenario, signIn, USERS } from './support.ts'

// 1×1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Perfil e carteiras', () => {
  test('edita dados com validação, conflito da API e persistência', async ({ page }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.ana, '/perfil')
    const form = page.getByRole('region', { name: 'Dados do colecionador' })

    await form.getByLabel('Nome de exibição').fill('A')
    await form.getByRole('button', { name: 'Salvar dados' }).click()
    await expect(form.getByText('Informe seu nome.')).toBeVisible()
    await expect(form.getByLabel('Nome de exibição')).toBeFocused()

    await form.getByLabel('Nome de exibição').fill('Ana Colecionadora')
    await form.getByLabel('Nome de usuário').fill('bruno.lima')
    await form.getByRole('button', { name: 'Salvar dados' }).click()
    await expect(form.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await form.getByLabel('Nome de usuário').fill('ana.colecionadora')
    await form.getByRole('button', { name: 'Salvar dados' }).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()

    await page.reload()
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Ana Colecionadora')
    await expect(form.getByLabel('Nome de usuário')).toHaveValue('ana.colecionadora')
  })

  test('avatar: rejeita arquivo inválido, envia, persiste e remove', async ({ page }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.ana, '/perfil')
    const section = page.getByRole('region', { name: 'Avatar' })
    const input = section.getByLabel('Escolher imagem')

    await input.setInputFiles({
      name: 'nota.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('x'),
    })
    await expect(section.getByRole('alert')).toHaveText('Use uma imagem PNG, JPG ou WebP.')

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(section.getByRole('img', { name: 'Avatar de Ana Souza' })).toBeVisible()
    await page.reload()
    await expect(section.getByRole('img', { name: 'Avatar de Ana Souza' })).toBeVisible()

    await section.getByRole('button', { name: 'Remover avatar' }).click()
    await expect(section.getByRole('img', { name: /Sem avatar/ })).toBeVisible()
  })

  test('altera a senha com validação e entra com a nova', async ({ page }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.ana, '/perfil')
    const form = page.getByRole('region', { name: 'Alterar senha' })

    await form.getByLabel('Senha atual').fill('errada123')
    await form.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await form.getByLabel('Confirmar nova senha').fill('Outra1234')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(form.getByText('As senhas não coincidem.')).toBeVisible()

    await form.getByLabel('Confirmar nova senha').fill('NovaSenha1')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(form.getByText('Senha atual incorreta.')).toBeVisible()
    await expect(form.getByLabel('Senha atual')).toBeFocused()

    await form.getByLabel('Senha atual').fill(USERS.ana.password)
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha alterada.')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/login')
    await fillLogin(page, USERS.ana)
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
      'E-mail ou senha incorretos.',
    )
    await fillLogin(page, { email: USERS.ana.email, password: 'NovaSenha1' })
    await expect(page).toHaveURL(/\/$/)
  })

  test('carteiras: cadastra a secundária com validação e edita a principal', async ({ page }) => {
    await openWithScenario(page, '/')
    await signIn(page, USERS.bruno, '/carteiras')
    const secondary = page.getByRole('region', { name: 'Carteira secundária' })
    await expect(secondary).toContainText('Não cadastrada')

    await secondary.getByLabel('Endereço 0x').fill('0x123')
    await secondary.getByLabel('Nome ENS (opcional)').fill('sem-sufixo')
    await secondary.getByRole('button', { name: 'Cadastrar carteira' }).click()
    await expect(
      secondary.getByText('Informe um endereço 0x com 40 caracteres hexadecimais.'),
    ).toBeVisible()
    await expect(secondary.getByText('Informe um nome ENS terminado em .eth.')).toBeVisible()

    // Same address as the primary wallet: conflict from the API
    await secondary.getByLabel('Endereço 0x').fill('0x7E2d91B0c4A8f5137e2D91b0C4a8F5137E2d91B0')
    await secondary.getByLabel('Nome ENS (opcional)').fill('')
    await secondary.getByRole('button', { name: 'Cadastrar carteira' }).click()
    await expect(secondary.getByText('Este endereço já está na sua outra carteira.')).toBeVisible()

    await secondary.getByLabel('Endereço 0x').fill('0x1111111111111111111111111111111111111111')
    await secondary.getByLabel('Rede').selectOption('polygon')
    await secondary.getByRole('button', { name: 'Cadastrar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.')).toBeVisible()

    const primary = page.getByRole('region', { name: 'Carteira principal' })
    await primary.getByLabel('App da carteira').selectOption('coinbase')
    await primary.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Carteira principal salva.')).toBeVisible()

    await page.reload()
    await expect(secondary.getByLabel('Endereço 0x')).toHaveValue(
      '0x1111111111111111111111111111111111111111',
    )
    await expect(secondary.getByLabel('Rede')).toHaveValue('polygon')
    await expect(primary.getByLabel('App da carteira')).toHaveValue('coinbase')
  })
})
