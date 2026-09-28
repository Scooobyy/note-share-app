const BASE = '/api/hono';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Request failed'), {
      status: res.status,
      data,
    });
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ user: { id: string; email: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: { userId: string; email: string } | null }>('/auth/me'),

  createNote: (body: {
    title: string;
    content: string;
    expiresAt: string;
    shareType: 'ONE_TIME' | 'TIME_BASED';
    accessType: 'PUBLIC' | 'PASSWORD';
    shareExpiresAt?: string;
  }) =>
    request<{
      note: any;
      share: {
        id: string;
        shareUrl: string;
        password: string | null;
        shareType: string;
        accessType: string;
        expiresAt: string;
      };
    }>('/notes', { method: 'POST', body: JSON.stringify(body) }),

  getNote: (id: string) =>
    request<{ note: any; shares: any[] }>(`/notes/${id}`),

  inspectShare: (token: string) =>
  fetch(`${BASE}/share/${token}`, { credentials: 'include' }).then(async (r) => ({
    status: r.status,
    data: await r.json(),
  })),

viewShare: (token: string, password?: string) =>
  fetch(`${BASE}/share/${token}/view`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(password ? { password } : {}),
  }).then(async (r) => ({ status: r.status, data: await r.json() })),

  revokeShare: (shareId: string) =>
    request<{ ok: true }>(`/share/${shareId}/revoke`, { method: 'POST' }),
};