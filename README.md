# Kurio — NFT Marketplace

Desafio técnico de front-end: marketplace de NFTs em React + TypeScript, com API, sessão, carteiras e
pagamentos simulados por MSW. Enunciado em [`docs/DESAFIO.md`](docs/DESAFIO.md); decisões técnicas em
[`ARCHITECTURE.md`](ARCHITECTURE.md).

> Entrega em fatias verticais. Concluído até agora: **Início** (catálogo completo), **Detalhe do NFT**
> (galeria, edições, quantidade, avaliações), **favoritos** com atualização otimista e **conta**
> (cadastro, login, sessão, logout, expiração, rotas privadas) e **carrinho** (quantidades, cupom,
> cotação da API, mudanças de preço/estoque, merge do visitante no login). Próximas fatias:
> pagamento/confirmação, tempo real, perfil/carteiras, acessibilidade e Lighthouse.

## Requisitos

- Node.js 22+ (desenvolvido com Node 24)
- pnpm 12 (`corepack enable` ou `npm i -g pnpm`)

Nenhum serviço externo é necessário: toda a API roda no navegador via MSW.

## Setup

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

## Comandos

| Comando                 | O que faz                                                            |
| ----------------------- | -------------------------------------------------------------------- |
| `pnpm dev` / `dev:mock` | Desenvolvimento com mocks (MSW sempre ativo, ver abaixo)             |
| `pnpm build`            | Typecheck + build de produção em `dist/`                             |
| `pnpm preview`          | Serve o `dist/` em http://localhost:4173                             |
| `pnpm typecheck`        | Verificação de tipos                                                 |
| `pnpm lint`             | ESLint                                                               |
| `pnpm format`           | Prettier                                                             |
| `pnpm test:e2e`         | Playwright (build + preview, Chromium desktop 1440 e mobile Pixel 7) |
| `pnpm test:e2e:report`  | Abre o relatório HTML do último run (traces das falhas incluídos)    |
| `pnpm lighthouse`       | Build + Lighthouse CI (3 execuções)                                  |

## Variáveis de ambiente

| Variável            | Padrão | Descrição                                                             |
| ------------------- | ------ | --------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | ligado | Mocks MSW ficam ativos a menos que seja `false`. Não há backend real. |
| `VITE_API_URL`      | `/api` | Base das chamadas REST (interceptadas pelo MSW).                      |

Veja `.env.example`. O deploy na Vercel não precisa de nenhuma variável.

## Cenários de mock e reset

Os cenários são escolhidos pela URL e ficam salvos no navegador até serem trocados. Os parâmetros são
removidos da URL logo após o carregamento.

| URL                           | Efeito                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| `/?reset=1`                   | Restaura os dados iniciais **e** o cenário padrão                 |
| `/?scenario=default`          | Sucesso, latência curta (120 ms)                                  |
| `/?scenario=empty`            | Catálogo vazio                                                    |
| `/?scenario=slow`             | Toda requisição leva 2,5 s (skeletons visíveis)                   |
| `/?scenario=variable-latency` | Latências variadas em sequência fixa (reprodutível)               |
| `/?scenario=out-of-order`     | Requisições alternam 2 s / 200 ms: respostas chegam fora de ordem |
| `/?scenario=server-error`     | Listagem do catálogo responde 500                                 |
| `/?scenario=network-error`    | Listagem do catálogo falha por conexão                            |
| `/?scenario=flaky-catalog`    | Listagem falha 2× com 503; o retry automático recupera            |
| `/?scenario=favorites-error`  | Favoritar/desfavoritar responde 500 (rollback da UI otimista)     |
| `/?scenario=auth-unavailable` | Login e cadastro respondem 503                                    |

Os parâmetros podem ser combinados: `/?reset=1&scenario=slow`.

**Painel de mocks:** no canto inferior esquerdo há um botão **Mocks** (só existe com MSW ativo) para trocar
o cenário, **expirar a sessão** no servidor simulado e resetar os dados. Ele usa os mesmos endpoints de
controle que os testes: `POST /api/__mock/scenario/:id`, `POST /api/__mock/sessions/expire` e
`POST /api/__mock/reset`.

### Como reproduzir os fluxos de falha (Início)

- **Erro e nova tentativa:** abra `/?scenario=server-error`, aguarde a mensagem, abra `/?scenario=default`
  em outra aba (ou apague `kurio:mock-scenario` no localStorage) e clique em **Tentar novamente**.
- **Respostas fora de ordem:** abra `/?scenario=out-of-order` e troque de aba/filtro rapidamente; a
  tela sempre mostra o resultado da última seleção.
- **Skeletons:** `/?scenario=slow`.
- **Vazio:** `/?scenario=empty`, ou uma busca sem resultado (`/?q=zzz`).
- **NFT inexistente:** `/nfts/qualquer-coisa`.

### Carrinho

- **Cupons:** `KURIO10` (10%), `LANCAMENTO` (0.05 ETH em compras acima de 0.5 ETH), `GENESIS20`
  (expirado) e qualquer outro código (inválido).
- **Preço alterado / edição esgotada:** com itens no carrinho, mude o servidor simulado pelo console e
  recarregue (o tempo real chega na fatia 5):
  `fetch('/api/__mock/nfts/emerald-ape-042/price', { method: 'POST', body: JSON.stringify({ priceEth: '1.49' }) })`
  ou `.../stock` com `{ "editionId": "1-50", "available": 0 }`. O carrinho mostra o aviso e a ação.
- **Carrinho do visitante no login:** adicione itens sem estar logado e entre; os itens vão para a conta.

### Conta, sessão e favoritos

- **Conflito de cadastro:** em `/cadastro`, use o e-mail `ana@kurio.dev` (já existe) ou o usuário `ana.souza`.
- **Sessão expirada:** entre, abra o painel **Mocks → Expirar sessão** e navegue para `/favoritos` ou
  `/perfil` (ou clique em favoritar). O app leva ao login com o aviso de sessão expirada e, após entrar,
  volta exatamente para a página anterior.
- **Rollback de favorito:** entre, selecione o cenário `favorites-error` e clique em favoritar: o coração
  muda na hora e volta ao estado anterior com uma mensagem.
- **Troca de usuário:** entre como Ana (tem 2 favoritos), saia e entre como Bruno: nenhum dado da Ana
  aparece.

## Credenciais fictícias

| Usuário    | E-mail            | Senha        | Observação             |
| ---------- | ----------------- | ------------ | ---------------------- |
| Ana Souza  | `ana@kurio.dev`   | `Kurio@2026` | começa com 2 favoritos |
| Bruno Lima | `bruno@kurio.dev` | `Kurio@2026` | sem favoritos          |

As senhas existem no mock apenas como hash SHA-256 com salt; novas contas podem ser criadas em `/cadastro`.

## Estrutura

```
src/
  api/           client Axios, contratos (zod) e funções por recurso
  features/      catalog (e as próximas: nft, cart, checkout, auth, profile, wallets, realtime)
  mocks/         MSW: handlers, db persistido, fixtures determinísticas, cenários
  components/    ui (shadcn adaptado) e layout (header, footer, tab bar mobile)
  routes/        TanStack Router (file-based)
e2e/             testes Playwright
docs/figma/      tokens, especificação das telas e screenshots de referência
```
