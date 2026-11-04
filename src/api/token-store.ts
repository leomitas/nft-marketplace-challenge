/**
 * Holds the opaque session token. The token is the only auth artifact kept in the browser;
 * user data always comes from GET /auth/session.
 */
const TOKEN_KEY = 'kurio:auth-token'

let memoryToken: string | null = readStored()

function readStored() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const tokenStore = {
  get: () => memoryToken,
  set(token: string) {
    memoryToken = token
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Private mode: session lasts for this tab only
    }
  },
  clear() {
    memoryToken = null
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Nothing persisted
    }
  },
}
