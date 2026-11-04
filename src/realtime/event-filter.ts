const MAX_SEEN = 500

/**
 * Drops duplicates (same eventId) and stale events (version not newer than the last one applied
 * for that resource), so an event is applied at most once and state never goes backwards.
 */
export function createEventFilter() {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  return {
    accept(event: { eventId: string; resource: string; id: string; version: number }) {
      if (seen.has(event.eventId)) return false
      seen.add(event.eventId)
      if (seen.size > MAX_SEEN) seen.delete(seen.values().next().value as string)

      const key = `${event.resource}:${event.id}`
      if ((versions.get(key) ?? -1) >= event.version) return false
      versions.set(key, event.version)
      return true
    },
  }
}
