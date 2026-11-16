import type { Pool, PoolClient } from "pg";

import type { Department, Operation, OperationRow } from "../types";

type Queryable = Pool | PoolClient;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function normalizeOperationIds(input: unknown): ValidationResult<string[]> {
  if (input === undefined) return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "Choose the employee's operations." };
  }

  const unique = [...new Set(input.map((value) => String(value || "").trim()))].filter(
    Boolean,
  );

  if (unique.some((id) => !isUuid(id))) {
    return { ok: false, error: "One of the selected operations is invalid." };
  }

  return { ok: true, value: unique };
}

export async function validateOperationIds(
  db: Queryable,
  input: unknown,
  department: Department,
): Promise<ValidationResult<string[]>> {
  const normalized = normalizeOperationIds(input);
  if (!normalized.ok) return normalized;

  if (department === "RMG") return { ok: true, value: [] };

  if (normalized.value.length === 0) {
    return {
      ok: false,
      error: "Select at least one operation for this Petticoat employee.",
    };
  }

  const { rows } = await db.query<{ id: string }>(
    `SELECT id
     FROM operations
     WHERE id = ANY($1::uuid[])
       AND department = 'PETTICOAT'
       AND is_active = true`,
    [normalized.value],
  );

  if (rows.length !== normalized.value.length) {
    return {
      ok: false,
      error: "One or more selected operations are not available in Petticoat.",
    };
  }

  return { ok: true, value: normalized.value };
}

export async function loadEmployeeOperations(
  db: Queryable,
  employeeIds: string[],
): Promise<Map<string, Operation[]>> {
  const result = new Map<string, Operation[]>();
  if (employeeIds.length === 0) return result;

  const { rows } = await db.query<
    OperationRow & { employee_id: string }
  >(
    `SELECT o.id, o.name, o.department, o.is_active, o.created_at,
            eo.employee_id
     FROM employee_operations eo
     JOIN operations o ON o.id = eo.operation_id
     WHERE eo.employee_id = ANY($1::uuid[])
     ORDER BY lower(o.name)`,
    [employeeIds],
  );

  for (const row of rows) {
    const operation: Operation = {
      id: row.id,
      name: row.name,
      department: row.department,
      isActive: row.is_active,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
    };
    const current = result.get(row.employee_id) ?? [];
    current.push(operation);
    result.set(row.employee_id, current);
  }

  return result;
}

export async function replaceEmployeeOperations(
  db: Queryable,
  employeeId: string,
  operationIds: string[],
): Promise<void> {
  await db.query("DELETE FROM employee_operations WHERE employee_id = $1", [
    employeeId,
  ]);

  if (operationIds.length === 0) return;

  for (const operationId of operationIds) {
    await db.query(
      `INSERT INTO employee_operations (employee_id, operation_id)
       VALUES ($1, $2)`,
      [employeeId, operationId],
    );
  }
}
