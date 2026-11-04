# Arquitetura

Decisões técnicas, contratos, políticas de cache/sessão/tempo real, limitações e desvios do Figma.

## Stack e versões relevantes

React 19, TypeScript 6, Vite 8, TanStack Router (file-based) e Query 5, Axios, Tailwind CSS 4,
shadcn/ui (Radix), MSW 2, Socket.IO client 4, Playwright, Lighthouse 13, zod 4, big.js.

- **MSW 2 em vez de 3** e **TypeScript 6 em vez de 7**: `@mswjs/socket.io-binding` exige MSW 2 e o
  `typescript-eslint` ainda não suporta TS 7.
- **`cn` (pacote do shadcn-ui)** substitui `clsx` + `tailwind-merge`: é o que a CLI atual do shadcn gera.
- **`allowBuilds: { msw: false }`** em `pnpm-workspace.yaml`: o postinstall do MSW só copia o service
  worker, que já está versionado em `public/`. Ao atualizar o MSW, rode `pnpm exec msw init public`.

## Camadas

```
routes/ ──> features/<x>/components ──> features/<x>/queries (TanStack Query)
                                             └──> api/<recurso>.ts (Axios + parse zod)
                                                       └──> HTTP ──> MSW (mocks/handlers) ──> mocks/db
```

- **Contratos** (`src/api/contracts`): schemas zod são a fonte dos tipos. Toda resposta é validada com
  `.parse`, então uma divergência entre mock e cliente falha alto em vez de corromper o estado.
- **Erros** (`src/api/client.ts`): um interceptor converte erros do Axios em `ApiError` com `kind`
  (`network`, `timeout`, `canceled`, `http`), `status`, `code` e `fields` (erros por campo).
  A UI nunca inspeciona o Axios.
- **Nenhuma resposta fictícia fora de `src/mocks`**: componentes, hooks e Axios só conhecem a API.

## Valores em ETH

Strings decimais em todo o contrato (`ethAmountSchema`). Comparação e ordenação no mock usam `big.js`.
O slider de preço trabalha em **centésimos inteiros de ETH**, convertidos com `big.js`, então a UI nunca
manipula frações em `number`.

## Catálogo (Início)

### Estado na URL

`/` valida `?q, collections, networks, minPrice, maxPrice, sort, tab, page` com zod (`validateSearch`).

- Cada campo tem `.catch(default)`: URL editada à mão nunca quebra a página.
- `stripSearchParams` remove os valores padrão, então `/` é a visão padrão e as URLs ficam curtas.
- Qualquer mudança que não seja de página volta para a página 1 (`useCatalogSearch.update`).
- A busca digitada usa `replace` (não cria uma entrada de histórico por tecla), com debounce de 350 ms.
  Filtros, abas, ordenação e página usam `push`, então voltar/avançar restaura cada passo.
- Arrays usam a serialização padrão do TanStack Router (JSON na query string), que é estável e
  sobrevive a refresh, mas fica menos legível que CSV. Escolhido pela robustez.

### Cache, requisições obsoletas e retries

- Query key = `['catalog', 'list', query]`: cada combinação de parâmetros é uma entrada isolada.
- `queryFn` repassa o `signal` ao Axios. Quando a key muda, o Query aborta a requisição anterior; e,
  mesmo que uma resposta antiga chegasse, ela seria gravada na key antiga, nunca na atual. O teste
  `respostas fora de ordem` cobre isso com o cenário `out-of-order`.
- `placeholderData: keepPreviousData`: ao trocar de página/filtro, a grade anterior fica visível com
  opacidade reduzida e `aria-busy`, em vez de piscar skeleton. Skeleton só na primeira carga.
- O loader da rota faz `prefetchQuery` (sem `await`), então a requisição começa junto com o
  roteamento e no hover dos links (`defaultPreload: 'intent'`) sem bloquear o render.
- `staleTime` 30 s para listagens, 5 min para facetas/destaque.
- **Retry**: só falhas transitórias (rede, timeout, 5xx), até 2 vezes com backoff exponencial (500 ms,
  1 s). 4xx nunca é retentado. Mutations nunca têm retry automático.

### Facetas

As contagens por coleção e rede vêm de `GET /api/nfts/facets`, calculadas sobre o catálogo do mock. Por
isso diferem dos números fixos desenhados no Figma (ex.: "Música (65)"): o layout mostra valores de
exemplo e a implementação mostra dados coerentes com a listagem.

## Contratos REST

| Método | Rota                       | Resposta                                                                        |
| ------ | -------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/nfts`                | `CatalogPage` — `items`, `page`, `pageSize` (9), `total`, `totalPages`          |
| GET    | `/api/nfts/facets`         | `CatalogFacets` — contagens por coleção/rede e faixa de preço                   |
| GET    | `/api/nfts/featured`       | `{ spotlight: NftSummary }`                                                     |
| GET    | `/api/nfts/:id`            | `NftDetail` ou 404 `NOT_FOUND`                                                  |
| GET    | `/api/nfts/:id/reviews`    | `{ items: Review[] }` (carregado ao abrir a aba)                                |
| POST   | `/api/auth/register`       | 201 `{ token, user, expiresAt }`; 422 `VALIDATION`; 409 `CONFLICT` com `fields` |
| POST   | `/api/auth/login`          | `{ token, user, expiresAt }`; 401 `INVALID_CREDENTIALS`                         |
| GET    | `/api/auth/session`        | `{ user, expiresAt }`; 401 `UNAUTHENTICATED` ou `SESSION_EXPIRED`               |
| POST   | `/api/auth/logout`         | 204                                                                             |
| GET    | `/api/me/favorites`        | `{ items: NftSummary[] }` (privado)                                             |
| PUT    | `/api/me/favorites/:nftId` | `{ nftId, favorited: true }` (idempotente)                                      |
| DELETE | `/api/me/favorites/:nftId` | `{ nftId, favorited: false }` (idempotente)                                     |

Query de `/api/nfts`: `q`, `collections` (repetido), `networks` (repetido), `minPrice`, `maxPrice`
(strings decimais), `sort` (`recent|price-asc|price-desc|name`), `tab` (`all|new|trending`), `page`,
`pageSize` (máx. 48). Parâmetros inválidos → 400 `VALIDATION`.

Formato de erro em todas as rotas: `{ "error": { "code", "message", "fields?" } }`.

Rotas privadas exigem `Authorization: Bearer <token>`.

**Edições**: cada NFT é vendido em 4 tiers (`1-1`, `1-10`, `1-50`, `open`), cada um com `priceEth`,
`supply` e `available` próprios (`NftDetail.editionOptions`). O preço do catálogo é o do tier 1/50 (o
selecionado no Figma). `NftSummary.editions` traz os totais somados de todos os tiers; `available === 0`
significa esgotado. `maxPerOrder` (5) limita a quantidade por pedido, além do estoque.

`NftSummary` já traz `version` (inteiro incrementado a cada mudança), usado pelo tempo real para
descartar eventos antigos.

## Sessão e autenticação

- **Token opaco** gerado pelo mock (`crypto.randomUUID`), guardado em `localStorage` (`kurio:auth-token`)
  e enviado pelo interceptor do Axios. É o único dado de auth no navegador: usuário e expiração sempre
  vêm de `GET /auth/session`. TTL de 30 min.
- **Senhas** nunca são armazenadas em claro: o mock guarda `salt` + SHA-256 (WebCrypto). Login com e-mail
  inexistente ou senha errada devolve a mesma mensagem (sem enumeração de contas).
- **Sessão recuperável após refresh**: `sessionQuery` (`['session']`, `staleTime: Infinity`) valida o
  token salvo no boot. Um token que o servidor recusa vira "visitante" em silêncio (header
  `X-Session-Probe`), sem redirecionar quem está numa página pública.
- **Rotas privadas** (`/_authenticated`: `/favoritos`, `/perfil`, e depois checkout/carteiras): o
  `beforeLoad` revalida a sessão no servidor a cada navegação real (`staleTime: 0`; preload por hover
  reaproveita por 10 s). Sem sessão → `/login?redirect=<href completo>`. Se havia sessão (ou o token
  salvo foi recusado como expirado no boot), vai junto `reason=expired` e o login mostra o aviso.
- **Expiração durante uma ação**: qualquer chamada autenticada que receba 401 `SESSION_EXPIRED` ou
  `UNAUTHENTICATED` dispara o `SessionWatcher` (registrado no cliente Axios): encerra a sessão local,
  avisa e navega para o login preservando a URL atual. Só a primeira falha simultânea é tratada.
- **`redirect` seguro**: só caminhos internos (`/...`, nunca `//...`) são aceitos (sem open redirect).
- **Isolamento por usuário**: todo dado privado usa query key `['me', userId, ...]`. Login, logout,
  expiração e troca de usuário removem `['me']` inteiro e reescrevem `['session']`, então nenhum cache
  de um usuário aparece para outro. O teste "troca de usuário" cobre isso.
- **Fechar o modal de login** volta à página anterior (ou à Início em acesso direto). Não usa o
  `redirect`, porque ele pode ser uma página privada que mandaria de volta ao login.

## Favoritos (atualização otimista)

`useToggleFavorite`: `onMutate` cancela as queries de favoritos, guarda o snapshot e aplica a mudança no
cache; `onError` restaura o snapshot e mostra um toast (`aria-live`); `onSettled` invalida para
reconciliar com o servidor. Mutations do mesmo NFT compartilham um `scope`, então cliques rápidos
executam em sequência e não deixam o cache inconsistente. PUT/DELETE são idempotentes no mock.
Visitante que clica em favoritar vai para o login e volta ao mesmo NFT.

## Carrinho e cotação

- **O carrinho vive no servidor simulado**, inclusive o do visitante: ele é identificado por um id
  aleatório (`kurio:cart-id`, enviado como `X-Cart-Id`). Assim refresh, outra aba e o merge no login
  usam a mesma fonte de verdade. Com sessão, o servidor usa o carrinho do usuário e ignora o header.
- **Linha = NFT + tier de edição** (`id = nftId:editionId`). Cada linha guarda o preço aceito
  (`acceptedPriceEth`); a resposta sempre traz o preço atual e `issues` quando algo mudou:
  `PRICE_CHANGED`, `INSUFFICIENT_STOCK`, `SOLD_OUT`. A UI mostra um aviso com a ação para resolver
  (aceitar novos preços, ajustar quantidade, remover). Enquanto houver issue, a cotação vem com
  `purchasable: false`.
- **Merge no login**: logo após login/cadastro, `POST /cart/merge` move o carrinho do visitante para a
  conta (quantidades somadas, limitadas por estoque e por pedido), apaga o carrinho visitante e gera
  um novo id vazio. Depois o cache do carrinho do usuário é invalidado, o que cancela qualquer leitura
  feita antes do merge. Logout mostra um carrinho visitante vazio; o da conta continua no servidor.
- **Cotação** (`GET /cart/quote`): subtotal, desconto, taxa de rede (0.016 ETH estimada por pedido) e
  total calculados no servidor com `big.js`, mais um `id` derivado de linhas, preços e cupom. O
  front-end nunca soma valores; ele exibe a cotação. O checkout envia esse `id` para o
  servidor revalidar.
- **Cache**: carrinho em `['me', userId, 'cart']` (logado) ou `['guest-cart', cartId]` (visitante);
  cotação em `[...cartKey, 'quote']`. Toda mutation devolve o carrinho novo (vai direto para o cache) e
  invalida a cotação. Mutations do carrinho compartilham um `scope`, então cliques rápidos executam em
  ordem. Carrinho e cotação refazem a busca ao voltar o foco para a aba.
- **Quantidade** é limitada por `min(estoque do tier, maxPerOrder)`; se o estoque cair abaixo da
  quantidade da linha, só é possível diminuir.
- **Remover** tem "Desfazer" no toast, que readiciona a mesma linha.
- **Cupons** (validados no servidor): `KURIO10` (10%), `LANCAMENTO` (0.05 ETH acima de 0.5 ETH),
  `GENESIS20` (expirado). Qualquer outro → `COUPON_INVALID`. O erro aparece associado ao campo.

| Método | Rota                      | Observação                                                              |
| ------ | ------------------------- | ----------------------------------------------------------------------- |
| GET    | `/api/cart`               | `Cart` com `lines[].issues` e `itemCount`                               |
| GET    | `/api/cart/quote`         | `Quote` (`id`, valores, `purchasable`, `expiresAt`)                     |
| POST   | `/api/cart/items`         | `{ nftId, editionId, quantity }`; 409 `INSUFFICIENT_STOCK`              |
| PATCH  | `/api/cart/items/:lineId` | `{ quantity }`; reduzir é sempre permitido                              |
| DELETE | `/api/cart/items/:lineId` | idempotente                                                             |
| POST   | `/api/cart/acknowledge`   | aceita os preços atuais de todas as linhas                              |
| PUT    | `/api/cart/coupon`        | `{ code }`; 422 `COUPON_INVALID`/`COUPON_EXPIRED`/`COUPON_MIN_SUBTOTAL` |
| DELETE | `/api/cart/coupon`        | remove o cupom                                                          |
| POST   | `/api/cart/merge`         | privado; usa `X-Cart-Id` do visitante                                   |

## Pagamento e pedidos

- **Carteiras**: vêm de `GET /api/me/wallets` (fixtures: Ana tem principal + reserva, Bruno só
  principal). A conexão é simulada no servidor (`PUT/DELETE /api/me/wallet-connection`), por usuário,
  e vale para a combinação carteira + app (MetaMask/WalletConnect/Coinbase) + rede. Trocar qualquer um
  exige conectar de novo; logout desconecta.
- **Revisão**: "Confirmar compra" valida o formulário (zod compartilhado com o mock) e abre um diálogo
  com tudo o que será enviado e a cotação atual. O pedido leva o `quoteId` que o usuário viu. Se a
  cotação muda com o diálogo aberto (ou o servidor rejeita), o botão de pagar fica bloqueado até o usuário
  aceitar os novos valores.
- **Revalidação no servidor** (`POST /api/orders`): carrinho não vazio, carteira conectada,
  `purchasable` (sem preço alterado/estoque) e `quoteId` igual à cotação atual. Caso contrário 409
  (`CART_EMPTY`, `WALLET_NOT_CONNECTED`, `CART_HAS_ISSUES`, `QUOTE_OUTDATED`).
- **Idempotência**: o header `Idempotency-Key` é derivado do conteúdo do pedido e guardado em
  `sessionStorage` (por usuário): cliques repetidos, retry após timeout e reload reenviam a mesma chave.
  Mesma chave + mesmo corpo → o servidor devolve o pedido existente (200, `Idempotent-Replayed`);
  mesma chave + corpo diferente → 409 `IDEMPOTENCY_CONFLICT`. Um pedido recusado descarta a chave
  (tentar de novo é um pedido novo). Diferente das outras mutations, a criação de pedido faz **1 retry
  automático** em falha transitória, seguro justamente pela chave. Timeout da criação: 5 s.
- **Estados**: `pending` → `confirmed | refused` (terminais). O mock decide o desfecho na criação
  (cenário) e liquida após 2,5 s, de forma preguiçosa a cada leitura do pedido, então refresh/reabertura
  sempre veem o estado real. A página `/pedidos/:id` é atualizada pelo `order.updated` (Socket.IO;
  ver "Tempo real"), sem polling. A confirmação só aparece com
  `status === 'confirmed'` vindo da API.
- **Efeitos da confirmação** (no servidor): baixa o estoque das edições, incrementa `version` dos NFTs
  e remove do carrinho apenas as quantidades compradas. Se o estoque acabou entre a criação e a
  liquidação, o pedido é recusado. Recusa não altera carrinho nem estoque.
- **Recibo = snapshot**: o pedido guarda nome, imagem, edição, preço unitário, totais, carteira e rede
  no momento da compra; nada é relido do catálogo.
- **Rascunho**: o formulário fica em `sessionStorage` por usuário, então expirar a sessão (login e
  volta) ou recarregar não perde o que foi digitado. É apagado ao confirmar o pedido e no logout.
- **Isolamento**: pedido de outro usuário → 403 `FORBIDDEN` (a tela mostra "Pedido não encontrado").

| Método | Rota                        | Observação                                                     |
| ------ | --------------------------- | -------------------------------------------------------------- |
| GET    | `/api/me/wallets`           | `{ items: Wallet[] }`                                          |
| GET    | `/api/me/wallet-connection` | `{ connection: WalletConnection \| null }`                     |
| PUT    | `/api/me/wallet-connection` | `{ walletId, provider, network }`; 409 `WALLET_REJECTED`       |
| DELETE | `/api/me/wallet-connection` | `{ connection: null }`                                         |
| POST   | `/api/orders`               | header `Idempotency-Key`; corpo `CreateOrder`; 201/200 `Order` |
| GET    | `/api/orders`               | `{ items: Order[] }` do usuário                                |
| GET    | `/api/orders/:id`           | `Order`; 404 `NOT_FOUND`; 403 `FORBIDDEN`                      |

## Tempo real (Socket.IO)

- **Transporte**: `socket.io-client` real, conectado a `VITE_REALTIME_URL` (padrão
  `https://realtime.kurio.dev`, endereço que só existe dentro do mock). O MSW intercepta o WebSocket
  (`ws.link`) e o `@mswjs/socket.io-binding` fala o protocolo Socket.IO (handshake, heartbeat,
  pacotes). O cliente usa `transports: ['websocket']`, porque o MSW não intercepta long-polling.
- **Limitações do ambiente de mocks**: o binding (0.2) suporta só o namespace padrão e eventos de
  texto (sem acks, sem binário). O "servidor" vive na própria aba: cada aba tem o seu, e um reload
  recria as conexões. O `socket.io-client` é importado sob demanda, depois de o MSW instalar o
  interceptador, porque o engine.io guarda a referência de `WebSocket` ao carregar o módulo.
- **Eventos** (`src/api/contracts/realtime.ts`), todos com `eventId` estável (`<recurso>:<id>:v<versão>`),
  `resource`, `id` e `version`:

| Evento          | Payload                                         | Efeito no cliente                                                      |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `nft.updated`   | `{ summary: NftSummary, editionOptions }`       | Atualiza detalhe, listas e destaque no cache; refaz carrinho e cotação |
| `order.updated` | `Order` completo + `userId` do dono             | Atualiza o pedido no cache (pendente → confirmado/recusado)            |
| `session.join`  | cliente → servidor: token da sessão (ou `null`) | Vincula a conexão ao usuário; `order.updated` só vai para o dono       |

- **Origem dos eventos**: toda mudança do servidor simulado gera o evento correspondente — controles
  de preço/estoque, cenários de checkout, liquidação do pedido (que também emite `nft.updated` pela baixa
  de estoque). REST e eventos leem o mesmo banco.
- **Duplicados e antigos**: um filtro por conexão descarta `eventId` já visto e versões menores ou
  iguais à última aplicada; além disso o cache só é sobrescrito se a versão do evento for maior que a
  do dado em cache (um refetch REST mais novo nunca é regredido).
- **Reconexão**: ao reconectar, todas as queries ativas (menos a sessão) são invalidadas e refeitas
  via REST, recuperando o que foi perdido enquanto o socket estava fora. Um aviso "Tempo real
  desconectado. Reconectando..." (`role=status`) aparece durante a queda. Tentativas de conexão sem
  resposta expiram em 3 s e são refeitas (backoff 0,5–2 s). Na primeira conexão só os pedidos são
  revalidados (um pendente pode ter sido liquidado entre o GET e o `session.join`); o resto acabou de
  ser carregado e refazê-lo dobraria as requisições iniciais.
- **Pedido pendente**: não há polling; o `order.updated` leva o pedido ao estado final. Se o evento
  se perde (socket fora, reload), a reconexão ou a nova leitura buscam o estado real — o mock liquida o
  pedido de forma preguiçosa na leitura e reagenda os pendentes ao recarregar.
- **Isolamento**: o servidor só envia `order.updated` às conexões vinculadas ao dono; o cliente
  ainda descarta eventos cujo `userId` não é o usuário atual. Login, logout ou troca de usuário
  reenviam `session.join` e zeram o filtro de eventos. Ao desmontar, listeners são removidos e o socket
  é desconectado.
- **Avisos acessíveis**: mudança de preço/estoque de um item do carrinho gera um toast (região
  `aria-live`) e o aviso "Seu carrinho mudou" do carrinho/checkout.

## Perfil e carteiras

Sem frame no Figma: as telas seguem a linguagem do pagamento (cards `surface-card`, labels acima dos
campos, ações laranja) e funcionam em uma coluna no mobile.

- **Perfil** (`/perfil`): nome, usuário e e-mail (conflito de usuário/e-mail vem da API como 409 com
  `fields`), avatar e troca de senha. O usuário retornado pelas mutations atualiza o cache da sessão,
  então cabeçalho e menus refletem a mudança sem refetch.
- **Avatar**: arquivo PNG/JPG/WebP até 200 KB, validado no cliente e de novo no mock. Trafega como
  data URL (não há serviço de upload) e fica persistido no banco simulado.
- **Senha**: exige a senha atual; o mock grava apenas um novo salt + hash SHA-256.
- **Carteiras** (`/carteiras`): uma principal e uma secundária por usuário (`PUT /api/me/wallets/:role`
  cria ou atualiza). Endereço 0x de 40 hex, ENS opcional terminado em `.eth`, rede e app. O mesmo
  endereço nas duas → 409. Editar a carteira conectada no checkout derruba essa conexão.
- Exclusão de carteira ficou de fora (o enunciado pede cadastro e edição).

| Método | Rota                    | Observação                                                          |
| ------ | ----------------------- | ------------------------------------------------------------------- |
| GET    | `/api/me/profile`       | `User`                                                              |
| PATCH  | `/api/me/profile`       | `{ name, username, email }`; 422 `VALIDATION`; 409 `CONFLICT`       |
| PUT    | `/api/me/avatar`        | `{ dataUrl }`; 422 com `fields.avatar`                              |
| DELETE | `/api/me/avatar`        | `User` sem avatar                                                   |
| POST   | `/api/me/password`      | `{ currentPassword, newPassword }`; 204; 422 `INVALID_PASSWORD`     |
| PUT    | `/api/me/wallets/:role` | `primary`/`secondary`; `{ label, address, ens, network, provider }` |

## Mocks

- **Ativação**: `VITE_ENABLE_MOCKS` (padrão ligado; só `false` desliga). Como não há backend real, o
  build de demonstração/deploy sempre sobe com mocks. O app só renderiza depois que o worker está ativo.
- **Banco** (`src/mocks/db.ts`): estado em memória persistido em `localStorage` (`kurio:mock-db`), com
  versão. Mudança de versão descarta dados antigos. `?reset=1` volta às fixtures e ao cenário padrão.
- **Fixtures** (`src/mocks/fixtures/nfts.ts`): 60 NFTs. Os 8 primeiros são os desenhados no Figma, na
  mesma ordem; os demais são gerados por um PRNG com semente fixa e relógio fixo (`FIXTURE_NOW`), então
  o catálogo é idêntico em toda execução. Há itens raros, esgotados, com preço anterior e edições
  variadas, para exercitar filtros, paginação checkout e tempo real.
- **Cenários** (`src/mocks/scenarios.ts`): latência e falhas determinísticas (sem `Math.random`).
  Lista e uso no README. Os testes usam os mesmos ids.
- **Controles** (`src/mocks/handlers/control.ts`): `POST /api/__mock/scenario/:id`,
  `/sessions/expire`, `/reset`, `/nfts/:id/price` (`{ priceEth }`) e `/nfts/:id/stock`
  (`{ editionId, available }`). Usados pelo painel de mocks (raiz React própria, carregada depois do
  primeiro render e oculta em navegadores automatizados) e pelos testes.
- **Usuários** (`fixtures/users.ts`): Ana (2 favoritos) e Bruno, com hashes pré-calculados.
- **Avaliações** geradas por NFT com PRNG determinístico; a média é calculada a partir delas.
- **Router criado depois dos controles de mock**: `?scenario`/`?reset` são removidos da URL antes de o
  router ler a localização, evitando uma navegação extra que abortava a primeira requisição.

## Testes (Playwright)

- `pnpm test:e2e` faz o build de produção e roda contra o `preview`, igual ao deploy.
- Projetos: `desktop` (Chromium 1440×900) e `mobile` (Pixel 7).
- Cada teste tem contexto próprio (localStorage vazio) e abre com `?reset=1&scenario=<id>`.
- A troca de cenário e a expiração da sessão no meio de um teste usam os endpoints de controle do mock
  (ou a chave `kurio:mock-scenario`, a mesma usada por `?scenario=`). A UI nunca é manipulada
  diretamente.
- Traces e screenshots só em falha; relatório HTML em `playwright-report/`.
- Specs: `catalog`, `nft-detail`, `auth`, `cart`, `checkout`, `realtime`, `profile`, `a11y` e `visual`,
  cobrindo os 12 itens da seção 9 do enunciado. Os de tempo real passam pelo `socket.io-client` (os
  eventos são disparados pelos endpoints de controle do mock, nunca pela UI) e esperam o socket conectar
  (`html[data-realtime="online"]`) antes de mudar o servidor.
- **Regressão visual** (`visual.spec.ts`): início, detalhe, carrinho e pagamento, página inteira, nos
  dois projetos, com fixtures determinísticas, animações desligadas e imagens forçadas a carregar.
  As baselines (`e2e/visual.spec.ts-snapshots/`) foram geradas no Windows; em outro SO a renderização
  de fontes muda, então gere as do SO com `pnpm test:e2e:update-visual`.
- **Tempo**: o relógio não é congelado; os cenários sensíveis a tempo usam atrasos fixos do mock
  (liquidação em 2,5 s, timeout de 5 s na criação do pedido) e o disparo dos eventos é controlado
  pelos endpoints de controle. `page.clock` ficou de fora para não interferir no heartbeat do Socket.IO.
- **Estabilidade**: `openWithScenario` espera o mock aplicar `?scenario`/`?reset` antes de seguir
  (sem isso, uma navegação imediata perdia o cenário em execuções paralelas).

## Lighthouse

`pnpm lighthouse` faz o build e roda `scripts/lighthouse.mjs`: `vite preview` com mocks no cenário
padrão, Início (`/`) e Detalhe (`/nfts/emerald-ape-042`), perfis mobile (padrão do Lighthouse) e desktop
(`--preset=desktop`), 3 execuções cada, mediana por categoria e métrica. Saída versionada:
`lighthouse/summary.md` (tabela + ambiente), `lighthouse/summary.json` (todas as execuções) e o
HTML/JSON da execução mediana em `lighthouse/reports/`. Usa o Lighthouse 13 do projeto e o Chromium
do Playwright (ou `CHROME_PATH`).

Resultado (mediana, ver `lighthouse/summary.md` para o ambiente):

| Página  | Perfil  | Perf. | A11y | Best Pr. | SEO |     LCP |   CLS |    TBT |
| ------- | ------- | ----: | ---: | -------: | --: | ------: | ----: | -----: |
| Início  | mobile  |    74 |  100 |      100 | 100 | 4613 ms | 0.016 | 391 ms |
| Início  | desktop |    99 |  100 |      100 | 100 | 1011 ms | 0.002 |   1 ms |
| Detalhe | mobile  |    72 |  100 |      100 | 100 | 4730 ms | 0.000 | 436 ms |
| Detalhe | desktop |    97 |  100 |      100 | 100 | 1205 ms | 0.007 |  14 ms |

**Abaixo da meta: Performance mobile (72–74, meta 90).** Causa principal identificada nos relatórios:
o app só pode renderizar depois que o service worker do MSW está ativo (senão as primeiras requisições
escapariam do mock). O chunk do MSW (`browser-*.js`, ~163 KB transferidos) é o maior script da página
e o que mais consome CPU no boot (~600 ms de 1,4 s de bootup com CPU 4× mais lenta). Somado ao app
(~250 KB), o LCP mobile fica em ~4,6 s, quase todo como "element render delay". Em produção real (API
de verdade, sem MSW no navegador) esse custo não existiria. O enunciado pede a auditoria com os mocks e
sem simplificações exclusivas para a nota, então não foi removido.

Melhorias feitas durante a auditoria:

- mocks e app passaram a ser baixados em paralelo (`src/main.tsx`), em vez de em sequência;
- CLS do detalhe desktop de 0,37 → ~0: a imagem principal da galeria ganhou largura explícita, e o
  `main` tem altura mínima de uma tela para o rodapé não "pular" quando o conteúdo chega;
- `favicon.svg` (o 404 do `/favicon.ico` derrubava Best Practices) e `robots.txt` (o rewrite da SPA
  devolvia o HTML e derrubava SEO);
- pontos do carrossel com área de toque de 24 px (target size).

Não feito por falta de tempo: pré-render de um shell estático no `index.html` (LCP mais cedo) e
divisão do chunk do MSW por recurso.

## UX, acessibilidade e desvios do Figma

- **Assets**: os SVGs e as 4 artes vêm do Figma. As artes (PNG 1254 px, ~2 MB cada) foram convertidas
  para WebP 480/960 px (15–65 KB), servidas com `srcset`. O export do fundo do hero veio vazio; o fundo é
  `surface-card` em CSS, como no layout. Ícones de seta/chevron do Figma apontam para baixo e são
  rotacionados como no design.
- **Fonte**: Roboto Mono Variable servida localmente via `@fontsource-variable/roboto-mono`.
- **Itens fora do escopo** (Criadores, Aprenda, blog "Ler mais", links institucionais do rodapé, redes
  sociais, botão central de scan no mobile): aparecem como no layout, mas sem link, com `title` e texto
  para leitores de tela "(disponível em breve)". A newsletter valida o e-mail e informa que não está
  disponível, sem simular sucesso.
- **"Conectar e finalizar"** leva ao pagamento; fica indisponível (`aria-disabled`) enquanto o carrinho tem avisos.
- **Checkbox dos filtros**: o Figma indica seleção só pela cor; foi adicionado um marcador com ✓
  (estado não depende só de cor). O input nativo fica acessível (`sr-only`) com foco visível.
- **Preço anterior** aparece riscado (o Figma usa só cor) e tem rótulo "Preço anterior" para leitores
  de tela.
- **Slider de preço**: no Figma a trilha inteira é `primary`; a parte não selecionada usa `primary` a
  30% para indicar a faixa. Cada thumb tem nome ("Preço mínimo/máximo") e valor falado em ETH. O texto
  usa ponto decimal (como os preços dos cards) em vez da vírgula do Figma, para manter um único formato.
- **Abas do catálogo** usam `aria-pressed` (filtros de alternância, não abas com painéis).
- **Mobile**: grade de 2 colunas com a coluna direita deslocada 32 px, como no frame. Abaixo de 1024 px a
  sidebar vira um drawer (Radix Dialog: foco preso e devolvido ao gatilho, `Esc` fecha). Entre 768 e
  1024 px usa-se o header desktop com o drawer de filtros. Em telas menores que 414 px (largura do frame)
  a arte do hero mobile encolhe e o título pode quebrar em 3 linhas.
- **Skeleton com shimmer** preserva as dimensões dos cards (sem layout shift) e vira bloco estático com
  `prefers-reduced-motion`.
- **Favorito no card mobile**: coração do frame mobile, acima do link do card. No desktop o Figma não
  mostra o coração no card; favoritar fica no detalhe.

### Detalhe do NFT

- **Galeria**: o Figma repete a mesma arte nas 4 miniaturas. Aqui são 4 vistas da mesma obra (completa e
  três aproximações por `object-position` + `scale`), cada uma com `alt` próprio. A lupa abre a imagem
  num diálogo (foco preso e devolvido).
- **Edições** são radios nativos (setas do teclado, um único tab stop) estilizados como os chips; tiers
  esgotados ficam desabilitados e riscados. A edição escolhida vai para a URL (`?edition=`). Cada
  seletor (desktop e mobile coexistem no DOM) tem nome de grupo próprio.
- **Quantidade**: inteiro entre 1 e `min(estoque do tier, maxPerOrder)`. O motivo do limite aparece ao
  lado do botão "+" desabilitado.
- **Preço**: o desktop mostra o preço unitário do tier; a barra de compra mobile mostra o total
  (unitário × quantidade, com `big.js`). A cotação oficial vem da API no checkout.
- **Compartilhar** usa links reais (LinkedIn, e-mail, X) em nova aba.
- **"Mais desta coleção"**: carrossel com scroll-snap; os pontos refletem e controlam a posição.
- **Mobile**: o frame não tem tab bar (tem barra de compra fixa); a rota usa `staticData.hideTabBar`.
- **Estado "favoritado"**: o Figma só desenha o coração vazado; o preenchido usa a forma do coração da
  tab bar, e o botão desktop troca o texto para "Favoritado" (`aria-pressed`).

### Login e cadastro

- **Desktop**: modal de 500 px sobre a página (como nos frames, com faixa `primary` na base);
  **mobile**: tela cheia com a marca grande. O mesmo Radix Dialog cobre os dois, com foco inicial no
  primeiro campo.
- Os campos do layout só têm placeholder; cada um tem `<label>` acessível (`sr-only`), erro associado
  via `aria-describedby` + `aria-invalid` e foco no primeiro campo inválido.
- **Mostrar senha**: o Figma desenha só o olho riscado; o estado "visível" usa um olho aberto.
- **Login social e "Esqueceu a senha?"** estão fora do escopo: aparecem desabilitados/indisponíveis.
- **Header logado**: o layout não tem esse estado. O botão "Entrar" vira o primeiro nome do usuário, com
  menu (Perfil, Favoritos, Sair). Carteiras também está no menu.
- **Toasts** (Sonner) ficam embaixo, acima da tab bar e da barra de compra no mobile, para não cobrir
  ações.

### Carrinho

- **Tabela desktop**: a coluna "Edições" do Figma é o seletor de quantidade (como no layout). Como as
  linhas são por tier, cada item também mostra "Edição 1/50" abaixo do ID do token.
- **Mobile**: cards com miniatura e o painel de resumo fixo embaixo, como no frame. Os botões −/+ são
  os círculos escuros do frame; o carrossel "Colecionadores também viram" fica só no desktop (no mobile
  o rodapé é ocupado pelo resumo). O frame mostra a lixeira sobreposta ao stepper; aqui ela fica no topo
  do card para não competir com o "+".
- **Badge do carrinho** = soma das quantidades (o Figma mostra um número fixo).
- **Desconto sem cupom**: o Figma mostra "(-) 00.00"; aqui é "(-) 0.00 ETH", no mesmo formato dos
  demais valores. Valores com mais de 2 casas (taxa, total) aparecem com a precisão da API (até 6).

### Pagamento e confirmação

- **Endereço da carteira, ENS, "Tipo de carteira" e "Usar outra carteira?"** do frame desktop viraram
  a escolha entre as **carteiras cadastradas** (cards como no frame mobile), porque o enunciado pede
  usar as carteiras do perfil. "Nome do perfil" e "Nome ENS" saíram (o ENS vem da carteira).
- **Código de indicação** aparece como opcional (o Figma marca obrigatório, mas não há regra para ele).
- **"Carteira e rede"**: os três apps do Figma são radios; a rede é um select. Há um botão explícito
  "Conectar carteira" (estado conectado/desconectado/recusado) que o Figma não desenha.
- **Revisão** é um diálogo (não há frame); o CTA "Confirmar compra" do Figma abre a revisão e o
  pagamento é enviado por "Confirmar e pagar".
- **Confirmação**: o Figma desenha um modal sobre a página; aqui é uma página `/pedidos/:id` com o mesmo
  card (recarregável e com URL própria). No mobile, o mesmo card ocupa a largura. Estados pendente e
  recusado seguem o mesmo card. "Ver no Etherscan" abre um link simulado.
- Ícones dos apps de carteira usam a letra inicial (como o "W" do frame mobile) em vez de logos de marca.
