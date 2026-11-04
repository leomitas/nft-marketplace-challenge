import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { COLLECTIONS, type CollectionId } from '@/api/contracts/catalog'
import social1 from '@/assets/figma/social-1.svg'
import social2 from '@/assets/figma/social-2.svg'
import social3 from '@/assets/figma/social-3.svg'
import social4 from '@/assets/figma/social-4.svg'
import social5 from '@/assets/figma/social-5.svg'
import { SoonBadge } from './soon'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const FOOTER_COLLECTIONS: CollectionId[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'utilidade',
]

/** Desktop footer ("Footer" component in Figma). The mobile frame has no footer. */
export function SiteFooter() {
  return (
    <footer className="hidden md:block">
      <div className="flex flex-col gap-8 bg-surface-card p-8 lg:flex-row lg:items-stretch">
        <ul className="grid flex-1 grid-cols-3 divide-x divide-primary">
          {FEATURES.map((feature) => (
            <li key={feature.letter} className="flex flex-col gap-3 px-4">
              <span
                aria-hidden="true"
                className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-ink"
              >
                {feature.letter}
              </span>
              <h2 className="text-[17px] leading-4 font-bold text-foreground">{feature.title}</h2>
              <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">
                {feature.text}
              </p>
            </li>
          ))}
        </ul>
        <Newsletter />
      </div>

      <div className="grid grid-cols-2 items-center gap-6 bg-surface-dark px-8 py-6 text-sm text-foreground lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[92px]">
        <span className="text-sm font-bold tracking-[0.1em]">KURIO</span>
        <p className="leading-[22px]">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a
          href="mailto:contato@email.com"
          className="leading-[22px] underline-offset-4 hover:underline"
        >
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="leading-[22px] underline-offset-4 hover:underline">
          +55 11 4002 8922
        </a>
      </div>

      <div className="grid grid-cols-2 gap-8 bg-surface-card p-8 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[124px]">
        <FooterColumn
          title="Meu perfil"
          items={[
            'Meu perfil',
            'Minha coleção',
            'Atividade',
            'Estúdio do criador',
            'Lista de interesse',
          ]}
        />
        <FooterColumn
          title="Central de ajuda"
          items={[
            'Central de ajuda',
            'Como comprar NFTs',
            'Carteira e segurança',
            'Política do mercado',
            'Denunciar item',
          ]}
        />
        <nav aria-labelledby="footer-collections" className="flex flex-col gap-2 text-foreground">
          <h2 id="footer-collections" className="text-lg leading-4 font-bold">
            Coleções
          </h2>
          <ul className="text-sm leading-[30px]">
            {FOOTER_COLLECTIONS.map((id) => (
              <li key={id}>
                <Link
                  to="/"
                  search={{ collections: [id] }}
                  hash="catalogo"
                  className="underline-offset-4 hover:underline"
                >
                  {COLLECTIONS[id]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h2 className="text-lg leading-4 font-bold text-foreground">Redes sociais</h2>
            <ul className="flex gap-2.5" aria-label="Redes sociais (disponível em breve)">
              {[social1, social2, social3, social4, social5].map((icon) => (
                <li key={icon}>
                  <img src={icon} alt="" width={32} height={32} />
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg leading-4 font-bold text-foreground">Carteiras compatíveis</h2>
            <p className="flex h-[26px] items-center justify-center rounded-[6px] border border-border-soft bg-surface-dark text-[9px] font-bold tracking-[0.1px] whitespace-pre text-text-accent">
              {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
            </p>
          </div>
        </div>
      </div>

      <p className="py-1.5 text-center text-sm leading-[30px] text-foreground">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}

/** Editorial/support links are out of scope: shown as plain text, not as working links. */
function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2 text-foreground">
      <h2 className="text-lg leading-4 font-bold">{title}</h2>
      <ul className="text-sm leading-[30px]">
        {items.map((item) => (
          <li key={item} title="Disponível em breve">
            {item}
            <SoonBadge />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Newsletter is out of scope: the form validates, then says so instead of faking success. */
function Newsletter() {
  const id = useId()
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)

  return (
    <form
      noValidate
      className="flex w-full flex-col gap-3 lg:w-[357px]"
      onSubmit={(event) => {
        event.preventDefault()
        const email = new FormData(event.currentTarget).get('email')?.toString().trim() ?? ''
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          setMessage({ tone: 'error', text: 'Informe um e-mail válido.' })
          return
        }
        setMessage({
          tone: 'info',
          text: 'A newsletter não está disponível nesta demonstração. Nenhum dado foi enviado.',
        })
      }}
    >
      <label htmlFor={`${id}-email`} className="text-lg leading-4 font-bold text-foreground">
        Antecipe-se ao próximo lançamento
      </label>
      <div className="mt-1 flex h-10 rounded-[6px] bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={message?.tone === 'error' || undefined}
          aria-describedby={`${id}-msg`}
          className="min-w-0 flex-1 rounded-l-[6px] bg-transparent px-3 text-sm text-foreground placeholder:text-brand-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <button
          type="submit"
          className="w-[85px] rounded-r-[6px] bg-primary text-lg leading-4 font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Enviar
        </button>
      </div>
      <p
        id={`${id}-msg`}
        aria-live="polite"
        className={
          message?.tone === 'error'
            ? 'text-sm text-destructive'
            : 'text-[13px] leading-[22px] text-text-secondary'
        }
      >
        {message?.text ??
          'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </form>
  )
}
