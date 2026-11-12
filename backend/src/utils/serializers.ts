import type {
  Employee,
  EmployeeRow,
  Operation,
  OperationRow,
  StaffUser,
  StaffUserRow,
  Timestamp,
  WorkEntry,
  WorkEntryRow,
} from "../types";

function toIso(value: Timestamp): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableIso(value: Timestamp | null): string | null {
  return value === null ? null : toIso(value);
}

export function toUser(
  row: StaffUserRow | null | undefined,
): StaffUser | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    department: row.department,
    isActive: row.is_active,
    lastLoginAt: toNullableIso(row.last_login_at),
    createdAt: toIso(row.created_at),
  };
}

export function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    isActive: row.is_active,
    createdAt: toIso(row.created_at),
  };
}

export function toOperation(row: OperationRow): Operation {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    isActive: row.is_active,
    createdAt: toIso(row.created_at),
  };
}

export function toEntry(row: WorkEntryRow): WorkEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    managerId: row.manager_id,
    managerName: row.manager_name,
    operationId: row.operation_id,
    operationName: row.operation_name,
    lotNo: row.lot_no,
    quantity: Number(row.quantity),
    department: row.department,
    createdAt: toIso(row.created_at),
  };
}
