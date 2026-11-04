import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getScenario, SCENARIOS, type ScenarioId } from './scenarios'

/**
 * Floating panel to drive the fake backend during demos: pick a scenario, expire the session,
 * reset the data. It lives in its own React root and talks to the mock layer through the same
 * control endpoints Playwright uses — the app never imports it.
 */
function MockPanel() {
  const [open, setOpen] = useState(false)
  const [scenario, setScenarioState] = useState<ScenarioId>(getScenario())
  const [status, setStatus] = useState('')

  async function call(path: string, message: string) {
    const response = await fetch(`/api/__mock/${path}`, { method: 'POST' })
    setStatus(response.ok ? message : 'Falhou')
  }

  return (
    // Left edge, mid-height: clear of the bottom sheets and buy bars of the mobile screens
    <div className="fixed top-1/2 left-0 z-[60] -translate-y-1/2 font-sans text-xs md:top-auto md:bottom-4 md:left-3 md:translate-y-0">
      {open ? (
        <section
          aria-label="Painel de mocks"
          className="flex w-64 flex-col gap-3 rounded-lg border border-border-soft bg-surface-dark p-3 text-foreground shadow-xl"
        >
          <header className="flex items-center justify-between">
            <h2 className="font-bold">Mocks (demo)</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar painel de mocks"
            >
              ✕
            </button>
          </header>
          <label className="flex flex-col gap-1">
            Cenário
            <select
              value={scenario}
              onChange={async (event) => {
                const id = event.target.value as ScenarioId
                setScenarioState(id)
                await call(`scenario/${id}`, `Cenário: ${SCENARIOS[id]}`)
              }}
              className="rounded border border-border-soft bg-ink p-1"
            >
              {Object.entries(SCENARIOS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => call('sessions/expire', 'Sessões expiradas no servidor')}
            className="rounded border border-primary px-2 py-1 text-text-accent"
          >
            Expirar sessão
          </button>
          <button
            type="button"
            onClick={async () => {
              await call('reset', 'Dados restaurados')
              window.location.reload()
            }}
            className="rounded bg-primary px-2 py-1 font-bold text-ink"
          >
            Resetar dados e recarregar
          </button>
          <p role="status" className="min-h-4 text-text-secondary">
            {status}
          </p>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-r-full border border-border-soft bg-surface-dark/90 px-2 py-1.5 text-text-secondary shadow-lg hover:text-foreground md:rounded-full md:px-3"
        >
          Mocks{scenario !== 'default' ? ` · ${scenario}` : ''}
        </button>
      )}
    </div>
  )
}

export function mountMockPanel() {
  // Automated runs (Playwright) drive the mocks through the control endpoints; the floating
  // panel would only get in the way of clicks and visual baselines
  if (navigator.webdriver) return
  const host = document.createElement('div')
  host.id = 'mock-panel'
  document.body.append(host)
  createRoot(host).render(<MockPanel />)
}
