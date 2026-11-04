import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { NftUpdated, OrderUpdated } from '@/api/contracts/realtime'
import { REALTIME_EVENTS } from '@/api/contracts/realtime'
import { REALTIME_URL } from '@/realtime/config'
import { db } from './db'
import { toSummary } from './fixtures/nfts'

/**
 * Fake Socket.IO server. MSW intercepts the WebSocket opened by socket.io-client and the binding
 * speaks the Socket.IO protocol (handshake, heartbeat, framing) on top of it. Only the default
 * namespace and text events are supported by the binding (no acks, no binary).
 */
const realtime = ws.link(`${REALTIME_URL.replace(/^http/, 'ws')}/*`)

type Connection = {
  io: ReturnType<typeof toSocketIo>
  close: () => void
  userId: string | null
}
const connections = new Set<Connection>()
let offline = false

// Last two payloads per resource, so tests can replay a duplicate and a stale event
const history = new Map<string, [unknown, unknown?]>()

function remember(key: string, payload: unknown) {
  const [last] = history.get(key) ?? []
  history.set(key, [payload, last])
}

function userIdForToken(token: unknown) {
  if (typeof token !== 'string') return null
  const session = db.state.sessions.find((s) => s.token === token)
  return session && Date.parse(session.expiresAt) > Date.now() ? session.userId : null
}

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    // "Offline" server: the connection drops right away and the client keeps retrying
    if (offline) {
      // Refused attempt: the client sees the socket drop and retries (with its connect timeout)
      setTimeout(() => connection.client.close(), 50)
      return
    }
    const entry: Connection = {
      io: toSocketIo(connection),
      close: () => connection.client.close(),
      userId: null,
    }
    connections.add(entry)
    entry.io.client.on(REALTIME_EVENTS.sessionJoin, (_event, token) => {
      entry.userId = userIdForToken(token)
    })
    connection.client.addEventListener('close', () => connections.delete(entry))
  }),
]

export function publishNftUpdated(nftId: string) {
  const nft = db.state.nfts.find((n) => n.id === nftId)
  if (!nft) return
  const payload: NftUpdated = {
    eventId: `nft:${nft.id}:v${nft.version}`,
    resource: 'nft',
    id: nft.id,
    version: nft.version,
    data: { summary: toSummary(nft), editionOptions: nft.editionOptions },
  }
  remember(`nft:${nft.id}`, payload)
  for (const c of connections) c.io.client.emit(REALTIME_EVENTS.nftUpdated, payload)
}

export function publishOrderUpdated(orderId: string) {
  const record = db.state.orders.find((o) => o.id === orderId)
  if (!record) return
  const {
    userId,
    idempotencyKey: _k,
    fingerprint: _f,
    settleAt: _s,
    outcome: _o,
    ...order
  } = record
  const payload: OrderUpdated = {
    eventId: `order:${order.id}:v${order.version}`,
    resource: 'order',
    id: order.id,
    version: order.version,
    userId,
    data: order,
  }
  remember(`order:${order.id}`, payload)
  // Private event: only connections bound to the owner's session receive it
  for (const c of connections) {
    if (c.userId === userId) c.io.client.emit(REALTIME_EVENTS.orderUpdated, payload)
  }
}

/** Re-sends the latest event of an NFT twice (duplicate) and then the previous one (stale). */
export function replayNft(nftId: string) {
  const [last, previous] = history.get(`nft:${nftId}`) ?? []
  for (const payload of [last, last, previous]) {
    if (!payload) continue
    for (const c of connections) c.io.client.emit(REALTIME_EVENTS.nftUpdated, payload)
  }
  return Boolean(last)
}

/** Drops every connection; while offline, reconnections are refused. */
export function setRealtimeOffline(value: boolean) {
  offline = value
  if (value) for (const c of [...connections]) c.close()
}
