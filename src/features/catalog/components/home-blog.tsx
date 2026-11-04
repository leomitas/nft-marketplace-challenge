// Editorial content is out of scope: the section reproduces the layout, but "Ler mais" is
// shown as unavailable instead of linking to pages that do not exist.
const POSTS = [
  {
    date: '12 de setembro',
    read: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/nfts/ape-dark-480.webp',
  },
  {
    date: '13 de setembro',
    read: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/nfts/ape-green-480.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/nfts/ape-hat-480.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/nfts/ape-orange-480.webp',
  },
]

export function HomeBlog() {
  return (
    <section aria-labelledby="blog-title" className="hidden flex-col items-center gap-10 md:flex">
      <header className="flex flex-col gap-3 text-center">
        <h2 id="blog-title" className="text-[28px] font-bold text-foreground">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid w-full grid-cols-2 gap-6 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg bg-surface-card">
              <img
                src={post.image}
                alt=""
                width={268}
                height={195}
                loading="lazy"
                className="h-[195px] w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs leading-4 font-medium whitespace-pre-wrap text-text-secondary">
                  {`${post.date}  |  ${post.read}`}
                </p>
                <h3 className="text-base font-bold text-foreground">{post.title}</h3>
                <p className="text-xs leading-4 font-medium text-text-secondary">{post.text}</p>
                <p
                  className="mt-auto flex gap-1 text-xs text-text-accent"
                  title="Disponível em breve"
                >
                  <span className="leading-[14px] font-bold">Ler mais</span>
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">(disponível em breve)</span>
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
