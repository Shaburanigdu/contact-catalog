// lib/api-client.ts
type FetchOptions = RequestInit & {
  skipRefresh?: boolean;
};

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private redirectScheduled = false; // переименовано для ясности

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { skipRefresh = false, ...fetchOptions } = options;

    let response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (response.status === 401 && !skipRefresh) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Повторяем исходный запрос
        response = await fetch(url, {
          ...fetchOptions,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });
      } else {
        // Не удалось обновить токен – редирект на логин, но НЕ блокируем будущие запросы
        if (!this.redirectScheduled) {
          this.redirectScheduled = true;
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }, 0);
        }
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      await this.refreshPromise;
      return true;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefreshWithRetry();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefreshWithRetry(maxRetries = 4): Promise<boolean> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          console.log(`✅ Refresh successful on attempt ${attempt + 1}`);
          return true;
        }

        if (response.status === 401) {
          console.warn(`❌ Refresh token expired/invalid (attempt ${attempt + 1})`);
          return false; // фатально
        }

        // Другие ошибки (500, 429 и т.д.)
        lastError = new Error(`Refresh failed with status ${response.status}`);
        console.warn(`⚠️ Refresh attempt ${attempt + 1} failed: ${response.status}`);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Refresh attempt ${attempt + 1} network error:`, error);
      }

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt); // экспоненциальная задержка
        console.log(`⏳ Waiting ${delay}ms before next refresh attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('❌ All refresh attempts failed', lastError);
    return false;
  }

  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T>(endpoint: string, data?: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }
}

export const api = new ApiClient();