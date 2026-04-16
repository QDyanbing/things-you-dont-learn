const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

function buildDemoAuthUrl(path: string) {
  return new URL(`/api/demo-auth${path}`, API_BASE_URL).toString();
}

async function parseDemoAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? '演示鉴权请求失败');
  }

  return response.json() as Promise<T>;
}

export async function refreshDemoAccessToken() {
  const response = await fetch(buildDemoAuthUrl('/token/refresh'), {
    method: 'POST',
  });
  const payload = await parseDemoAuthResponse<{ accessToken: string }>(response);
  return payload.accessToken;
}

export async function createDemoSession() {
  const response = await fetch(buildDemoAuthUrl('/session'), {
    method: 'POST',
    credentials: 'include',
  });

  return parseDemoAuthResponse<{ ok: boolean; mode: 'cookie' }>(response);
}

export async function clearDemoSession() {
  const response = await fetch(buildDemoAuthUrl('/session'), {
    method: 'DELETE',
    credentials: 'include',
  });

  return parseDemoAuthResponse<{ ok: boolean; mode: 'cookie' }>(response);
}
