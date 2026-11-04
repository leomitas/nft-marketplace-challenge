import { delay, HttpResponse } from 'msw'

/**
 * Deterministic network scenarios. Select with `?scenario=<id>` (persisted until changed)
 * and restore the default data with `?reset=1`. Same ids are used by Playwright.
 */
export const SCENARIOS = {
  default: 'Sucesso (latência curta)',
  empty: 'Catálogo vazio',
  slow: 'Lento (2,5 s por requisição)',
  'variable-latency': 'Latência variável (determinística)',
  'out-of-order': 'Respostas fora de ordem',
  'server-error': 'Erro 500 no catálogo',
  'network-error': 'Falha de conexão no catálogo',
  'flaky-catalog': 'Catálogo falha 2 vezes e o retry automático recupera',
  'favorites-error': 'Salvar/remover favorito responde 500 (rollback)',
  'auth-unavailable': 'Login e cadastro respondem 503',
  'wallet-rejected': 'Carteira recusa a conexão',
  'payment-refused': 'Pagamento recusado pela rede',
  'order-timeout': 'Pedido criado, mas a 1ª resposta não chega (timeout)',
  'checkout-price-change': 'Preço muda no momento de confirmar a compra',
  'checkout-sold-out': 'Edição esgota no momento de confirmar a compra',
} as const
export type ScenarioId = keyof typeof SCENARIOS

const SCENARIO_KEY = 'kurio:mock-scenario'

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in SCENARIOS
}

export function getScenario(): ScenarioId {
  try {
    const value = localStorage.getItem(SCENARIO_KEY)
    return isScenarioId(value) ? value : 'default'
  } catch {
    return 'default'
  }
}

export function setScenario(id: ScenarioId) {
  try {
    if (id === 'default') localStorage.removeItem(SCENARIO_KEY)
    else localStorage.setItem(SCENARIO_KEY, id)
  } catch {
    // Storage unavailable: scenario stays default
  }
  requestCounter = 0
  flakyFailures = 0
  oneShotFired.clear()
}

let requestCounter = 0
let flakyFailures = 0
// Checkout scenarios act once (the first order attempt), so the recovery path can be shown
const oneShotFired = new Set<ScenarioId>()

/** True the first time it is called while `id` is active; false afterwards. */
export function fireOnce(id: ScenarioId) {
  if (getScenario() !== id || oneShotFired.has(id)) return false
  oneShotFired.add(id)
  return true
}

// Fixed sequence instead of Math.random, so "variable" latency is reproducible
const VARIABLE_DELAYS = [300, 1400, 600, 2200, 150, 900]

/** Latency applied to every mocked request according to the active scenario. */
export async function simulateLatency() {
  const n = requestCounter++
  switch (getScenario()) {
    case 'slow':
      return delay(2500)
    case 'variable-latency':
      return delay(VARIABLE_DELAYS[n % VARIABLE_DELAYS.length])
    case 'out-of-order':
      // Older requests answer after newer ones: 1st takes 2s, 2nd 200ms, 3rd 2s...
      return delay(n % 2 === 0 ? 2000 : 200)
    default:
      return delay(120)
  }
}

/** Failure injected into catalog reads, or undefined when the request should succeed. */
export function catalogFailure() {
  switch (getScenario()) {
    case 'server-error':
      return errorResponse(500, 'INTERNAL', 'Erro interno ao carregar o catálogo.')
    case 'network-error':
      return HttpResponse.error()
    case 'flaky-catalog':
      // Two transient 503s: the client's automatic retries (2) recover without user action
      if (flakyFailures++ < 2) {
        return errorResponse(503, 'UNAVAILABLE', 'Serviço temporariamente indisponível.')
      }
      return undefined
    default:
      return undefined
  }
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return HttpResponse.json({ error: { code, message, fields } }, { status })
}

/** Failure injected into favorite mutations. */
export function favoritesFailure() {
  if (getScenario() === 'favorites-error') {
    return errorResponse(500, 'INTERNAL', 'Não foi possível atualizar seus favoritos.')
  }
  return undefined
}

/** Failure injected into login and sign-up. */
export function authFailure() {
  if (getScenario() === 'auth-unavailable') {
    return errorResponse(503, 'UNAVAILABLE', 'Autenticação temporariamente indisponível.')
  }
  return undefined
}
