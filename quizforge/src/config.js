const isProd = import.meta.env.PROD;

// ✅ Validate required env vars at startup in production
if (isProd) {
  if (!import.meta.env.VITE_API_URL) {
    console.error('❌ VITE_API_URL is not set. API calls will fail in production.');
  }
}

export const API_BASE = isProd
  ? (import.meta.env.VITE_API_URL || '')
  : '';

export const SOCKET_URL = isProd
  ? (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '')
  : 'http://localhost:3001';