/**
 * Socket.IO endpoint. With mocks on, MSW intercepts this address (no real server is contacted);
 * a real backend would be configured through VITE_REALTIME_URL.
 */
export const REALTIME_URL: string =
  import.meta.env.VITE_REALTIME_URL ?? 'https://realtime.kurio.dev'
