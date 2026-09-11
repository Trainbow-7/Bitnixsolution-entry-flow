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

const API_BASE = '/api';

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
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string): Promise<AuthResponse> =>
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(handleResponse<AuthResponse>),

    me: (): Promise<{ user: User }> =>
      fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      }).then(handleResponse<{ user: User }>),
  },

  visitors: {
    getCurrentlyInOffice: (): Promise<Visitor[]> =>
      fetch(`${API_BASE}/visitors/currently-in-office`, {
        headers: getHeaders(),
      }).then(handleResponse<Visitor[]>),

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
      return fetch(`${API_BASE}/visitors?${searchParams.toString()}`, {
        headers: getHeaders(),
      }).then(handleResponse<{
        visitors: Visitor[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>);
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
      return fetch(`${API_BASE}/visitors/my-visitors?${searchParams.toString()}`, {
        headers: getHeaders(),
      }).then(handleResponse<{
        visitors: Visitor[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>);
    },

    getById: (id: string): Promise<Visitor> =>
      fetch(`${API_BASE}/visitors/${id}`, {
        headers: getHeaders(),
      }).then(handleResponse<Visitor>),

    checkIn: (data: Partial<Visitor>): Promise<Visitor> =>
      fetch(`${API_BASE}/visitors/checkin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse<Visitor>),

    checkOut: (id: string, remarks?: string): Promise<{ visitor: Visitor; duration_minutes: number; message: string }> =>
      fetch(`${API_BASE}/visitors/${id}/checkout`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ remarks }),
      }).then(handleResponse<{ visitor: Visitor; duration_minutes: number; message: string }>),

    cancel: (id: string, remarks?: string): Promise<{ visitor: Visitor; message: string }> =>
      fetch(`${API_BASE}/visitors/${id}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ remarks }),
      }).then(handleResponse<{ visitor: Visitor; message: string }>),

    update: (id: string, data: Partial<Visitor>): Promise<Visitor> =>
      fetch(`${API_BASE}/visitors/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse<Visitor>),

    getOverstayAlerts: (): Promise<OverstayAlertData[]> =>
      fetch(`${API_BASE}/visitors/overstay-alerts`, {
        headers: getHeaders(),
      }).then(handleResponse<OverstayAlertData[]>),
  },

  staff: {
    getAll: (department?: string): Promise<Staff[]> => {
      const q = department ? `?department=${encodeURIComponent(department)}` : '';
      return fetch(`${API_BASE}/staff${q}`, {
        headers: getHeaders(),
      }).then(handleResponse<Staff[]>);
    },

    create: (data: Partial<Staff>): Promise<Staff> =>
      fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse<Staff>),

    update: (id: string, data: Partial<Staff>): Promise<Staff> =>
      fetch(`${API_BASE}/staff/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse<Staff>),

    delete: (id: string): Promise<{ message: string }> =>
      fetch(`${API_BASE}/staff/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then(handleResponse<{ message: string }>),
  },

  users: {
    getAll: (): Promise<User[]> =>
      fetch(`${API_BASE}/users`, {
        headers: getHeaders(),
      }).then(handleResponse<User[]>),

    create: (data: any): Promise<User> =>
      fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse<User>),

    update: (id: string, data: any): Promise<User> =>
      fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse<User>),

    delete: (id: string): Promise<{ message: string }> =>
      fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then(handleResponse<{ message: string }>),
  },

  dashboard: {
    getStats: (): Promise<DashboardStats> =>
      fetch(`${API_BASE}/dashboard/stats`, {
        headers: getHeaders(),
      }).then(handleResponse<DashboardStats>),
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
      return fetch(`${API_BASE}/reports/data?${searchParams.toString()}`, {
        headers: getHeaders(),
      }).then(handleResponse<{
        summary: ReportSummary;
        visitors: Visitor[];
      }>);
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

    downloadPdf: async (params: Record<string, any> = {}) => {
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
      return fetch(`${API_BASE}/audit?${searchParams.toString()}`, {
        headers: getHeaders(),
      }).then(handleResponse<{
        logs: AuditLog[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>);
    },
  },

  settings: {
    get: (): Promise<SystemSettings> =>
      fetch(`${API_BASE}/settings`, {
        headers: getHeaders(),
      }).then(handleResponse<SystemSettings>),

    update: (data: Partial<SystemSettings>): Promise<SystemSettings> =>
      fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse<SystemSettings>),
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
      fetch(`${API_BASE}/checkin-sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ kiosk_device_id: kioskDeviceId }),
      }).then(handleResponse<{
        session: CheckInSession;
        token: string;
        expires_at: string;
        lan_ip?: string;
        checkin_url: string;
        network_checkin_url?: string;
      }>),

    getNetworkInfo: (): Promise<{
      lan_ip: string;
      web_port: number;
      api_port: number;
      suggested_terminal_url: string;
      suggested_checkin_url_prefix: string;
    }> =>
      fetch(`${API_BASE}/checkin-sessions/network-info`).then(
        handleResponse<{
          lan_ip: string;
          web_port: number;
          api_port: number;
          suggested_terminal_url: string;
          suggested_checkin_url_prefix: string;
        }>
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

    submitSelfCheckIn: (
      token: string,
      data: SelfCheckInPayload
    ): Promise<{
      success: boolean;
      message: string;
      visitor: any;
    }> =>
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

    getRecent: (): Promise<Visitor[]> =>
      fetch(`${API_BASE}/checkin-sessions/recent`).then(handleResponse<Visitor[]>),

    createEventSource: (): EventSource =>
      new EventSource(`${API_BASE}/checkin-sessions/stream`),
  },
};
