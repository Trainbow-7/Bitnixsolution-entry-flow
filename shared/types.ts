export type Department = 'Tech Institute' | 'Dry Cleaning';

export type PurposeOfVisit =
  | 'Prospective Student'
  | 'Existing Trainee'
  | 'Dry Cleaning Customer'
  | 'Business Partner'
  | 'Job Applicant'
  | 'Vendor'
  | 'Other';

export type ExpectedDuration = '<15 min' | '15-30 min' | '30-60 min' | '1hr+';

export type VisitorStatus = 'In Progress' | 'Completed' | 'Cancelled';

export type UserRole = 'Receptionist' | 'Staff' | 'Admin';

export interface Staff {
  id: string;
  name: string;
  department: Department;
  role_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  linked_staff_id?: string | null;
  linked_staff?: Staff | null;
  created_at: string;
  updated_at: string;
}

export interface Visitor {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  arrival_datetime: string;
  purpose_of_visit: PurposeOfVisit;
  department: Department;
  staff_to_see_id?: string | null;
  staff_to_see?: Staff | null;
  services_requested?: string | null;
  expected_duration?: ExpectedDuration | null;
  checkout_datetime?: string | null;
  status: VisitorStatus;
  remarks?: string | null;
  check_in_method?: 'Manual Entry' | 'Barcode Scan' | 'QR Self Check-In' | string;
  created_by_user_id: string;
  created_by_user?: { id: string; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

export interface CheckInSession {
  id: string;
  token: string;
  kiosk_device_id?: string | null;
  created_at: string;
  expires_at: string;
  used_count: number;
  is_active: boolean;
}

export interface SelfCheckInPayload {
  full_name: string;
  phone_number: string;
  email?: string;
  department: Department;
  purpose_of_visit: PurposeOfVisit;
  staff_to_see_id?: string;
  services_requested?: string;
  expected_duration?: ExpectedDuration;
  remarks?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user?: { id: string; name: string; email: string; role: UserRole } | null;
  action: string;
  target_visitor_id?: string | null;
  target_visitor?: { id: string; full_name: string } | null;
  details?: Record<string, any> | null;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  data_retention_months: number;
  auto_archive_enabled: boolean;
  office_name: string;
  tech_institute_name: string;
  dry_cleaning_name: string;
  updated_at: string;
}

export interface DashboardStats {
  today_total: number;
  currently_in_office: number;
  today_completed: number;
  today_cancelled: number;
  visits_per_day: { date: string; count: number; tech_institute: number; dry_cleaning: number }[];
  by_purpose: { purpose: PurposeOfVisit; count: number }[];
  by_department: { department: Department; count: number }[];
  peak_hours: { hour: number; label: string; count: number }[];
  staff_workload: { staff_id: string; staff_name: string; department: Department; count: number }[];
}

export interface ReportFilterOptions {
  date_from?: string;
  date_to?: string;
  preset?: 'Today' | 'This Week' | 'This Month' | 'Custom';
  department?: Department | 'All';
  purpose_of_visit?: PurposeOfVisit | 'All';
  status?: VisitorStatus | 'All';
  staff_id?: string | 'All';
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    linked_staff_id?: string | null;
    linked_staff?: Staff | null;
  };
}
