import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1';

/** Every API response: { status: 1|0, data: {…}, message }. Lists: data = { items, pagination? }. */
export interface ApiEnvelope<T> {
  status: 0 | 1;
  data: T;
  message: string;
}
export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
/** Failure payload: data = { code, errors?: [{ field, message }], …context }. */
export interface ApiErrorData { code: string; errors?: { field: string; message: string }[]; [key: string]: unknown }

/** What pages receive: lists are unwrapped to arrays, paging moves to `meta`. */
export interface ApiResult<T> {
  data: T;
  meta?: PageMeta;
  message: string;
}

function unwrap<T>(body: ApiEnvelope<unknown>): ApiResult<T> {
  const d = (body?.data ?? {}) as { items?: unknown; pagination?: PageMeta };
  if (Array.isArray(d.items)) return { data: d.items as T, meta: d.pagination, message: body.message };
  return { data: d as T, message: body.message };
}
export interface Admin { id: number; name: string; email: string; role: 'super_admin' | 'admin' }

const KEY = 'syyncin.admin.session';
interface Session { accessToken: string; refreshToken: string; admin: Admin }

export const session = {
  get(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  set(s: Session) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  },
};

export const http = axios.create({ baseURL: API_BASE, timeout: 20000 });

http.interceptors.request.use((cfg) => {
  const s = session.get();
  if (s?.accessToken) cfg.headers.Authorization = `Bearer ${s.accessToken}`;
  return cfg;
});

let refreshing: Promise<string | null> | null = null;
let onSessionExpired: () => void = () => {};
export const setSessionExpiredHandler = (fn: () => void) => { onSessionExpired = fn; };

async function refreshAccess(): Promise<string | null> {
  const s = session.get();
  if (!s?.refreshToken) return null;
  try {
    const { data } = await axios.post<ApiEnvelope<Session>>(`${API_BASE}/admin/auth/refresh`, { refreshToken: s.refreshToken });
    session.set({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken, admin: data.data.admin });
    return data.data.accessToken;
  } catch {
    return null;
  }
}

/** On 401: refresh once (shared across concurrent calls), retry, else sign out. */
http.interceptors.response.use(undefined, async (error: AxiosError<ApiEnvelope<ApiErrorData>>) => {
  const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthCall = original?.url?.includes('/admin/auth/');
  if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
    original._retried = true;
    refreshing ??= refreshAccess().finally(() => { setTimeout(() => { refreshing = null; }, 0); });
    const token = await refreshing;
    if (token) {
      original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
      return http(original);
    }
    session.clear();
    onSessionExpired();
  }
  return Promise.reject(error);
});

/** Human message from any API/network error (the API always sends one in `message`). */
export function errorMessage(e: unknown): string {
  const err = e as AxiosError<ApiEnvelope<ApiErrorData>>;
  return err?.response?.data?.message || (err?.message === 'Network Error' ? 'Cannot reach the server.' : err?.message) || 'Something went wrong.';
}

/** Machine code of an API error (e.g. 'DUPLICATE'), if any. */
export function errorCode(e: unknown): string | undefined {
  return (e as AxiosError<ApiEnvelope<ApiErrorData>>)?.response?.data?.data?.code;
}

/** Field-level validation errors keyed by field, for Form.setFields. */
export function fieldErrors(e: unknown): Record<string, string> {
  const list = (e as AxiosError<ApiEnvelope<ApiErrorData>>)?.response?.data?.data?.errors || [];
  return Object.fromEntries(list.map((x) => [x.field, x.message]));
}

export const api = {
  get: async <T>(url: string, params?: object) => unwrap<T>((await http.get<ApiEnvelope<unknown>>(url, { params })).data),
  post: async <T>(url: string, body?: object) => unwrap<T>((await http.post<ApiEnvelope<unknown>>(url, body)).data),
  put: async <T>(url: string, body?: object) => unwrap<T>((await http.put<ApiEnvelope<unknown>>(url, body)).data),
  patch: async <T>(url: string, body?: object) => unwrap<T>((await http.patch<ApiEnvelope<unknown>>(url, body)).data),
  del: async <T>(url: string) => unwrap<T>((await http.delete<ApiEnvelope<unknown>>(url)).data),
  blob: async (url: string) => (await http.get<Blob>(url, { responseType: 'blob' })).data,
};

/** Absolute URL for files served by the API host (profile photos). */
export function assetUrl(url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) {
    try {
      const u = new URL(url);
      // In dev the API returns http://localhost:4000/uploads/... — go through the Vite proxy instead.
      return API_BASE.startsWith('/') ? u.pathname : url;
    } catch {
      return url;
    }
  }
  return url;
}
