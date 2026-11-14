import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import express from "express";

import { config } from "../config";
import { pool } from "../db";
import { authenticate, getAuthenticatedUser, requireRole } from "../middleware/auth";
import type {
  CountRow,
  Department,
  EmployeeRow,
  OperationRow,
  StaffUserRow,
  TodaySummaryRow,
  WorkEntryRow,
} from "../types";
import { asyncHandler } from "../utils/http";
import { ENTRY_SELECT, TODAY_FILTER } from "../utils/queries";
import {
  loadEmployeeOperations,
  replaceEmployeeOperations,
  validateOperationIds,
} from "../utils/employee-operations";
import { buildEmployeeReport } from "../utils/employee-report";
import {
  toEmployee,
  toEntry,
  toOperation,
  toUser,
} from "../utils/serializers";
import {
  cleanText,
  isDepartment,
  isUuid,
  normalizeDepartment,
  normalizeUsername,
  parseLimit,
  USERNAME_PATTERN,
} from "../utils/validation";

const router = express.Router();

router.use(authenticate, requireRole("admin"));

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function validateName(
  value: unknown,
  label: string,
  maxLength = 80,
): ValidationResult<string> {
  const name = cleanText(value);
  if (name.length < 2 || name.length > maxLength) {
    return {
      ok: false,
      error: `${label} must be between 2 and ${maxLength} characters.`,
    };
  }
  return { ok: true, value: name };
}

function validateUsername(value: unknown): ValidationResult<string> {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error:
        "Login ID must be 3-32 characters and can only contain letters, numbers, dots, dashes and underscores.",
    };
  }
  return { ok: true, value: username };
}

function validatePassword(value: unknown): ValidationResult<string> {
  if (typeof value !== "string") {
    return {
      ok: false,
      error: "Password is required.",
    };
  }

  const password = value.trim();
  if (password.length < 4 || password.length > 72) {
    return {
      ok: false,
      error: "Password must be at least 4 characters long.",
    };
  }
  return { ok: true, value: password };
}

function validateDepartment(value: unknown): ValidationResult<Department> {
  const department = normalizeDepartment(value);
  if (!isDepartment(department)) {
    return { ok: false, error: "Department must be Petticoat." };
  }
  return { ok: true, value: department };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23503"
  );
}

function isValidAdminManagePassword(value: unknown): boolean {
  if (!config.adminMasterPassword) return false;
  if (typeof value !== "string") return false;

  const supplied = Buffer.from(value);
  const expected = Buffer.from(config.adminMasterPassword);

  if (supplied.length !== expected.length) return false;

  return crypto.timingSafeEqual(supplied, expected);
}

const requireAdminManagePassword: express.RequestHandler = (
  req,
  res,
  next,
) => {
  if (!config.adminMasterPassword) {
    return res.status(503).json({
      error:
        "Admin management password is not configured on this server.",
    });
  }

  const supplied = req.get("x-admin-manage-password");
  if (!isValidAdminManagePassword(supplied)) {
    return res.status(403).json({
      error: "Enter the main admin password.",
    });
  }

  next();
};

function requestBody(req: express.Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [managers, employees, operations, today, recent] = await Promise.all([
      pool.query<CountRow>(
        "SELECT count(*)::int AS count FROM staff_users WHERE role = 'manager' AND is_active = true",
      ),
      pool.query<CountRow>(
        "SELECT count(*)::int AS count FROM employees WHERE is_active = true",
      ),
      pool.query<CountRow>(
        "SELECT count(*)::int AS count FROM operations WHERE is_active = true",
      ),
      pool.query<TodaySummaryRow>(
        `SELECT count(*)::int AS entries, coalesce(sum(w.quantity), 0)::int AS pieces
         FROM work_entries w
         WHERE ${TODAY_FILTER}`,
      ),
      pool.query<WorkEntryRow>(
        `${ENTRY_SELECT} ORDER BY w.created_at DESC LIMIT 8`,
      ),
    ]);

    res.json({
      stats: {
        activeManagers: managers.rows[0]?.count ?? 0,
        activeEmployees: employees.rows[0]?.count ?? 0,
        activeOperations: operations.rows[0]?.count ?? 0,
        todayEntries: today.rows[0]?.entries ?? 0,
        todayPieces: today.rows[0]?.pieces ?? 0,
      },
      recentEntries: recent.rows.map(toEntry),
    });
  }),
);

// ---------------------------------------------------------------------------
// Admin management (main admin password required)
// ---------------------------------------------------------------------------

router.get(
  "/admins",
  requireAdminManagePassword,
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query<StaffUserRow>(
      `SELECT id, name, username, role, department, is_active, last_login_at, created_at
       FROM staff_users
       WHERE role = 'admin'
       ORDER BY created_at ASC`,
    );
    return res.json({ admins: rows.map(toUser) });
  }),
);

router.post(
  "/admins",
  requireAdminManagePassword,
  asyncHandler(async (req, res) => {
    const body = requestBody(req);
    const name = validateName(body.name, "Admin name");
    const username = validateUsername(body.username);
    const password = validatePassword(body.password);

    if (!name.ok) return res.status(400).json({ error: name.error });
    if (!username.ok) return res.status(400).json({ error: username.error });
    if (!password.ok) return res.status(400).json({ error: password.error });

    const passwordHash = await bcrypt.hash(password.value, 10);

    try {
      const { rows } = await pool.query<StaffUserRow>(
        `INSERT INTO staff_users (name, username, password_hash, role, department)
         VALUES ($1, $2, $3, 'admin', NULL)
         RETURNING id, name, username, role, department, is_active, last_login_at, created_at`,
        [name.value, username.value, passwordHash],
      );
      return res.status(201).json({ admin: toUser(rows[0]) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res
          .status(409)
          .json({ error: "That login ID is already in use." });
      }
      throw error;
    }
  }),
);

router.delete(
  "/admins/:id",
  requireAdminManagePassword,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid admin ID." });
    }

    const existing = await pool.query<Pick<StaffUserRow, "id" | "name">>(
      "SELECT id, name FROM staff_users WHERE id = $1 AND role = 'admin'",
      [id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: "Admin not found." });
    }

    const authenticated = getAuthenticatedUser(req);
    if (authenticated.id === id) {
      return res.status(409).json({
        error: "You cannot delete your own admin account.",
      });
    }

    const count = await pool.query<CountRow>(
      "SELECT count(*)::int AS count FROM staff_users WHERE role = 'admin'",
    );
    if ((count.rows[0]?.count ?? 0) <= 1) {
      return res.status(409).json({
        error: "At least one admin account must remain.",
      });
    }

    await pool.query(
      "DELETE FROM staff_users WHERE id = $1 AND role = 'admin'",
      [id],
    );
    return res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Managers
// ---------------------------------------------------------------------------

router.get(
  "/managers",
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query<StaffUserRow>(
      `SELECT id, name, username, role, department, is_active, last_login_at, created_at
       FROM staff_users
       WHERE role = 'manager'
       ORDER BY is_active DESC, name ASC`,
    );
    res.json({ managers: rows.map((row) => toUser(row)) });
  }),
);

router.post(
  "/managers",
  asyncHandler(async (req, res) => {
    const body = requestBody(req);
    const name = validateName(body.name, "Manager name");
    const username = validateUsername(body.username);
    const password = validatePassword(body.password);
    const department = validateDepartment(body.department);

    if (!name.ok) return res.status(400).json({ error: name.error });
    if (!username.ok) return res.status(400).json({ error: username.error });
    if (!password.ok) return res.status(400).json({ error: password.error });
    if (!department.ok) {
      return res.status(400).json({ error: department.error });
    }

    const passwordHash = await bcrypt.hash(password.value, 10);

    try {
      const { rows } = await pool.query<StaffUserRow>(
        `INSERT INTO staff_users (name, username, password_hash, role, department)
         VALUES ($1, $2, $3, 'manager', $4)
         RETURNING id, name, username, role, department, is_active, last_login_at, created_at`,
        [name.value, username.value, passwordHash, department.value],
      );
      return res.status(201).json({ manager: toUser(rows[0]) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res
          .status(409)
          .json({ error: "That login ID is already in use." });
      }
      throw error;
    }
  }),
);

router.patch(
  "/managers/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid manager ID." });
    }

    const body = requestBody(req);
    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = validateName(body.name, "Manager name");
      if (!name.ok) return res.status(400).json({ error: name.error });
      values.push(name.value);
      sets.push(`name = $${values.length}`);
    }

    if (body.department !== undefined) {
      const department = validateDepartment(body.department);
      if (!department.ok) {
        return res.status(400).json({ error: department.error });
      }
      values.push(department.value);
      sets.push(`department = $${values.length}`);
    }

    if (body.password !== undefined) {
      const password = validatePassword(body.password);
      if (!password.ok) {
        return res.status(400).json({ error: password.error });
      }
      values.push(await bcrypt.hash(password.value, 10));
      sets.push(`password_hash = $${values.length}`);
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return res
          .status(400)
          .json({ error: "isActive must be true or false." });
      }
      values.push(body.isActive);
      sets.push(`is_active = $${values.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No valid changes supplied." });
    }

    sets.push("updated_at = NOW()");
    values.push(id);

    const { rows } = await pool.query<StaffUserRow>(
      `UPDATE staff_users
       SET ${sets.join(", ")}
       WHERE id = $${values.length} AND role = 'manager'
       RETURNING id, name, username, role, department, is_active, last_login_at, created_at`,
      values,
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Manager not found." });
    }
    return res.json({ manager: toUser(rows[0]) });
  }),
);

router.delete(
  "/managers/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid manager ID." });
    }

    const existing = await pool.query<Pick<StaffUserRow, "id" | "name">>(
      `SELECT id, name
       FROM staff_users
       WHERE id = $1 AND role = 'manager'`,
      [id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: "Manager not found." });
    }

    const entryCount = await pool.query<CountRow>(
      "SELECT count(*)::int AS count FROM work_entries WHERE manager_id = $1",
      [id],
    );
    if ((entryCount.rows[0]?.count ?? 0) > 0) {
      return res.status(409).json({
        error: `${existing.rows[0].name} has submitted production entries. Disable the account instead.`,
      });
    }

    try {
      await pool.query(
        "DELETE FROM staff_users WHERE id = $1 AND role = 'manager'",
        [id],
      );
      return res.status(204).end();
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        return res.status(409).json({
          error: "This manager has production entries. Disable the account instead.",
        });
      }
      throw error;
    }
  }),
);

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

router.get(
  "/employees",
  asyncHandler(async (req, res) => {
    const department = req.query.department
      ? normalizeDepartment(req.query.department)
      : null;

    if (department && !isDepartment(department)) {
      return res.status(400).json({ error: "Invalid department filter." });
    }

    const { rows } = await pool.query<EmployeeRow>(
      `SELECT id, name, department, is_active, created_at
       FROM employees
       WHERE ($1::text IS NULL OR department = $1)
       ORDER BY is_active DESC, department ASC, name ASC`,
      [department],
    );
    const operationMap = await loadEmployeeOperations(
      pool,
      rows.map((row) => row.id),
    );

    res.json({
      employees: rows.map((row) =>
        toEmployee(row, operationMap.get(row.id) ?? []),
      ),
    });
  }),
);

router.post(
  "/employees",
  asyncHandler(async (req, res) => {
    const body = requestBody(req);
    const name = validateName(body.name, "Employee name");
    const department = validateDepartment(body.department);

    if (!name.ok) return res.status(400).json({ error: name.error });
    if (!department.ok) {
      return res.status(400).json({ error: department.error });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const operationIds = await validateOperationIds(
        client,
        body.operationIds,
        department.value,
      );
      if (!operationIds.ok) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: operationIds.error });
      }

      const { rows } = await client.query<EmployeeRow>(
        `INSERT INTO employees (name, department)
         VALUES ($1, $2)
         RETURNING id, name, department, is_active, created_at`,
        [name.value, department.value],
      );

      const employee = rows[0];
      if (!employee) {
        throw new Error("Employee was not returned after creation.");
      }

      await replaceEmployeeOperations(
        client,
        employee.id,
        operationIds.value,
      );
      await client.query("COMMIT");

      const operationMap = await loadEmployeeOperations(pool, [employee.id]);
      return res.status(201).json({
        employee: toEmployee(employee, operationMap.get(employee.id) ?? []),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.patch(
  "/employees/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid employee ID." });
    }

    const body = requestBody(req);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existingResult = await client.query<EmployeeRow>(
        `SELECT id, name, department, is_active, created_at
         FROM employees
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Employee not found." });
      }

      let desiredDepartment: Department = existing.department;
      const sets: string[] = [];
      const values: unknown[] = [];

      if (body.name !== undefined) {
        const name = validateName(body.name, "Employee name");
        if (!name.ok) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: name.error });
        }
        values.push(name.value);
        sets.push(`name = $${values.length}`);
      }

      if (body.department !== undefined) {
        const department = validateDepartment(body.department);
        if (!department.ok) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: department.error });
        }
        desiredDepartment = department.value;
        values.push(department.value);
        sets.push(`department = $${values.length}`);
      }

      if (body.isActive !== undefined) {
        if (typeof body.isActive !== "boolean") {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({ error: "isActive must be true or false." });
        }
        values.push(body.isActive);
        sets.push(`is_active = $${values.length}`);
      }

      const requestedOperations =
        body.operationIds !== undefined ? body.operationIds : undefined;
      const shouldValidateOperations =
        requestedOperations !== undefined ||
        desiredDepartment !== existing.department;

      let operationIdsResult: Awaited<
        ReturnType<typeof validateOperationIds>
      > = { ok: true, value: [] };

      if (shouldValidateOperations) {
        operationIdsResult = await validateOperationIds(
          client,
          requestedOperations,
          desiredDepartment,
        );
      }

      if (!operationIdsResult.ok) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: operationIdsResult.error });
      }

      if (sets.length === 0 && !shouldValidateOperations) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "No valid changes supplied." });
      }

      let updated: EmployeeRow = existing;

      if (sets.length > 0) {
        sets.push("updated_at = NOW()");
        values.push(id);

        const { rows } = await client.query<EmployeeRow>(
          `UPDATE employees
           SET ${sets.join(", ")}
           WHERE id = $${values.length}
           RETURNING id, name, department, is_active, created_at`,
          values,
        );
        if (!rows[0]) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "Employee not found." });
        }
        updated = rows[0];
      }

      if (shouldValidateOperations) {
        await replaceEmployeeOperations(
          client,
          updated.id,
          operationIdsResult.value,
        );
      }

      await client.query("COMMIT");
      const operationMap = await loadEmployeeOperations(pool, [updated.id]);
      return res.json({
        employee: toEmployee(updated, operationMap.get(updated.id) ?? []),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.delete(
  "/employees/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid employee ID." });
    }

    const existing = await pool.query<Pick<EmployeeRow, "id" | "name">>(
      `SELECT id, name
       FROM employees
       WHERE id = $1`,
      [id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const entryCount = await pool.query<CountRow>(
      "SELECT count(*)::int AS count FROM work_entries WHERE employee_id = $1",
      [id],
    );
    if ((entryCount.rows[0]?.count ?? 0) > 0) {
      return res.status(409).json({
        error: `${existing.rows[0].name} has submitted production entries. Disable the employee instead.`,
      });
    }

    try {
      await pool.query("DELETE FROM employees WHERE id = $1", [id]);
      return res.status(204).end();
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        return res.status(409).json({
          error: "This employee has production entries. Disable the employee instead.",
        });
      }
      throw error;
    }
  }),
);

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

router.get(
  "/operations",
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query<OperationRow>(
      `SELECT id, name, department, is_active, created_at
       FROM operations
       ORDER BY is_active DESC, department ASC, name ASC`,
    );
    res.json({ operations: rows.map(toOperation) });
  }),
);

router.post(
  "/operations",
  asyncHandler(async (req, res) => {
    const body = requestBody(req);
    const name = validateName(body.name, "Operation name", 60);
    const department = validateDepartment(body.department);

    if (!name.ok) return res.status(400).json({ error: name.error });
    if (!department.ok) {
      return res.status(400).json({ error: department.error });
    }

    try {
      const { rows } = await pool.query<OperationRow>(
        `INSERT INTO operations (name, department)
         VALUES ($1, $2)
         RETURNING id, name, department, is_active, created_at`,
        [name.value, department.value],
      );
      return res.status(201).json({ operation: toOperation(rows[0]) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({
          error: "That operation already exists for this department.",
        });
      }
      throw error;
    }
  }),
);

router.patch(
  "/operations/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid operation ID." });
    }

    const body = requestBody(req);
    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = validateName(body.name, "Operation name", 60);
      if (!name.ok) return res.status(400).json({ error: name.error });
      values.push(name.value);
      sets.push(`name = $${values.length}`);
    }

    if (body.department !== undefined) {
      const department = validateDepartment(body.department);
      if (!department.ok) {
        return res.status(400).json({ error: department.error });
      }
      values.push(department.value);
      sets.push(`department = $${values.length}`);
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return res
          .status(400)
          .json({ error: "isActive must be true or false." });
      }
      values.push(body.isActive);
      sets.push(`is_active = $${values.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No valid changes supplied." });
    }

    sets.push("updated_at = NOW()");
    values.push(id);

    try {
      const { rows } = await pool.query<OperationRow>(
        `UPDATE operations
         SET ${sets.join(", ")}
         WHERE id = $${values.length}
         RETURNING id, name, department, is_active, created_at`,
        values,
      );

      if (!rows[0]) {
        return res.status(404).json({ error: "Operation not found." });
      }
      return res.json({ operation: toOperation(rows[0]) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({
          error: "That operation already exists for this department.",
        });
      }
      throw error;
    }
  }),
);

const REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REPORT_DAY_MS = 86_400_000;

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !REPORT_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dateKeyToUtc(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcKey(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

function todayInKolkata(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

// ---------------------------------------------------------------------------
// Work entries
// ---------------------------------------------------------------------------

router.get(
  "/entries/report",
  asyncHandler(async (req, res) => {
    const date = req.query.date;
    const department = req.query.department
      ? normalizeDepartment(req.query.department)
      : null;

    if (!isDateKey(date)) {
      return res.status(400).json({
        error: "Choose a report date in YYYY-MM-DD format.",
      });
    }

    if (
      department === null &&
      typeof req.query.department === "string" &&
      req.query.department.trim() !== ""
    ) {
      return res.status(400).json({ error: "Invalid department filter." });
    }

    if (department && !isDepartment(department)) {
      return res.status(400).json({ error: "Invalid department filter." });
    }

    const today = todayInKolkata();
    if (date > today) {
      return res.status(400).json({
        error: "Reports cannot be generated for a future date.",
      });
    }

    const oldestAllowed = utcKey(dateKeyToUtc(today) - 30 * REPORT_DAY_MS);
    if (date < oldestAllowed) {
      return res.status(400).json({
        error: "Reports are limited to the last 31 calendar days.",
      });
    }

    const values: Array<string> = [date];
    let where =
      "WHERE DATE(w.created_at AT TIME ZONE 'Asia/Kolkata') = $1::date";

    if (department) {
      values.push(department);
      where += ` AND w.department = $${values.length}`;
    }

    const { rows } = await pool.query<WorkEntryRow>(
      `${ENTRY_SELECT} ${where} ORDER BY w.created_at ASC`,
      values,
    );

    return res.json({ entries: rows.map(toEntry) });
  }),
);

router.get(
  "/reports/production",
  asyncHandler(async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    const status = String(req.query.status || "").trim().toLowerCase();
    const departmentQuery = req.query.department;
    const operationId = String(req.query.operationId || "all").trim();

    if (!isDateKey(from) || !isDateKey(to)) {
      return res.status(400).json({
        error: "Choose the report start and end dates in YYYY-MM-DD format.",
      });
    }
    if (from > to) {
      return res.status(400).json({
        error: "The start date cannot be after the end date.",
      });
    }

    const today = todayInKolkata();
    if (to > today) {
      return res.status(400).json({
        error: "Reports cannot be generated for future dates.",
      });
    }

    const inclusiveDays = (dateKeyToUtc(to) - dateKeyToUtc(from)) / 86_400_000 + 1;
    if (inclusiveDays > 31) {
      return res.status(400).json({
        error: "The selected report period cannot exceed 31 calendar days.",
      });
    }

    if (status !== "completed" && status !== "uncompleted") {
      return res.status(400).json({
        error: "Choose Completed or Uncompleted.",
      });
    }

    const department =
      typeof departmentQuery === "string" && departmentQuery.trim()
        ? normalizeDepartment(departmentQuery)
        : null;

    if (
      department === null &&
      typeof departmentQuery === "string" &&
      departmentQuery.trim()
    ) {
      return res.status(400).json({ error: "Invalid department filter." });
    }
    if (department && !isDepartment(department)) {
      return res.status(400).json({ error: "Invalid department filter." });
    }

    if (
      operationId !== "all" &&
      !isUuid(operationId)
    ) {
      return res.status(400).json({ error: "Invalid operation selection." });
    }

    const report = await buildEmployeeReport(pool, {
      from,
      to,
      department: (department ?? "ALL") as Department | "ALL",
      operationId,
      status,
    });

    return res.json({
      file: {
        filename: report.filename,
        contentType: report.contentType,
        base64: report.base64,
      },
    });
  }),
);

router.get(
  "/entries",
  asyncHandler(async (req, res) => {
    const department = req.query.department
      ? normalizeDepartment(req.query.department)
      : null;

    if (department && !isDepartment(department)) {
      return res.status(400).json({ error: "Invalid department filter." });
    }

    const limit = parseLimit(req.query.limit, 100, 200);
    const values: unknown[] = [];
    let where = "";

    if (department) {
      values.push(department);
      where = `WHERE w.department = $${values.length}`;
    }

    values.push(limit);
    const { rows } = await pool.query<WorkEntryRow>(
      `${ENTRY_SELECT} ${where} ORDER BY w.created_at DESC LIMIT $${values.length}`,
      values,
    );

    res.json({ entries: rows.map(toEntry) });
  }),
);

export default router;
