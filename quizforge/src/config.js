const isProd = import.meta.env.PROD;

export const API_BASE = isProd
  ? (import.meta.env.VITE_API_URL || 'https://13.232.44.169.nip.io')
  : 'http://localhost:3001';

export const SOCKET_URL = isProd
  ? (import.meta.env.VITE_SOCKET_URL || API_BASE)
  : 'http://localhost:3001';