# Tokens do Figma

Fonte: `get_variable_defs` no frame `2:2` (Desktop / Início), arquivo `NazSrucLfQl98EAhi08HZK`.
Extraído em 2026-11-04. O arquivo só define variáveis de cor e tipografia; espaçamentos e raios
serão levantados por tela (ver `docs/figma/<tela>.md`).

## Cores

Tema único, escuro (marrom/âmbar).

| Variável Figma              | Hex       | Uso provável                        |
| --------------------------- | --------- | ----------------------------------- |
| `color/ink`                 | `#140D0A` | fundo da página                     |
| `color/surface-card`        | `#241612` | cards, painéis                      |
| `color/surface-dark`        | `#38220F` | superfícies destacadas              |
| `color/border`              | `#3F2319` | bordas                              |
| `color/border-soft`         | `#55321F` | bordas suaves / divisores           |
| `color/primary`             | `#D28A4C` | botões primários, destaques         |
| `color/secondary`           | `#B39463` | ações secundárias                   |
| `color/text-accent`         | `#E89B55` | texto de destaque (preços, links)   |
| `color/text-primary`        | `#F7F3EC` | texto principal                     |
| `color/foreground`          | `#F5F1EB` | texto sobre superfícies             |
| `color/text-secondary`      | `#CFB28C` | texto secundário                    |
| `color/background-elevated` | `#FBFBFB` | superfícies claras (inputs/modais?) |

> Existem duplicatas com outra nomenclatura (`Color/Primary`, `Text/Accent`…) com os mesmos valores.

## Tipografia

Família única: **Roboto Mono** (`font/family`). Pesos usados: 400, 500, 700.
`lineHeight` 100 = 100% (auto). `letterSpacing` 10 nos estilos Body/14 = 10% (a confirmar por tela).

| Estilo                | Tamanho | Peso | Line-height | Letter-spacing |
| --------------------- | ------: | ---: | ----------: | -------------: |
| Display/43 Bold       |      43 |  700 |        70px |              0 |
| Heading/24 Bold       |      24 |  700 |        100% |              0 |
| Body Large/18 Bold    |      18 |  700 |   16px/24px |              0 |
| Body Large/18 Regular |      18 |  400 |        16px |              0 |
| Body Large/17 Bold    |      17 |  700 |        16px |              0 |
| Body Large/16 Bold    |      16 |  700 |   100%/20px |              0 |
| Body Large/16 Medium  |      16 |  500 |        100% |              0 |
| Body Large/16 Regular |      16 |  400 |   100%/16px |              0 |
| Body/15 Bold          |      15 |  700 |        40px |              0 |
| Body/15 Medium        |      15 |  500 |        16px |              0 |
| Body/15 Regular       |      15 |  400 |   100%/40px |              0 |
| Body/14 Bold          |      14 |  700 |        100% |            10% |
| Body/14 Medium        |      14 |  500 |   16px/20px |    10% (lh 16) |
| Body/14 Regular       |      14 |  400 | 16/22/24/30 |              0 |
| Caption/13 Regular    |      13 |  400 |        22px |              0 |
| Caption/12 Bold       |      12 |  700 |        14px |              0 |
| Tiny/10 Medium        |      10 |  500 |        100% |              0 |
| Tiny/9 Bold           |       9 |  700 |        100% |          0.1px |

## Frames

| Frame                            | Node      | Tamanho     |
| -------------------------------- | --------- | ----------- |
| Desktop / Início                 | `2:2`     | 1440 × 3668 |
| Desktop / Detalhes do NFT        | `10:244`  | 1440 × 2246 |
| Desktop / Carrinho de NFTs       | `11:1278` | 1440 × 1754 |
| Desktop / Pagamento              | `11:2862` | 1440 × 1657 |
| Desktop / Confirmação de Pedido  | `11:4385` | 1440 × 1657 |
| Desktop / Login                  | `9:115`   | 1440 × 1981 |
| Desktop / Cadastro               | `9:1022`  | 1440 × 1981 |
| Desktop / Perfil do Colecionador | `9:1238`  | 1440 × 1080 |
| Desktop / Carteiras              | `9:1670`  | 1440 × 1080 |
| Mobile / Início                  | `14:5226` | 414 × 896   |
| Mobile / Detalhes do NFT         | `15:5536` | 414 × 896   |
| Mobile / Carrinho de NFTs        | `16:360`  | 414 × 896   |
| Mobile / Pagamento               | `16:748`  | 414 × 896   |
| Mobile / Login                   | `16:1022` | 414 × 896   |
| Mobile / Cadastro                | `16:1228` | 414 × 896   |

Conteúdo do desktop centralizado em 1200px (x=120 em 1440). Árvore completa em `metadata.xml`.
