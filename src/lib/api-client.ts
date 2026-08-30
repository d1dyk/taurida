const TOKEN_STORAGE_KEY = 'taurida_admin_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (e) {
    console.error('Failed to save token to localStorage:', e);
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Enhanced fetch that automatically injects Authorization header with Bearer token
 * and handles credentials properly in iframe / cross-origin environments.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-admin-token', token);
  }

  const enhancedInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include' // Send cookies if available
  };

  const response = await fetch(input, enhancedInit);

  // If unauthorized, token might be expired
  if (response.status === 401) {
    console.warn('[authFetch] 401 Unauthorized received for', input);
  }

  return response;
}

/**
 * Triggers a secure authenticated file download via Blob or tokenized URL
 */
export async function downloadAdminFile(url: string, defaultFilename: string): Promise<void> {
  const token = getStoredToken();
  try {
    const res = await authFetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Не удалось скачать файл' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fallback: Token in query param
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      const authenticatedUrl = `${url}${separator}token=${encodeURIComponent(token)}`;
      window.location.href = authenticatedUrl;
    } else {
      window.location.href = url;
    }
  }
}
