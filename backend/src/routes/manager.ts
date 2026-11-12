import express, { type Request, type Response } from "express";

import { pool } from "../db";
import {
  authenticate,
  getAuthenticatedUser,
  requireRole,
} from "../middleware/auth";
import type {
  Department,
  EmployeeBaseRow,
  EmployeeRow,
  OperationBaseRow,
  OperationRow,
  TodaySummaryRow,
  WorkEntryRow,
} from "../types";
import { asyncHandler } from "../utils/http";
import { ENTRY_SELECT, TODAY_FILTER } from "../utils/queries";
import { toEmployee, toEntry, toOperation } from "../utils/serializers";
import {
  cleanText,
  isPositiveInteger,
  isUuid,
  parseLimit,
} from "../utils/validation";

const router = express.Router();

router.use(authenticate, requireRole("manager"));

type ManagerScope = {
  id: string;
  department: Department;
};

/**
 * Manager accounts always have a department in the database. This responds with
 * a clear error instead of making a malformed account reach a SQL NOT NULL
 * constraint.
 */
function managerScope(req: Request, res: Response): ManagerScope | null {
  const user = getAuthenticatedUser(req);
  if (!user.department) {
    res.status(403).json({
      error: "Your manager account has no section. Please contact your admin.",
    });
    return null;
  }
  return { id: user.id, department: user.department };
}

router.get(
  "/home",
  asyncHandler(async (req, res) => {
    const scope = managerScope(req, res);
    if (!scope) return;

    const [employees, operations, entries, today] = await Promise.all([
      pool.query<EmployeeRow>(
        `SELECT id, name, department, is_active, created_at
         FROM employees
         WHERE department = $1 AND is_active = true
         ORDER BY name ASC`,
        [scope.department],
      ),
      pool.query<OperationRow>(
        `SELECT id, name, department, is_active, created_at
         FROM operations
         WHERE department = $1 AND is_active = true
         ORDER BY name ASC`,
        [scope.department],
      ),
      pool.query<WorkEntryRow>(
        `${ENTRY_SELECT}
         WHERE w.manager_id = $1
         ORDER BY w.created_at DESC
         LIMIT 20`,
        [scope.id],
      ),
      pool.query<TodaySummaryRow>(
        `SELECT count(*)::int AS entries, coalesce(sum(w.quantity), 0)::int AS pieces
         FROM work_entries w
         WHERE w.manager_id = $1 AND ${TODAY_FILTER}`,
        [scope.id],
      ),
    ]);

    res.json({
      employees: employees.rows.map(toEmployee),
      operations: operations.rows.map(toOperation),
      entries: entries.rows.map(toEntry),
      stats: {
        todayEntries: today.rows[0]?.entries ?? 0,
        todayPieces: today.rows[0]?.pieces ?? 0,
      },
    });
  }),
);

router.get(
  "/entries",
  asyncHandler(async (req, res) => {
    const scope = managerScope(req, res);
    if (!scope) return;

    const limit = parseLimit(req.query.limit, 100, 200);
    const { rows } = await pool.query<WorkEntryRow>(
      `${ENTRY_SELECT}
       WHERE w.manager_id = $1
       ORDER BY w.created_at DESC
       LIMIT $2`,
      [scope.id, limit],
    );
    res.json({ entries: rows.map(toEntry) });
  }),
);

router.post(
  "/entries",
  asyncHandler(async (req, res) => {
    const scope = managerScope(req, res);
    if (!scope) return;

    const employeeId = String(req.body?.employeeId || "");
    const operationId = String(req.body?.operationId || "");
    const lotNo = cleanText(req.body?.lotNo);
    const quantity = Number(req.body?.quantity);

    if (!isUuid(employeeId)) {
      return res.status(400).json({ error: "Please select an employee." });
    }
    if (!isUuid(operationId)) {
      return res.status(400).json({ error: "Please select an operation." });
    }
    if (!lotNo || lotNo.length > 40) {
      return res
        .status(400)
        .json({ error: "Lot number is required (maximum 40 characters)." });
    }
    if (!isPositiveInteger(quantity) || quantity > 1_000_000) {
      return res.status(400).json({
        error: "Quantity must be a whole number greater than zero.",
      });
    }

    const [employeeResult, operationResult] = await Promise.all([
      pool.query<EmployeeBaseRow>(
        "SELECT id, name, department, is_active FROM employees WHERE id = $1",
        [employeeId],
      ),
      pool.query<OperationBaseRow>(
        "SELECT id, name, department, is_active FROM operations WHERE id = $1",
        [operationId],
      ),
    ]);

    const employee = employeeResult.rows[0];
    const operation = operationResult.rows[0];

    if (
      !employee ||
      !employee.is_active ||
      employee.department !== scope.department
    ) {
      return res.status(400).json({
        error: "That employee is not available in your section.",
      });
    }

    if (
      !operation ||
      !operation.is_active ||
      operation.department !== scope.department
    ) {
      return res.status(400).json({
        error: "That operation is not available in your section.",
      });
    }

    const insert = await pool.query<{ id: string }>(
      `INSERT INTO work_entries
         (employee_id, manager_id, operation_id, department, lot_no, quantity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        employee.id,
        scope.id,
        operation.id,
        scope.department,
        lotNo,
        quantity,
      ],
    );

    const inserted = insert.rows[0];
    if (!inserted) {
      throw new Error("Work entry was not returned after creation.");
    }

    const { rows } = await pool.query<WorkEntryRow>(
      `${ENTRY_SELECT} WHERE w.id = $1`,
      [inserted.id],
    );

    const entry = rows[0];
    if (!entry) {
      throw new Error("Submitted work entry could not be loaded.");
    }

    return res.status(201).json({ entry: toEntry(entry) });
  }),
);

export default router;
