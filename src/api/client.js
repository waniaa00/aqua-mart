// Thin fetch wrapper for the FastAPI backend. Base URL comes from
// VITE_API_BASE_URL (set per-environment — see .env for local dev and the
// Vercel project settings for production), falling back to the local
// backend's default port so `npm run dev` works out of the box.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch(path, { params, ...options } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // error body wasn't JSON — fall back to statusText
    }
    throw new ApiError(typeof detail === 'string' ? detail : JSON.stringify(detail), res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}
