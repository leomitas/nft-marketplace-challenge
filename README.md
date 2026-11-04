# Kurio — NFT Marketplace

Desafio técnico de front-end: marketplace de NFTs em React + TypeScript, com API, sessão, carteiras e
pagamentos simulados por MSW. Enunciado em [`docs/DESAFIO.md`](docs/DESAFIO.md); decisões técnicas em
[`ARCHITECTURE.md`](ARCHITECTURE.md).

Deploy: https://nft-marketplace-challenge-two.vercel.app (build de demonstração com mocks).

Telas: Início, Detalhe do NFT, Carrinho, Pagamento, Confirmação (`/pedidos/:id`), Login, Cadastro,
Perfil e Carteiras — desktop e mobile. Tempo real via Socket.IO simulado no MSW.

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

| Comando                       | O que faz                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `dev:mock`       | Desenvolvimento com mocks (MSW sempre ativo, ver abaixo)                                             |
| `pnpm build`                  | Typecheck + build de produção em `dist/`                                                             |
| `pnpm preview`                | Serve o `dist/` em http://localhost:4173                                                             |
| `pnpm typecheck`              | Verificação de tipos                                                                                 |
| `pnpm lint`                   | ESLint                                                                                               |
| `pnpm format`                 | Prettier                                                                                             |
| `pnpm test:e2e`               | Playwright (build + preview, Chromium desktop 1440 e mobile Pixel 7)                                 |
| `pnpm test:e2e:report`        | Abre o relatório HTML do último run (traces das falhas incluídos)                                    |
| `pnpm test:e2e:update-visual` | Regera as baselines de regressão visual (ver "Regressão visual")                                     |
| `pnpm lighthouse`             | Build + Lighthouse (início e detalhe, mobile e desktop, 3× cada, mediana em `lighthouse/summary.md`) |

## Variáveis de ambiente

| Variável            | Padrão                       | Descrição                                                             |
| ------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | ligado                       | Mocks MSW ficam ativos a menos que seja `false`. Não há backend real. |
| `VITE_API_URL`      | `/api`                       | Base das chamadas REST (interceptadas pelo MSW).                      |
| `VITE_REALTIME_URL` | `https://realtime.kurio.dev` | Socket.IO (interceptado pelo MSW; o host não existe).                 |

Veja `.env.example`. O deploy na Vercel não precisa de nenhuma variável.

## Cenários de mock e reset

Os cenários são escolhidos pela URL e ficam salvos no navegador até serem trocados. Os parâmetros são
removidos da URL logo após o carregamento.

| URL                                | Efeito                                                            |
| ---------------------------------- | ----------------------------------------------------------------- |
| `/?reset=1`                        | Restaura os dados iniciais **e** o cenário padrão                 |
| `/?scenario=default`               | Sucesso, latência curta (120 ms)                                  |
| `/?scenario=empty`                 | Catálogo vazio                                                    |
| `/?scenario=slow`                  | Toda requisição leva 2,5 s (skeletons visíveis)                   |
| `/?scenario=variable-latency`      | Latências variadas em sequência fixa (reprodutível)               |
| `/?scenario=out-of-order`          | Requisições alternam 2 s / 200 ms: respostas chegam fora de ordem |
| `/?scenario=server-error`          | Listagem do catálogo responde 500                                 |
| `/?scenario=network-error`         | Listagem do catálogo falha por conexão                            |
| `/?scenario=flaky-catalog`         | Listagem falha 2× com 503; o retry automático recupera            |
| `/?scenario=favorites-error`       | Favoritar/desfavoritar responde 500 (rollback da UI otimista)     |
| `/?scenario=auth-unavailable`      | Login e cadastro respondem 503                                    |
| `/?scenario=wallet-rejected`       | A carteira recusa a conexão no pagamento                          |
| `/?scenario=payment-refused`       | O pedido é criado, mas o pagamento é recusado pela rede           |
| `/?scenario=order-timeout`         | Pedido criado, 1ª resposta perdida; o retry recupera o mesmo      |
| `/?scenario=checkout-price-change` | Preço do 1º item sobe 0.1 ETH ao confirmar a compra               |
| `/?scenario=checkout-sold-out`     | A edição do 1º item esgota ao confirmar a compra                  |

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
- **Preço alterado / edição esgotada:** com itens no carrinho, mude o servidor simulado pelo console;
  o carrinho atualiza sozinho via Socket.IO (ou use o painel Mocks):
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

### Pagamento e confirmação

Entre como `ana@kurio.dev` (tem carteira principal e de reserva), adicione itens e clique em
**Conectar e finalizar**. Fluxo: dados do colecionador → carteira cadastrada, rede e app da carteira →
**Conectar carteira** → **Confirmar compra** (abre a revisão) → **Confirmar e pagar**. O pedido fica
pendente por ~2,5 s e então é confirmado (recibo) ou recusado.

- **Recusa:** `payment-refused`. Os itens continuam no carrinho; "Tentar novamente" cria um novo pedido.
- **Timeout:** `order-timeout`. O botão fica em "Enviando pedido..." por 5 s, o app reenvia com a
  mesma chave de idempotência e recebe o pedido já criado (um só pedido).
- **Mudança durante a compra:** `checkout-price-change` ou `checkout-sold-out`. A confirmação é
  rejeitada e a revisão mostra a mudança, exigindo aceite antes de confirmar de novo.
- **Carteira recusa:** `wallet-rejected` ao clicar em **Conectar carteira**.
- **Refresh com pedido pendente:** recarregue `/pedidos/:id`; o mesmo pedido é retomado.
- **Sessão expirada no checkout:** **Mocks → Expirar sessão** e clique em qualquer ação; após o login
  você volta ao pagamento com o formulário preservado.

### Tempo real

O painel **Mocks** tem **Alterar preço (Emerald Ape #042)** e **Derrubar/Restaurar socket**. Com o
detalhe do Emerald, o catálogo ou o carrinho aberto, altere o preço: a tela muda sem recarregar e o
carrinho avisa. Para a queda com pedido pendente: confirme uma compra, derrube o socket logo em seguida,
espere alguns segundos e restaure — o pedido é reconciliado via REST e mostra o recibo. Pelo console:
`fetch('/api/__mock/realtime/offline', { method: 'POST' })`, `.../online` e
`.../realtime/replay/emerald-ape-042` (reenvia o último evento duplicado e um mais antigo).

### Perfil e carteiras

- **Conflito no perfil:** como Ana, troque o usuário para `bruno.lima` em `/perfil`.
- **Senha:** informe uma senha atual errada para ver o erro da API; depois de trocar, saia e entre
  com a nova.
- **Carteiras:** como Bruno (só tem a principal), cadastre a secundária em `/carteiras`; usar o mesmo
  endereço da principal gera conflito. As carteiras aparecem no pagamento.

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
  features/      catalog, nft, favorites, auth, cart, checkout, profile
  realtime/      cliente Socket.IO e aplicação dos eventos no cache
  mocks/         MSW: handlers, db persistido, fixtures determinísticas, cenários
  components/    ui (shadcn adaptado) e layout (header, footer, tab bar mobile)
  routes/        TanStack Router (file-based)
e2e/             testes Playwright (+ __screenshots__/ com as baselines visuais)
lighthouse/      resumo e relatórios da auditoria
scripts/         lighthouse.mjs
docs/figma/      tokens, especificação das telas e screenshots de referência
```

## Regressão visual

`e2e/visual.spec.ts` compara início, detalhe, carrinho e pagamento (desktop e mobile) com um único
conjunto de baselines em `e2e/__screenshots__/`, válido para qualquer SO: as fontes são locais
(`@fontsource`) e a tolerância (`maxDiffPixelRatio: 0.03`, em `playwright.config.ts`) absorve diferenças
de anti-aliasing entre Windows, macOS e Linux. Depois de uma mudança visual intencional:

```bash
pnpm test:e2e:update-visual   # regera as 8 imagens
pnpm exec playwright test e2e/visual.spec.ts   # confere
```

Revise as imagens alteradas no diff antes de commitar.

## Uso de IA

O projeto foi desenvolvido com o [Claude Code](https://claude.com/claude-code) como apoio (código,
testes e documentação) e revisado por mim, Leonardo Abreu, que respondo pelas decisões e pela entrega.
