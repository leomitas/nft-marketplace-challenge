import './index.css'

// There is no real backend, so mocks are on unless explicitly disabled with VITE_ENABLE_MOCKS=false.
// The mock layer and the app are fetched in parallel (not one after the other) to shorten the
// critical path; the app renders only once the worker intercepts requests.
const mocks = import.meta.env.VITE_ENABLE_MOCKS === 'false' ? null : import('./mocks/browser')
const app = import('./app')

async function enableMocking() {
  if (!mocks) return
  const { worker, applyMockControlsFromUrl } = await mocks
  applyMockControlsFromUrl()
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })
  // Demo controls for the fake backend; loaded after first render, off the critical path
  window.setTimeout(() => void import('./mocks/dev-panel').then((m) => m.mountMockPanel()), 0)
}

// The router is created only after the mock controls are stripped from the URL
void Promise.all([enableMocking(), app]).then(([, { renderApp }]) => {
  renderApp(document.getElementById('root')!)
})
