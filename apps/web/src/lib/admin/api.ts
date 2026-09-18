export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const TOKEN_KEY = 'vuzki_admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
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

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true } = options;

  const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const token = getAdminToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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

export const patch = <T = unknown>(path: string, body?: unknown, auth = true) =>
  api<T>(path, { method: 'PATCH', body, auth });

export const del = <T = unknown>(path: string, auth = true) =>
  api<T>(path, { method: 'DELETE', auth });
