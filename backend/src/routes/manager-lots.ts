import express, { type Request, type Response } from "express";

import { pool } from "../db";
import {
  authenticate,
  requireRole,
} from "../middleware/auth";
import type {
  ProductionLotRow,
} from "../types";
import { asyncHandler } from "../utils/http";
import { managerScope } from "../utils/manager-scope";
import {
  guidedWorkflowState,
  GUIDED_OPERATIONS,
  MIDDLE_OPERATIONS,
} from "../utils/guided-workflow";
import { toEntry, toProductionLot } from "../utils/serializers";
import {
  cleanText,
  isPositiveInteger,
  isUuid,
} from "../utils/validation";

const router = express.Router();

router.use(authenticate, requireRole("manager"));

const GUIDED_SCOPE = "PETTICOAT" as const;
const MIDDLE_SET = new Set(MIDDLE_OPERATIONS.map((operation) => operation.toLowerCase()));

type RequestBody = Record<string, unknown>;
type Params = Record<string, string>;

function bodyOf(req: Request): RequestBody {
  return (req.body ?? {}) as RequestBody;
}

function paramsOf(req: Request): Params {
  return req.params as Params;
}

function numericInput(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function requestManagerScope(req: Request, res: Response) {
  const scope = managerScope(req, res);
  if (!scope) return null;

  if (scope.department !== GUIDED_SCOPE) {
    res.status(403).json({
      error: "The guided production workflow is available only in Petticoat.",
    });
    return null;
  }

  return scope;
}

async function loadLotsWithProgress(department: string) {
  const lotResult = await pool.query<ProductionLotRow>(
    `SELECT id, manager_id, department, lot_number,
            meter::double precision AS meter,
            area::double precision AS area,
            width::double precision AS width,
            panel::double precision AS panel,
            remarks, quantity, status, created_at, updated_at, completed_at
     FROM production_lots
     WHERE department = $1 AND status = 'active'
     ORDER BY created_at ASC`,
    [department],
  );

  if (lotResult.rows.length === 0) return [];

  const ids = lotResult.rows.map((lot) => lot.id);
  const steps = await pool.query<{ production_lot_id: string; operation_name: string }>(
    `SELECT DISTINCT w.production_lot_id, o.name AS operation_name
     FROM work_entries w
     JOIN operations o ON o.id = w.operation_id
     WHERE w.production_lot_id = ANY($1::uuid[])`,
    [ids],
  );

  const completedByLot = new Map<string, string[]>();
  for (const step of steps.rows) {
    const names = completedByLot.get(step.production_lot_id) ?? [];
    names.push(step.operation_name);
    completedByLot.set(step.production_lot_id, names);
  }

  return lotResult.rows.map((lot) =>
    toProductionLot(lot, completedByLot.get(lot.id) ?? []),
  );
}

router.get(
  "/lots/:lotNumber",
  asyncHandler(async (req, res) => {
    const scope = requestManagerScope(req, res);
    if (!scope) return;

    const lotNumber = cleanText(req.params.lotNumber);
    if (!lotNumber || lotNumber.length > 40) {
      return res.status(400).json({ error: "Enter a valid lot number." });
    }

    const lotResult = await pool.query<ProductionLotRow>(
      `SELECT id, manager_id, department, lot_number,
              meter::double precision AS meter,
              area::double precision AS area,
              width::double precision AS width,
              panel::double precision AS panel,
              remarks, quantity, status, created_at, updated_at, completed_at
       FROM production_lots
       WHERE department = 'PETTICOAT'
         AND status = 'active'
         AND lower(lot_number) = lower($1)
       LIMIT 1`,
      [lotNumber],
    );

    const lot = lotResult.rows[0];
    if (!lot) return res.json({ lot: null });

    const steps = await pool.query<{ operation_name: string }>(
      `SELECT DISTINCT o.name AS operation_name
       FROM work_entries w
       JOIN operations o ON o.id = w.operation_id
       WHERE w.production_lot_id = $1`,
      [lot.id],
    );

    return res.json({
      lot: toProductionLot(
        lot,
        steps.rows.map((step) => step.operation_name),
      ),
    });
  }),
);

router.get(
  "/lots",
  asyncHandler(async (req, res) => {
    const scope = requestManagerScope(req, res);
    if (!scope) return;

    const lots = await loadLotsWithProgress(scope.department);
    return res.json({ lots });
  }),
);

router.post(
  "/lots",
  asyncHandler(async (req, res) => {
    const scope = requestManagerScope(req, res);
    if (!scope) return;

    const body = bodyOf(req);
    const employeeId = String(body.employeeId || "").trim();
    const lotNumber = cleanText(body.lotNo);
    const meter = numericInput(body.meter);
    const area = numericInput(body.area);
    const width = numericInput(body.width);
    const panel = numericInput(body.panel);
    const remarks = cleanText(body.remarks);
    const quantity = Number(body.quantity);

    for (const [label, value] of Object.entries({ meter, area, width, panel })) {
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          error: `${label.charAt(0).toUpperCase() + label.slice(1)} must be zero or a positive number.`,
        });
      }
    }

    if (!isUuid(employeeId)) {
      return res.status(400).json({ error: "Please select an employee." });
    }
    if (!lotNumber || lotNumber.length > 40) {
      return res.status(400).json({
        error: "Lot number is required (maximum 40 characters).",
      });
    }
    if (remarks.length > 300) {
      return res.status(400).json({
        error: "Remarks must be 300 characters or fewer.",
      });
    }
    if (!isPositiveInteger(quantity) || quantity > 1_000_000) {
      return res.status(400).json({
        error: "Quantity must be a whole number from 1 to 1,000,000.",
      });
    }

    const cuttingResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM operations
       WHERE department = 'PETTICOAT'
         AND lower(name) = lower($1)
         AND is_active = true
       LIMIT 1`,
      ["Cutting"],
    );

    const cuttingOperation = cuttingResult.rows[0];
    if (!cuttingOperation) {
      return res.status(400).json({
        error: "Cutting operation is not available. Please ask admin to add it.",
      });
    }

    const employeeResult = await pool.query<{
      id: string;
      department: string;
      is_active: boolean;
    }>(
      `SELECT id, department, is_active
       FROM employees
       WHERE id = $1`,
      [employeeId],
    );

    const employee = employeeResult.rows[0];
    if (
      !employee ||
      !employee.is_active ||
      employee.department !== scope.department
    ) {
      return res.status(400).json({
        error: "That employee is not available in your section.",
      });
    }

    const existing = await pool.query<{ id: string }>(
      `SELECT id
       FROM production_lots
       WHERE department = 'PETTICOAT'
         AND lower(lot_number) = lower($1)
         AND status = 'active'
       LIMIT 1`,
      [lotNumber],
    );

    if (existing.rows[0]) {
      return res.status(409).json({
        error: `Lot ${lotNumber} is currently in use. Complete it before reusing it.`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const inserted = await client.query<ProductionLotRow>(
        `INSERT INTO production_lots
           (manager_id, department, lot_number, meter, area, width, panel, remarks, quantity)
         VALUES ($1, 'PETTICOAT', $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, manager_id, department, lot_number,
                   meter::double precision AS meter,
                   area::double precision AS area,
                   width::double precision AS width,
                   panel::double precision AS panel,
                   remarks, quantity, status, created_at, updated_at, completed_at`,
        [
          scope.id,
          lotNumber,
          meter,
          area,
          width,
          panel,
          remarks || null,
          quantity,
        ],
      );

      const lot = inserted.rows[0];
      if (!lot) {
        throw new Error("Production lot was not returned after creation.");
      }

      await client.query(
        `INSERT INTO work_entries
           (employee_id, manager_id, operation_id, department, lot_no, quantity, production_lot_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          employee.id,
          scope.id,
          cuttingOperation.id,
          scope.department,
          lotNumber,
          lot.quantity,
          lot.id,
        ],
      );

      await client.query("COMMIT");
      return res.status(201).json({ lot: toProductionLot(lot, ["Cutting"]) });
    } catch (error: unknown) {
      await client.query("ROLLBACK");

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "23505"
      ) {
        return res.status(409).json({
          error: `Lot ${lotNumber} is currently in use. Complete it before reusing it.`,
        });
      }

      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/lots/:lotId/steps",
  asyncHandler(async (req, res) => {
    const scope = requestManagerScope(req, res);
    if (!scope) return;

    const params = paramsOf(req);
    const lotId = String(params.lotId || "").trim();
    const body = bodyOf(req);
    const employeeId = String(body.employeeId || "").trim();
    const operationId = String(body.operationId || "").trim();

    if (!isUuid(lotId)) {
      return res.status(400).json({ error: "Invalid lot ID." });
    }
    if (!isUuid(employeeId)) {
      return res.status(400).json({ error: "Please select an employee." });
    }
    if (!isUuid(operationId)) {
      return res.status(400).json({ error: "Please select an operation." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const lotResult = await client.query<ProductionLotRow>(
        `SELECT id, manager_id, department, lot_number,
                meter::double precision AS meter,
                area::double precision AS area,
                width::double precision AS width,
                panel::double precision AS panel,
                remarks, quantity, status, created_at, updated_at, completed_at
         FROM production_lots
         WHERE id = $1 AND department = 'PETTICOAT'
         FOR UPDATE`,
        [lotId],
      );

      const lot = lotResult.rows[0];
      if (!lot) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Production lot not found." });
      }
      if (lot.status !== "active") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "This lot is completed and locked.",
        });
      }

      const operationResult = await client.query<{
        id: string;
        name: string;
      }>(
        `SELECT id, name
         FROM operations
         WHERE id = $1
           AND department = 'PETTICOAT'
           AND is_active = true`,
        [operationId],
      );

      const operation = operationResult.rows[0];
      if (!operation) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "That operation is not available in Petticoat.",
        });
      }

      const guidedName = GUIDED_OPERATIONS.find(
        (candidate) => candidate.toLowerCase() === operation.name.trim().toLowerCase(),
      );
      if (!guidedName || guidedName === "Cutting") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Choose the next guided workflow operation.",
        });
      }

      const stepsResult = await client.query<{ operation_name: string }>(
        `SELECT DISTINCT o.name AS operation_name
         FROM work_entries w
         JOIN operations o ON o.id = w.operation_id
         WHERE w.production_lot_id = $1`,
        [lot.id],
      );

      const completed = stepsResult.rows.map((step) => step.operation_name);
      const state = guidedWorkflowState(completed);
      const allowed = state.availableOperations.map((operationName) =>
        operationName.toLowerCase(),
      );

      if (!allowed.includes(guidedName.toLowerCase())) {
        await client.query("ROLLBACK");
        const requiredMiddle = MIDDLE_OPERATIONS.join(", ");
        return res.status(400).json({
          error:
            guidedName === "Dhoka"
              ? `Complete ${requiredMiddle} before Dhoka.`
              : guidedName === "Folding"
                ? "Complete Dhoka before Folding."
                : `This step is not available yet. Complete ${state.availableOperations.join(" or ")} first.`,
        });
      }

      const employeeResult = await client.query<{
        id: string;
        department: string;
        is_active: boolean;
      }>(
        `SELECT id, department, is_active
         FROM employees
         WHERE id = $1`,
        [employeeId],
      );

      const employee = employeeResult.rows[0];
      if (
        !employee ||
        !employee.is_active ||
        employee.department !== scope.department
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "That employee is not available in your section.",
        });
      }

      await client.query(
        `INSERT INTO work_entries
           (employee_id, manager_id, operation_id, department, lot_no, quantity, production_lot_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          employee.id,
          scope.id,
          operation.id,
          scope.department,
          lot.lot_number,
          lot.quantity,
          lot.id,
        ],
      );

      let updatedLot = lot;
      const newCompleted = [...completed, operation.name];
      const newState = guidedWorkflowState(newCompleted);

      if (newState.isComplete) {
        const completed = await client.query<ProductionLotRow>(
          `UPDATE production_lots
           SET status = 'completed',
               completed_at = NOW(),
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, manager_id, department, lot_number,
                     meter::double precision AS meter,
                     area::double precision AS area,
                     width::double precision AS width,
                     panel::double precision AS panel,
                     remarks, quantity, status, created_at, updated_at, completed_at`,
          [lot.id],
        );
        updatedLot = completed.rows[0] ?? updatedLot;
      } else {
        const touched = await client.query<ProductionLotRow>(
          `UPDATE production_lots
           SET updated_at = NOW()
           WHERE id = $1
           RETURNING id, manager_id, department, lot_number,
                     meter::double precision AS meter,
                     area::double precision AS area,
                     width::double precision AS width,
                     panel::double precision AS panel,
                     remarks, quantity, status, created_at, updated_at, completed_at`,
          [lot.id],
        );
        updatedLot = touched.rows[0] ?? updatedLot;
      }

      await client.query("COMMIT");
      return res.status(201).json({ lot: toProductionLot(updatedLot, newCompleted) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

export default router;
