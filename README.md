# Kurio — NFT Marketplace

Desafio técnico de front-end: marketplace de NFTs em React + TypeScript, com API, sessão, carteiras e
pagamentos simulados por MSW. Enunciado em [`docs/DESAFIO.md`](docs/DESAFIO.md); decisões técnicas em
[`ARCHITECTURE.md`](ARCHITECTURE.md).

> Entrega em fatias verticais. Concluído até agora: **Início** (catálogo completo) e um detalhe mínimo
> do NFT. Próximas fatias: detalhe + favoritos + auth, carrinho, pagamento/confirmação, tempo real,
> perfil/carteiras, acessibilidade e Lighthouse.

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

Os parâmetros podem ser combinados: `/?reset=1&scenario=slow`.

### Como reproduzir os fluxos de falha (Início)

- **Erro e nova tentativa:** abra `/?scenario=server-error`, aguarde a mensagem, abra `/?scenario=default`
  em outra aba (ou apague `kurio:mock-scenario` no localStorage) e clique em **Tentar novamente**.
- **Respostas fora de ordem:** abra `/?scenario=out-of-order` e troque de aba/filtro rapidamente; a
  tela sempre mostra o resultado da última seleção.
- **Skeletons:** `/?scenario=slow`.
- **Vazio:** `/?scenario=empty`, ou uma busca sem resultado (`/?q=zzz`).
- **NFT inexistente:** `/nfts/qualquer-coisa`.

## Credenciais fictícias

Ainda não há autenticação (chega na próxima fatia).

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
