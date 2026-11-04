import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/**
 * Shared page frame: 1200px content column, header, footer and room for the mobile tab bar.
 * Spacing follows Figma: 32px from header to content, 96px between sections and to the footer.
 */
export function PageShell({
  section,
  headerDivider = true,
  children,
}: {
  section: 'home' | 'market'
  headerDivider?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-16 px-6 pt-10 pb-32 md:gap-24 md:pt-6 md:pb-6 xl:px-0">
      <div className="flex flex-col gap-8">
        <SiteHeader active={section} divider={headerDivider} />
        <main
          id="conteudo"
          tabIndex={-1}
          className="flex flex-col gap-4 focus:outline-none md:gap-24"
        >
          {children}
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
