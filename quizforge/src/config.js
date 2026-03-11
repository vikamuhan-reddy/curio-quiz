const isProd = import.meta.env.PROD;

export const API_BASE = isProd
  ? import.meta.env.VITE_API_URL
  : '';

export const SOCKET_URL = isProd
  ? import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
  : 'http://localhost:3001';