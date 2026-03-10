import type { ApiErrorResponse } from '@/types/domain';

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; data: unknown };

async function safeJsonParse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const apiError = data as ApiErrorResponse;
    if (typeof apiError.error === 'string' && apiError.error.length > 0) {
      return apiError.error;
    }
  }

  return fallback;
}

export async function request<T>(
  input: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const response = await fetch(input, init);
  const data = await safeJsonParse(response);

  if (!response.ok) {
    return {
      ok: false,
      error: getErrorMessage(data, response.statusText || 'Request failed'),
      status: response.status,
      data,
    };
  }

  return {
    ok: true,
    data: (data as T) ?? (null as T),
    status: response.status,
  };
}
