const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
let csrfToken = null;

export async function apiFetch(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  const response = await fetch(API + path, { ...options, headers, credentials: 'include' });
  if (path === '/api/auth/login' || path === '/api/auth/me') {
    try {
      const payload = await response.clone().json();
      if (payload.csrfToken) csrfToken = payload.csrfToken;
    } catch (_error) {}
  }
  if (path === '/api/auth/logout' && response.ok) csrfToken = null;
  return response;
}

export { API };
