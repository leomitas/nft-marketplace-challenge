# Tela Início

Frames: Desktop `2:2` (1440 × 3668), Mobile `14:5226` (414 × 896).
Screenshots: `screenshots/desktop-inicio.png`, `screenshots/mobile-inicio.png`.
Marca no layout: **KURIO**.

## Desktop (container 1200px, padding lateral 120, gap entre seções 96, padding vertical 24)

1. **Header Row** (componente `70486:560`, usado em todas as telas)
   - Logo "KURIO" 14px bold, tracking 1.4px.
   - Nav (gap 40): Início (ativo: accent bold + underline 3px), Mercado, Criadores, Aprenda (16px regular, foreground).
     Ativo = "Início" em Início/Login/Cadastro/Perfil/Carteiras; "Mercado" em Detalhe/Carrinho/Pagamento/Confirmação.
   - Ações (gap 28): ícone busca 20px, carrinho 24px com badge 16px (primary, borda ink, número 10px medium),
     botão "Entrar" 100×35 primary radius 6 com ícone login 20px + texto 16px medium ink.
   - Divisor hairline abaixo (só em Início, Perfil, Carteiras e auth).
2. **Hero** 1200×450, fundo surface-card, radius ~24 (screenshot), padding-left 40.
   - Esquerda (600): "Bem-vindo à Kurio" 14 medium tracking 1.4 / título 43 bold lh 70 em 2 linhas
     "SEJA DONO DO FUTURO / DA ARTE DIGITAL" / texto 14 lh 24 text-secondary (557px) / gap 32 / botão
     "EXPLORAR" 140×40 primary radius 6, 16 bold ink. Indicador de 3 pontos (40×8) alinhado à direita.
   - Direita: arte 450×450 radius 24.
3. **Products** (gap 48)
   - **Sidebar** 310: painel **Filters** (surface-card, padding 20, gap 40 entre grupos):
     - "Coleções" 18 bold; lista com linhas lh 40, 15px; item ativo accent, demais text-secondary; contagem bold à direita.
       Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas, Utilidade.
     - "Faixa de preço": slider de 2 thumbs (15px), texto "Preço: 0,02 - 12,30 ETH" 15px, botão "Aplicar" primary
       radius 6, padding 12/8, 16 bold.
     - "Rede": Ethereum, Polygon, Solana com contagem.
   - **Featured NFT Banner** 310×470: gradiente primary 10%→3%, "NFT EM DESTAQUE" 24 bold accent,
     "OFERTA LIMITADA" 22 bold centralizado, arte 310×368 radius 22.
   - **Product Grid** (flex 1, gap 88 até a paginação):
     - Toolbar: tabs 15 medium gap 20 (Todos os NFTs [ativo accent + underline 2px], Novos lançamentos, Em alta);
       "Ordenar por: Listados recentemente ▾" 15 regular.
     - Grid 3 colunas (cards 258 de largura, gap vertical 72): bloco surface-card 258×300 com arte 250×250
       radius 15; nome 16 regular; preço 18 bold accent. Variante com preço anterior 18 regular secondary.
     - Paginação: quadrados 35px radius 4; ativo primary com número ink bold; demais borda `border`; seta próxima.
4. **Promos** (2 cards 586×250 radius 8, surface-card): arte à esquerda (radius 18), título 18 bold 2 linhas alinhado
   à direita, texto 14 lh 24 secondary, botão "Explorar →" 140×40 primary 14 medium. Arcos decorativos (mask).
   - "Lançamentos gênesis de edição limitada" / "Arte digital selecionada e muito mais".
5. **Blog "Diário da Cunhagem"**: título 28 bold, subtítulo 14; 4 cards 268 (imagem 195, data 12 medium,
   título 16 bold, resumo 12 medium, "Ler mais →" 12 bold accent).
6. **Footer** (componente `70491:1286`): faixa surface-card com 3 medalhões (74px primary, letra 24 bold) + newsletter;
   faixa surface-dark com logo, slogan, e-mail e telefone; colunas de links (Meu perfil, Central de ajuda, Coleções,
   Redes sociais + Carteiras compatíveis); copyright "© 2026 Kurio. Propriedade digital para todos."

## Mobile (414, padding 24, gap 16)

- **Search Bar**: campo 313×45 surface-card radius 10 com ícone 22 e placeholder "Explorar coleções" 14 bold secondary;
  botão filtro 45×45 radius 14 com gradiente primary 45%→100%.
- **Hero Banner** 366×190 radius 30 com gradientes/círculos (asset `m-hero-mask.svg`): "Bem-vindo à Kurio" 12 medium,
  "SEJA DONO DA / CULTURA DIGITAL" 18 bold lh 29, texto 12 lh 18, link "EXPLORAR →" 12 bold accent; artes 138 e 58
  sobrepostas (radius 16); 3 pontos.
- **Tabs**: 14px, ativo bold accent com underline; demais regular.
- **Grid** 2 colunas de 175 (coluna direita deslocada 32px para baixo, gap 24): card 175×200 radius 20 com gradiente
  `#241612 → #2F1D15`, arte 168 radius 16, botão favorito 28px no canto, selo "RARO" (primary, 13 medium ink);
  nome 15 regular, preço 16 bold accent.
- **Tab Bar** inferior 126px: Início (ativo), Favoritos, botão central 65px com gradiente, Carrinho, Perfil.

Tokens extras do mobile: `Color/Surface Raised #2F1D15`, `Color/Gray Light #EDEDED`.

## Assets

`src/assets/figma/*.svg` (ícones, máscaras, sociais) e `public/nfts/*.webp` (artes convertidas de PNG 1254px/2MB
para WebP 480/960px, ~15–65KB). O Figma usa apenas 4 artes distintas, repetidas entre os NFTs.
`hero-bg.svg` veio vazio no export: o fundo do hero é feito em CSS (surface-card).
