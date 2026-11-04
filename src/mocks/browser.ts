import { setupWorker } from 'msw/browser'
import { db } from './db'
import { handlers } from './handlers'
import { resumePendingSettlements } from './order-logic'
import { isScenarioId, setScenario } from './scenarios'

export const worker = setupWorker(...handlers)

resumePendingSettlements()

/**
 * Reads `?scenario=<id>` and `?reset=1` once at boot, applies them to the mock layer and
 * removes them from the URL so they don't leak into the app's own search params.
 */
export function applyMockControlsFromUrl() {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  const reset = url.searchParams.get('reset')
  if (!scenario && !reset) return

  // A reset restores the whole known state: seed data and the default scenario
  if (reset === '1' || reset === 'true') {
    db.reset()
    setScenario('default')
  }
  if (isScenarioId(scenario)) setScenario(scenario)
  url.searchParams.delete('scenario')
  url.searchParams.delete('reset')
  window.history.replaceState(window.history.state, '', url)
}
