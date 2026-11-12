export const DEPARTMENTS = ["PETTICOAT", "RMG"] as const;

export type Department = (typeof DEPARTMENTS)[number];
export type StaffRole = "admin" | "manager";
export type Timestamp = Date | string;

/**
 * Shape returned by the API. Timestamps are normalized to ISO strings by the
 * serializers before they are sent to the mobile app.
 */
export interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
  department: Department | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  department: Department;
  isActive: boolean;
  createdAt: string;
}

export interface Operation {
  id: string;
  name: string;
  department: Department;
  isActive: boolean;
  createdAt: string;
}

export interface WorkEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  operationId: string;
  operationName: string;
  lotNo: string;
  quantity: number;
  department: Department;
  createdAt: string;
}

export interface StaffUserRow {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
  department: Department | null;
  is_active: boolean;
  last_login_at: Timestamp | null;
  created_at: Timestamp;
}

export interface LoginUserRow extends StaffUserRow {
  password_hash: string;
}

export interface EmployeeBaseRow {
  id: string;
  name: string;
  department: Department;
  is_active: boolean;
}

export interface EmployeeRow extends EmployeeBaseRow {
  created_at: Timestamp;
}

export interface OperationBaseRow {
  id: string;
  name: string;
  department: Department;
  is_active: boolean;
}

export interface OperationRow extends OperationBaseRow {
  created_at: Timestamp;
}

export interface WorkEntryRow {
  id: string;
  employee_id: string;
  employee_name: string;
  manager_id: string;
  manager_name: string;
  operation_id: string;
  operation_name: string;
  lot_no: string;
  quantity: number;
  department: Department;
  created_at: Timestamp;
}

export interface CountRow {
  count: number;
}

export interface TodaySummaryRow {
  entries: number;
  pieces: number;
}
