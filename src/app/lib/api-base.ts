/**
 * Resolves the backend base URL.
 *
 * Priority:
 *   1. VITE_API_BASE_URL env var (set in .env.local for ngrok, production, etc.)
 *   2. Same origin as the page — Vite's dev server proxies /api/* and /ws to
 *      localhost:3001, so any device that can load the frontend can also reach
 *      the API and WebSocket without needing direct access to port 3001.
 *
 * Examples:
 *   Opened as http://localhost:5173       → http://localhost:5173  (proxied)
 *   Opened as http://192.168.1.42:5173    → http://192.168.1.42:5173  (proxied)
 *   VITE_API_BASE_URL=https://x.ngrok.io  → https://x.ngrok.io  (direct)
 */
const raw =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.protocol}//${window.location.host}`;

export const API_BASE = raw.replace(/\/$/, "");

// WebSocket: proxy through /ws on the same origin, or derive directly from an
// explicit VITE_API_BASE_URL (e.g. ngrok already exposes the WS endpoint).
export const WS_BASE = import.meta.env.VITE_API_BASE_URL
  ? API_BASE.replace(/^http/, "ws")
  : `${window.location.protocol.replace("http", "ws")}//${window.location.host}/ws`;
