// lib/api-client.ts
type FetchOptions = RequestInit & {
  skipRefresh?: boolean;
};

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<Response> | null = null;
  private isRedirecting = false;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    if (this.isRedirecting) {
      throw new Error('Session expired');
    }

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
        response = await fetch(url, {
          ...fetchOptions,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });
      } else {
        this.isRedirecting = true;
        // Перенаправляем на логин после небольшой задержки, чтобы текущий запрос завершился
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }, 0);
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
    this.refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    try {
      const response = await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return response.ok;
    } catch (error) {
      this.isRefreshing = false;
      this.refreshPromise = null;
      return false;
    }
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