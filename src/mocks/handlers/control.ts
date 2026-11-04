import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { isScenarioId, setScenario } from '../scenarios'

/**
 * Test/demo controls of the fake backend. They are part of the mock layer (not the app):
 * the dev panel and Playwright call them to change server-side state, never the UI.
 */
export const controlHandlers = [
  http.post('/api/__mock/reset', () => {
    db.reset()
    setScenario('default')
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/__mock/scenario/:id', ({ params }) => {
    if (!isScenarioId(params.id)) return new HttpResponse(null, { status: 404 })
    setScenario(params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // Simulates expiry: every active session is now in the past
  http.post('/api/__mock/sessions/expire', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    db.update((draft) => {
      draft.sessions = draft.sessions.map((s) => ({ ...s, expiresAt: past }))
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
