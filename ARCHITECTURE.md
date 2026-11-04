# Arquitetura

Documento vivo: cada fatia acrescenta suas decisões. Estado atual: **Início + detalhe mínimo**.

## Stack e versões relevantes

React 19, TypeScript 6, Vite 8, TanStack Router (file-based) e Query 5, Axios, Tailwind CSS 4,
shadcn/ui (Radix), MSW 2, Playwright, Lighthouse CI, zod 4, big.js.

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

## Contratos REST (até agora)

| Método | Rota                 | Resposta                                                               |
| ------ | -------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/nfts`          | `CatalogPage` — `items`, `page`, `pageSize` (9), `total`, `totalPages` |
| GET    | `/api/nfts/facets`   | `CatalogFacets` — contagens por coleção/rede e faixa de preço          |
| GET    | `/api/nfts/featured` | `{ spotlight: NftSummary }`                                            |
| GET    | `/api/nfts/:id`      | `NftDetail` ou 404 `NOT_FOUND`                                         |

Query de `/api/nfts`: `q`, `collections` (repetido), `networks` (repetido), `minPrice`, `maxPrice`
(strings decimais), `sort` (`recent|price-asc|price-desc|name`), `tab` (`all|new|trending`), `page`,
`pageSize` (máx. 48). Parâmetros inválidos → 400 `VALIDATION`.

Formato de erro em todas as rotas: `{ "error": { "code", "message", "fields?" } }`.

`NftSummary` já traz `version` (inteiro incrementado a cada mudança), usado na fatia de tempo real para
descartar eventos antigos.

## Mocks

- **Ativação**: `VITE_ENABLE_MOCKS` (padrão ligado; só `false` desliga). Como não há backend real, o
  build de demonstração/deploy sempre sobe com mocks. O app só renderiza depois que o worker está ativo.
- **Banco** (`src/mocks/db.ts`): estado em memória persistido em `localStorage` (`kurio:mock-db`), com
  versão. Mudança de versão descarta dados antigos. `?reset=1` volta às fixtures e ao cenário padrão.
- **Fixtures** (`src/mocks/fixtures/nfts.ts`): 60 NFTs. Os 8 primeiros são os desenhados no Figma, na
  mesma ordem; os demais são gerados por um PRNG com semente fixa e relógio fixo (`FIXTURE_NOW`), então
  o catálogo é idêntico em toda execução. Há itens raros, esgotados, com preço anterior e edições
  variadas, para exercitar filtros, paginação e as próximas fatias.
- **Cenários** (`src/mocks/scenarios.ts`): latência e falhas determinísticas (sem `Math.random`).
  Lista e uso no README. Os testes usam os mesmos ids.
- **Router criado depois dos controles de mock**: `?scenario`/`?reset` são removidos da URL antes de o
  router ler a localização, evitando uma navegação extra que abortava a primeira requisição.

## Testes (Playwright)

- `pnpm test:e2e` faz o build de produção e roda contra o `preview`, igual ao deploy.
- Projetos: `desktop` (Chromium 1440×900) e `mobile` (Pixel 7).
- Cada teste tem contexto próprio (localStorage vazio) e abre com `?reset=1&scenario=<id>`.
- A troca de cenário no meio de um teste escreve na chave do mock (`kurio:mock-scenario`), a mesma usada
  por `?scenario=`. A UI nunca é manipulada diretamente.
- Traces e screenshots só em falha; relatório HTML em `playwright-report/`.

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
- **Carrinho, Entrar, Favoritos e Perfil** no header/tab bar ficam visivelmente indisponíveis até as
  fatias correspondentes.
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
- **Favorito no card mobile**: o frame mostra um coração no card; ele chega com a fatia de favoritos
  (requer login).
