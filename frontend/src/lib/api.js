const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

function readCookie(name) {
  const prefix = name + '=';
  for (const part of document.cookie.split(';')) {
    const item = part.trim();
    if (item.startsWith(prefix)) {
      try { return decodeURIComponent(item.slice(prefix.length)); } catch (_error) { return ''; }
    }
  }
  return '';
}

export function apiFetch(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  return fetch(API + path, { ...options, headers, credentials: 'include' });
}

export { API };
