import {
  AuthResponse,
  DashboardStats,
  ReportSummary,
  Staff,
  SystemSettings,
  User,
  Visitor,
  AuditLog,
  CheckInSession,
  SelfCheckInPayload,
  OverstayAlertData,
} from '../types';
import { mockApi } from './mockEngine';

const ENV_API_URL = import.meta.env.VITE_API_URL;
const API_BASE = ENV_API_URL ? `${ENV_API_URL.replace(/\/+$/, '')}/api` : '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('bitnox_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An unexpected error occurred.';
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = `Server error: ${res.status} ${res.statusText}`;
    }
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

// Wrapper that attempts the live backend API, and falls back to mockApi if 404/5xx/network fails
async function withFallback<T>(apiFn: () => Promise<T>, fallbackFn: () => Promise<T>): Promise<T> {
  try {
    return await apiFn();
  } catch (err: any) {
    // If running on Vercel or backend returned 404 / 500 / 502 / network error
    const isServerError =
      err.status === 404 ||
      (err.status >= 500 && err.status <= 599) ||
      err.message?.includes('404') ||
      err.message?.includes('500') ||
      err.message?.includes('502') ||
      err.message?.includes('503') ||
      err.message?.includes('504') ||
      err.message?.includes('Server error') ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.name === 'TypeError';

    if (isServerError) {
      console.warn('[Bitnox API] Live API endpoint unavailable or returned 5xx, switching to local store fallback:', err.message);
      return await fallbackFn();
    }
    throw err;
  }
}

export const api = {
  auth: {
    login: (email: string, password: string): Promise<AuthResponse> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          }).then(handleResponse<AuthResponse>),
        () => mockApi.auth.login(email, password)
      ),

    me: (): Promise<{ user: User }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/auth/me`, {
            headers: getHeaders(),
          }).then(handleResponse<{ user: User }>),
        () => mockApi.auth.me()
      ),
  },

  visitors: {
    getCurrentlyInOffice: (): Promise<Visitor[]> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/visitors/currently-in-office`, {
            headers: getHeaders(),
          }).then(handleResponse<Visitor[]>),
        () => mockApi.visitors.getCurrentlyInOffice()
      ),

    getVisitors: (params: Record<string, any> = {}): Promise<{
      visitors: Visitor[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }> => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      return withFallback(
        () =>
          fetch(`${API_BASE}/visitors?${searchParams.toString()}`, {
            headers: getHeaders(),
          }).then(
            handleResponse<{
              visitors: Visitor[];
              total: number;
              page: number;
              limit: number;
              total_pages: number;
            }>
          ),
        () => mockApi.visitors.getVisitors(params)
      );
    },

    getMyVisitors: (params: Record<string, any> = {}): Promise<{
      visitors: Visitor[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }> => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      return withFallback(
        () =>
          fetch(`${API_BASE}/visitors/my-visitors?${searchParams.toString()}`, {
            headers: getHeaders(),
          }).then(
            handleResponse<{
              visitors: Visitor[];
              total: number;
              page: number;
              limit: number;
              total_pages: number;
            }>
          ),
        () => mockApi.visitors.getMyVisitors(params)
      );
    },

    getById: (id: string): Promise<Visitor> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/visitors/${id}`, {
            headers: getHeaders(),
          }).then(handleResponse<Visitor>),
        () => mockApi.visitors.getById(id)
      ),

    checkIn: (data: Partial<Visitor>): Promise<Visitor> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/visitors/checkin`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
          }).then(handleResponse<Visitor>),
        () => mockApi.visitors.checkIn(data)
      ),

    checkOut: (id: string, remarks?: string): Promise<{ visitor: Visitor; duration_minutes: number; message: string }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/visitors/${id}/checkout`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ remarks }),
          }).then(handleResponse<{ visitor: Visitor; duration_minutes: number; message: string }>),
        () => mockApi.visitors.checkOut(id, remarks)
      ),

    cancel: (id: string, remarks?: string): Promise<{ visitor: Visitor; message: string }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/visitors/${id}/cancel`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ remarks }),
          }).then(handleResponse<{ visitor: Visitor; message: string }>),
        () => mockApi.visitors.cancel(id, remarks)
      ),

    update: (id: string, data: Partial<Visitor>): Promise<Visitor> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/visitors/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
          }).then(handleResponse<Visitor>),
        () => mockApi.visitors.update(id, data)
      ),

    getOverstayAlerts: (): Promise<OverstayAlertData[]> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/visitors/overstay-alerts`, {
            headers: getHeaders(),
          }).then(handleResponse<OverstayAlertData[]>),
        () => mockApi.visitors.getOverstayAlerts()
      ),
  },

  staff: {
    getAll: (department?: string): Promise<Staff[]> => {
      const q = department ? `?department=${encodeURIComponent(department)}` : '';
      return withFallback(
        () =>
          fetch(`${API_BASE}/staff${q}`, {
            headers: getHeaders(),
          }).then(handleResponse<Staff[]>),
        () => mockApi.staff.getAll()
      );
    },

    create: (data: Partial<Staff>): Promise<Staff> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/staff`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
          }).then(handleResponse<Staff>),
        () => mockApi.staff.create(data)
      ),

    update: (id: string, data: Partial<Staff>): Promise<Staff> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/staff/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
          }).then(handleResponse<Staff>),
        () => mockApi.staff.update(id, data)
      ),

    delete: (id: string): Promise<{ message: string }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/staff/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          }).then(handleResponse<{ message: string }>),
        () => mockApi.staff.delete(id)
      ),
  },

  users: {
    getAll: (): Promise<User[]> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/users`, {
            headers: getHeaders(),
          }).then(handleResponse<User[]>),
        () => mockApi.users.getAll()
      ),

    create: (data: any): Promise<User> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
          }).then(handleResponse<User>),
        () => mockApi.users.create(data)
      ),

    update: (id: string, data: any): Promise<User> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/users/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
          }).then(handleResponse<User>),
        () => mockApi.users.update(id, data)
      ),

    delete: (id: string): Promise<{ message: string }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          }).then(handleResponse<{ message: string }>),
        () => mockApi.users.delete(id)
      ),
  },

  dashboard: {
    getStats: (): Promise<DashboardStats> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/dashboard/stats`, {
            headers: getHeaders(),
          }).then(handleResponse<DashboardStats>),
        () => mockApi.dashboard.getStats()
      ),
  },

  reports: {
    getData: (params: Record<string, any> = {}): Promise<{
      summary: ReportSummary;
      visitors: Visitor[];
    }> => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      return withFallback(
        () =>
          fetch(`${API_BASE}/reports/data?${searchParams.toString()}`, {
            headers: getHeaders(),
          }).then(
            handleResponse<{
              summary: ReportSummary;
              visitors: Visitor[];
            }>
          ),
        () => mockApi.reports.getData(params)
      );
    },

    getExcelUrl: (params: Record<string, any> = {}): string => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      const token = localStorage.getItem('bitnox_token') || '';
      searchParams.append('token', token);
      return `${API_BASE}/reports/export/excel?${searchParams.toString()}`;
    },

    getPdfUrl: (params: Record<string, any> = {}): string => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      const token = localStorage.getItem('bitnox_token') || '';
      searchParams.append('token', token);
      return `${API_BASE}/reports/export/pdf?${searchParams.toString()}`;
    },

    downloadExcel: async (params: Record<string, any> = {}) => {
      return withFallback(
        async () => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
              searchParams.append(k, String(v));
            }
          });
          const res = await fetch(`${API_BASE}/reports/export/excel?${searchParams.toString()}`, {
            headers: getHeaders(),
          });
          if (!res.ok) throw new Error('Excel download failed');
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bitnox_vms_report_${Date.now()}.xlsx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        },
        () => mockApi.reports.downloadExcel(params)
      );
    },

    downloadPdf: async (params: Record<string, any> = {}) => {
      return withFallback(
        async () => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
              searchParams.append(k, String(v));
            }
          });
          const res = await fetch(`${API_BASE}/reports/export/pdf?${searchParams.toString()}`, {
            headers: getHeaders(),
          });
          if (!res.ok) throw new Error('PDF download failed');
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bitnox_vms_report_${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        },
        () => mockApi.reports.downloadPdf(params)
      );
    },
  },

  audit: {
    getLogs: (params: Record<string, any> = {}): Promise<{
      logs: AuditLog[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }> => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      return withFallback(
        () =>
          fetch(`${API_BASE}/audit?${searchParams.toString()}`, {
            headers: getHeaders(),
          }).then(
            handleResponse<{
              logs: AuditLog[];
              total: number;
              page: number;
              limit: number;
              total_pages: number;
            }>
          ),
        () => mockApi.audit.getLogs(params)
      );
    },
  },

  settings: {
    get: (): Promise<SystemSettings> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/settings`, {
            headers: getHeaders(),
          }).then(handleResponse<SystemSettings>),
        () => mockApi.settings.get()
      ),

    update: (data: Partial<SystemSettings>): Promise<SystemSettings> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
          }).then(handleResponse<SystemSettings>),
        () => mockApi.settings.update(data)
      ),
  },

  checkinSessions: {
    createSession: (kioskDeviceId?: string): Promise<{
      session: CheckInSession;
      token: string;
      expires_at: string;
      lan_ip?: string;
      checkin_url: string;
      network_checkin_url?: string;
    }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/checkin-sessions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ kiosk_device_id: kioskDeviceId }),
          }).then(
            handleResponse<{
              session: CheckInSession;
              token: string;
              expires_at: string;
              lan_ip?: string;
              checkin_url: string;
              network_checkin_url?: string;
            }>
          ),
        () => mockApi.checkinSessions.createSession()
      ),

    getNetworkInfo: (): Promise<{
      lan_ip: string;
      web_port: number;
      api_port: number;
      suggested_terminal_url: string;
      suggested_checkin_url_prefix: string;
    }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/checkin-sessions/network-info`).then(
            handleResponse<{
              lan_ip: string;
              web_port: number;
              api_port: number;
              suggested_terminal_url: string;
              suggested_checkin_url_prefix: string;
            }>
          ),
        () => mockApi.checkinSessions.getNetworkInfo()
      ),

    getStatus: (token: string): Promise<{
      valid: boolean;
      token?: string;
      expires_at?: string;
      kiosk_device_id?: string;
      staff: Staff[];
      settings: any;
      reason?: string;
      error?: string;
    }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/checkin-sessions/${encodeURIComponent(token)}`).then(
            handleResponse<{
              valid: boolean;
              token?: string;
              expires_at?: string;
              kiosk_device_id?: string;
              staff: Staff[];
              settings: any;
              reason?: string;
              error?: string;
            }>
          ),
        () => mockApi.checkinSessions.getStatus(token)
      ),

    submitSelfCheckIn: (
      token: string,
      data: SelfCheckInPayload
    ): Promise<{
      success: boolean;
      message: string;
      visitor: any;
    }> =>
      withFallback(
        () =>
          fetch(`${API_BASE}/checkin-sessions/${encodeURIComponent(token)}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }).then(
            handleResponse<{
              success: boolean;
              message: string;
              visitor: any;
            }>
          ),
        () => mockApi.checkinSessions.submitSelfCheckIn(token, data)
      ),

    getRecent: (): Promise<Visitor[]> =>
      withFallback(
        () => fetch(`${API_BASE}/checkin-sessions/recent`).then(handleResponse<Visitor[]>),
        () => mockApi.checkinSessions.getRecent()
      ),

    createEventSource: (): EventSource => {
      try {
        return new EventSource(`${API_BASE}/checkin-sessions/stream`);
      } catch {
        return mockApi.checkinSessions.createEventSource();
      }
    },
  },
};
