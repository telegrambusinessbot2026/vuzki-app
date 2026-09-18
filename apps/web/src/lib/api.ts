export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

/** Origin of the API (API_URL without the trailing /api/v1). */
export const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Resolve an API-relative media path (e.g. `/uploads/avatars/x.jpg` or
 * `uploads/...`) into an absolute URL the browser can load. Absolute/empty
 * values are returned unchanged. Never guessed: only joins what the server
 * actually returned with the configured API origin.
 */
export function mediaUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

const TOKEN_KEY = 'vuzki_access_token';
const REFRESH_KEY = 'vuzki_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: getRefreshToken() }),
        });
        const json = await res.json();
        if (json.success && json.data?.tokens) {
          setTokens(json.data.tokens.accessToken, json.data.tokens.refreshToken);
          return true;
        }
        clearTokens();
        return false;
      } catch {
        clearTokens();
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  useRefresh?: boolean;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = false, useRefresh = true } = options;

  const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && useRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      requestHeaders.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok || json?.success === false) {
    const err = json?.error;
    throw new ApiError(
      res.status,
      err?.code || 'REQUEST_FAILED',
      err?.message || 'Request failed',
      err?.details,
      err?.fieldErrors
    );
  }

  return json?.data as T;
}

export const post = <T = unknown>(path: string, body?: unknown, auth = true) =>
  api<T>(path, { method: 'POST', body, auth });

export const put = <T = unknown>(path: string, body?: unknown, auth = true) =>
  api<T>(path, { method: 'PUT', body, auth });

export const patch = <T = unknown>(path: string, body?: unknown, auth = true) =>
  api<T>(path, { method: 'PATCH', body, auth });

export const del = <T = unknown>(path: string, auth = true) =>
  api<T>(path, { method: 'DELETE', auth });
