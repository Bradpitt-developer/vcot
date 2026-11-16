import ExcelJS from "exceljs";
import type { Pool } from "pg";

import type { Department } from "../types";
import { guidedWorkflowState, GUIDED_OPERATIONS } from "./guided-workflow";

export type ReportStatus = "completed" | "uncompleted";

export type EmployeeReportInput = {
  from: string;
  to: string;
  department: Department | "ALL";
  operationId: string; // "all" or UUID
  status: ReportStatus;
};

export type EmployeeReportResult = {
  filename: string;
  contentType: string;
  base64: string;
};

type EmployeeRow = {
  id: string;
  name: string;
  department: Department;
};

type OperationRow = {
  id: string;
  name: string;
  department: Department;
};

type WorkEntryReportRow = {
  operation_id: string;
  operation_name: string;
  operation_department: Department;
  employee_id: string;
  employee_name: string;
  employee_department: Department;
  created_at: Date;
  entry_id: string;
  quantity: number;
  lot_no: string;
  production_lot_id: string | null;
  production_status: "active" | "completed" | null;
  production_meter: number | null;
};

type ActiveLotRow = {
  id: string;
  department: Department;
  lot_number: string;
  meter: number;
  area: number;
  width: number;
  panel: number;
  remarks: string | null;
  quantity: number;
  status: "active";
  created_at: Date;
  updated_at: Date;
};

type ProgressRow = {
  operation_name: string;
};

const TITLE_FILL = "0F5B4F";
const HEADER_FILL = "E8F5EF";
const BAND_FILL = "F7FAF8";
const PENDING_FILL = "FFF5E1";
const COMPLETE_FILL = "EAF8EF";

const departmentLabel = (_department: Department | "ALL") => "Petticoat";

const statusLabel = (status: ReportStatus) =>
  status === "completed" ? "Completed" : "Uncompleted";

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));

const safeSheetName = (value: string, suffix = "") =>
  `${value}${suffix}`
    .replace(/[\[\]:*?/\\]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Report";

const safeFilename = (value: string) =>
  value
    .replace(/[^a-z0-9_-]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const columnLetter = (column: number) => {
  let index = column;
  let result = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    index = Math.floor((index - 1) / 26);
  }
  return result;
};

async function loadReportData(pool: Pool, input: EmployeeReportInput) {
  const departmentParam = input.department === "ALL" ? null : input.department;
  const [employeesResult, operationsResult] = await Promise.all([
    pool.query<EmployeeRow>(
      `SELECT id, name, department
       FROM employees
       WHERE department = COALESCE($1, department)
         AND is_active = true
       ORDER BY department, name ASC`,
      [departmentParam],
    ),
    pool.query<OperationRow>(
      `SELECT id, name, department
       FROM operations
       WHERE department = COALESCE($1, department)
         AND is_active = true
       ORDER BY department, lower(name)`,
      [departmentParam],
    ),
  ]);

  const operations = operationsResult.rows.filter((operation) =>
    input.operationId === "all"
      ? true
      : operation.id === input.operationId,
  );

  const operationIds = operations.map((operation) => operation.id);
  if (operationIds.length === 0) {
    return {
      employees: employeesResult.rows,
      operations: [],
      entries: [],
      activeLots: [],
      progressByLot: new Map<string, string[]>(),
    };
  }

  const entriesResult = await pool.query<WorkEntryReportRow>(
    `SELECT e.operation_id,
            o.name AS operation_name,
            o.department AS operation_department,
            e.employee_id,
            emp.name AS employee_name,
            emp.department AS employee_department,
            e.created_at,
            e.id AS entry_id,
            e.quantity,
            e.lot_no,
            e.production_lot_id,
            p.status AS production_status,
            p.meter::double precision AS production_meter
     FROM work_entries e
     JOIN employees emp ON emp.id = e.employee_id
     JOIN operations o ON o.id = e.operation_id
     LEFT JOIN production_lots p ON p.id = e.production_lot_id
     WHERE ($1::text IS NULL OR e.department = $1)
       AND e.operation_id = ANY($2::uuid[])
       AND DATE(e.created_at AT TIME ZONE 'Asia/Kolkata')
           BETWEEN $3::date AND $4::date
       AND (
         p.status = $5
         OR ($5 = 'completed' AND e.production_lot_id IS NULL)
       )
     ORDER BY e.created_at ASC, o.department, o.name, emp.name, e.id`,
    [departmentParam, operationIds, input.from, input.to, input.status],
  );

  if (input.status === "completed") {
    return {
      employees: employeesResult.rows,
      operations,
      entries: entriesResult.rows,
      activeLots: [],
      progressByLot: new Map<string, string[]>(),
    };
  }

  const lotsResult = await pool.query<ActiveLotRow>(
    `SELECT id,
            department,
            lot_number,
            meter::double precision AS meter,
            area::double precision AS area,
            width::double precision AS width,
            panel::double precision AS panel,
            remarks,
            quantity,
            status,
            created_at,
            updated_at
     FROM production_lots
     WHERE status = 'active'
       AND ($1::text IS NULL OR department = $1)
       AND (
         DATE(updated_at AT TIME ZONE 'Asia/Kolkata') BETWEEN $2::date AND $3::date
         OR EXISTS (
           SELECT 1
           FROM work_entries e
           WHERE e.production_lot_id = production_lots.id
             AND DATE(e.created_at AT TIME ZONE 'Asia/Kolkata') BETWEEN $2::date AND $3::date
         )
         OR DATE(created_at AT TIME ZONE 'Asia/Kolkata') BETWEEN $2::date AND $3::date
       )
     ORDER BY updated_at DESC, lot_number`,
    [departmentParam, input.from, input.to],
  );

  const lotIds = lotsResult.rows.map((lot) => lot.id);
  const progressResult = lotIds.length
    ? await pool.query<{ production_lot_id: string; operation_name: string }>(
        `SELECT DISTINCT w.production_lot_id, o.name AS operation_name
         FROM work_entries w
         JOIN operations o ON o.id = w.operation_id
         WHERE w.production_lot_id = ANY($1::uuid[])`,
        [lotIds],
      )
    : { rows: [] as Array<{ production_lot_id: string; operation_name: string }> };

  const progressByLot = new Map<string, string[]>();
  for (const row of progressResult.rows) {
    const current = progressByLot.get(row.production_lot_id) ?? [];
    current.push(row.operation_name);
    progressByLot.set(row.production_lot_id, current);
  }

  return {
    employees: employeesResult.rows,
    operations,
    entries: entriesResult.rows,
    activeLots: lotsResult.rows,
    progressByLot,
  };
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  return String(value);
}

function addReportTitle(worksheet: ExcelJS.Worksheet, title: string, subtitle: string) {
  worksheet.mergeCells("A1:AZ1");
  worksheet.mergeCells("A2:AZ2");
  worksheet.getCell("A1").value = title;
  worksheet.getCell("A1").font = {
    size: 16,
    name: "Georgia",
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  worksheet.getCell("A1").alignment = { vertical: "middle" };
  worksheet.getCell("A1").border = {
    bottom: { style: "thin", color: { argb: "66FFFFFF" } },
  };
  worksheet.getCell("A2").value = subtitle;
  worksheet.getCell("A2").font = { size: 10, name: "Calibri", bold: true, color: { argb: "FF34594E" } };
  worksheet.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  worksheet.getRow(1).height = 32;
  worksheet.getRow(2).height = 22;
}

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: TITLE_FILL } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FFD5E7DE" } },
    bottom: { style: "thin", color: { argb: "FFD5E7DE" } },
    right: { style: "thin", color: { argb: "FFD5E7DE" } },
  };
}

function setupCompletedSheet(
  workbook: ExcelJS.Workbook,
  operation: OperationRow,
  entries: WorkEntryReportRow[],
  employeeIds: string[],
  assignedEmployeeNames: Map<string, string>,
  title: string,
  subtitle: string,
) {
  const sheetName = safeSheetName(operation.name);
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 2 }],
    pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });
  worksheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 };

  addReportTitle(worksheet, title, subtitle);

  const employees = employeeIds
    .map((id) => ({ id, name: assignedEmployeeNames.get(id) ?? "" }))
    .filter((employee) => employee.name);

  const entriesByDateAndEmployee = new Map<string, WorkEntryReportRow[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.created_at)
      .toISOString()
      .slice(0, 10);
    const key = `${dateKey}:${entry.employee_id}`;
    const items = entriesByDateAndEmployee.get(key) ?? [];
    items.push(entry);
    entriesByDateAndEmployee.set(key, items);
  }

  const dates = [...new Set(entries.map((entry) =>
    new Date(entry.created_at).toISOString().slice(0, 10),
  ))].sort();

  if (employees.length === 0 || dates.length === 0) {
    worksheet.getCell("A4").value =
      "No completed entries for the selected dates and filters.";
    worksheet.getCell("A4").font = {
      size: 11,
      italic: true,
      color: { argb: "FF8AAAA0" },
    };
    return worksheet;
  }

  const bandWidth = 6;
  employees.forEach((employee, employeeIndex) => {
    const base = employeeIndex * bandWidth + 1;
    worksheet.mergeCells(3, base, 3, base + 4);
    worksheet.getCell(3, base).value = employee.name.toUpperCase();
    worksheet.getCell(3, base).font = {
      name: "Georgia",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getCell(3, base).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: employeeIndex % 2 === 0 ? TITLE_FILL : "315F52" },
    };
    worksheet.getCell(3, base).alignment = { horizontal: "center", vertical: "middle" };
    ["Date", "name", "lot no.", "pcs", "TOTAL PCS"].forEach((value, offset) => {
      worksheet.getCell(4, base + offset).value = value;
    });
    for (let column = base; column <= base + 4; column += 1) {
      styleHeaderCell(worksheet.getCell(4, column));
    }
    worksheet.getColumn(base).width = 13;
    worksheet.getColumn(base + 1).width = 19;
    worksheet.getColumn(base + 2).width = 16;
    worksheet.getColumn(base + 3).width = 10;
    worksheet.getColumn(base + 4).width = 15;
    worksheet.getColumn(base + 5).width = 2;
  });

  let row = 5;
  for (const dateKey of dates) {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    const dateLabel = formatDate(date);

    employees.forEach((employee, employeeIndex) => {
      const base = employeeIndex * bandWidth + 1;
      const rows = entriesByDateAndEmployee.get(`${dateKey}:${employee.id}`) ?? [];
      const startRow = row;
      const maxRow = Math.max(rows.length, 1);

      worksheet.mergeCells(startRow, base, startRow + maxRow - 1, base);
      worksheet.getCell(startRow, base).value = dateLabel;
      worksheet.getCell(startRow, base).alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getCell(startRow, base + 1).value = employee.name.toUpperCase();
      worksheet.getCell(startRow, base + 1).alignment = { vertical: "middle", horizontal: "center" };

      let total = 0;
      rows.forEach((entry, entryIndex) => {
        const targetRow = row + entryIndex;
        worksheet.getCell(targetRow, base + 2).value = entry.lot_no;
        worksheet.getCell(targetRow, base + 3).value = Number(entry.quantity);
        total += Number(entry.quantity);
      });

      worksheet.mergeCells(startRow, base + 4, startRow + maxRow - 1, base + 4);
      worksheet.getCell(startRow, base + 4).value = total;
      worksheet.getCell(startRow, base + 4).alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getCell(startRow, base + 4).font = { bold: true, size: 11 };

      for (let fillRow = row; fillRow < row + maxRow; fillRow += 1) {
        for (let column = base; column <= base + 4; column += 1) {
          const cell = worksheet.getCell(fillRow, column);
          cell.border = {
            top: { style: "thin", color: { argb: "FFD5E7DE" } },
            bottom: { style: "thin", color: { argb: "FFD5E7DE" } },
            right: { style: "thin", color: { argb: "FFD5E7DE" } },
          };
          if (fillRow % 2 === 0) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
          }
        }
        worksheet.getRow(fillRow).height = 21;
      }
    });

    const maxEntries = employees.reduce((max, employee) => {
      const rows = entriesByDateAndEmployee.get(`${dateKey}:${employee.id}`) ?? [];
      return Math.max(max, rows.length);
    }, 1);

    row += maxEntries + 1;
  }

  const usedRange = `A3:${columnLetter(employees.length * bandWidth)}${row}`;
  worksheet.autoFilter = { from: "A4", to: `${columnLetter(employees.length * bandWidth)}4` };
  worksheet.pageSetup.printArea = usedRange;
  worksheet.views = [{ state: "frozen", ySplit: 2 }];
  return worksheet;
}

function setupUncompletedSheet(
  workbook: ExcelJS.Workbook,
  operations: OperationRow[],
  lots: ActiveLotRow[],
  progressByLot: Map<string, string[]>,
  department: Department | "ALL",
  title: string,
  subtitle: string,
) {
  const worksheet = workbook.addWorksheet("Uncompleted Lots", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 },
  });
  worksheet.pageSetup.margins = { left: 0.35, right: 0.35, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 };

  addReportTitle(worksheet, title, subtitle);

  const headers = [
    "Date",
    "Lot No.",
    "Meter",
    "Pcs",
    "Department",
    "Completed steps",
    ...GUIDED_OPERATIONS.map((operation) => operation),
    "Remarks",
  ];

  headers.forEach((header, index) => {
    worksheet.getCell(4, index + 1).value = header;
    styleHeaderCell(worksheet.getCell(4, index + 1));
  });

  const widths = [15, 16, 12, 10, 15, 36, ...GUIDED_OPERATIONS.map(() => 15), 42];
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  lots.forEach((lot, lotIndex) => {
    const rowIndex = lotIndex + 5;
    const completedSteps = progressByLot.get(lot.id) ?? [];
    const completedSet = new Set(completedSteps.map((name) => name.toLowerCase()));
    const workflow = guidedWorkflowState(completedSteps);

    worksheet.getCell(rowIndex, 1).value = formatDate(lot.updated_at);
    worksheet.getCell(rowIndex, 2).value = lot.lot_number;
    worksheet.getCell(rowIndex, 3).value = Number(lot.meter);
    worksheet.getCell(rowIndex, 4).value = Number(lot.quantity);
    worksheet.getCell(rowIndex, 5).value = departmentLabel(lot.department);
    worksheet.getCell(rowIndex, 6).value = completedSteps.length
      ? completedSteps.join(", ")
      : "Not started";

    GUIDED_OPERATIONS.forEach((operation, operationIndex) => {
      const cell = worksheet.getCell(rowIndex, 7 + operationIndex);
      cell.value = completedSet.has(operation.toLowerCase()) ? "✓ Done" : "Pending";
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = {
        bold: true,
        color: {
          argb: completedSet.has(operation.toLowerCase()) ? "FF1D7A4A" : "FF9A6500",
        },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: completedSet.has(operation.toLowerCase()) ? COMPLETE_FILL : PENDING_FILL,
        },
      };
    });

    worksheet.getCell(rowIndex, 7 + GUIDED_OPERATIONS.length).value = lot.remarks || "";
    worksheet.getCell(rowIndex, 7 + GUIDED_OPERATIONS.length).alignment = {
      wrapText: true,
      vertical: "middle",
    };

    for (let column = 1; column <= headers.length; column += 1) {
      worksheet.getCell(rowIndex, column).border = {
        top: { style: "thin", color: { argb: "FFD5E7DE" } },
        bottom: { style: "thin", color: { argb: "FFD5E7DE" } },
        right: { style: "thin", color: { argb: "FFD5E7DE" } },
      };
    }
    worksheet.getRow(rowIndex).height = 24;
    if (lotIndex % 2 === 1) {
      for (let column = 1; column <= headers.length; column += 1) {
        worksheet.getCell(rowIndex, column).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: BAND_FILL },
        };
      }
    }
  });

  if (lots.length === 0) {
    worksheet.getCell("A5").value =
      "No uncompleted lots for the selected dates and filters.";
    worksheet.getCell("A5").font = {
      size: 11,
      italic: true,
      color: { argb: "FF8AAAA0" },
    };
  }

  worksheet.autoFilter = { from: "A4", to: `${columnLetter(headers.length)}4` };
  return worksheet;
}

export async function buildEmployeeReport(pool: Pool, input: EmployeeReportInput): Promise<EmployeeReportResult> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Silai Saathi";
  workbook.created = new Date();
  workbook.modified = new Date();

  const { employees, operations, entries, activeLots, progressByLot } =
    await loadReportData(pool, input);

  const department = departmentLabel(input.department);
  const status = statusLabel(input.status);
  const fromLabel = formatDate(input.from);
  const toLabel = formatDate(input.to);
  const title = `${department} — ${status} Report`;
  const subtitle = `${fromLabel} to ${toLabel} · ${status} production lots · Generated by Silai Saathi`;

  if (input.status === "completed") {
    const employeesByOperation = new Map<string, string[]>();
    const namesByEmployee = new Map(employees.map((employee) => [employee.id, employee.name]));

    // Include every active employee assigned to the operation and every employee with entries.
    const assignmentRows = operations.length
      ? await pool.query<{ operation_id: string; employee_id: string }>(
          `SELECT DISTINCT eo.operation_id, eo.employee_id
           FROM employee_operations eo
           WHERE eo.operation_id = ANY($1::uuid[])`,
          [operations.map((operation) => operation.id)],
        )
      : { rows: [] };

    for (const operation of operations) {
      const ids = assignmentRows.rows
        .filter((row) => row.operation_id === operation.id)
        .map((row) => row.employee_id);
      const namesFromEntries = entries
        .filter((entry) => entry.operation_id === operation.id)
        .map((entry) => entry.employee_id);
      employeesByOperation.set(
        operation.id,
        [...new Set([...ids, ...namesFromEntries])].filter((id) =>
          namesByEmployee.has(id),
        ),
      );
    }

    for (const operation of operations) {
      const operationEntries = entries.filter(
        (entry) => entry.operation_id === operation.id,
      );
      const operationTitle = `${title} · ${operation.name}`;
      setupCompletedSheet(
        workbook,
        operation,
        operationEntries,
        employeesByOperation.get(operation.id) ?? [],
        namesByEmployee,
        operationTitle,
        subtitle,
      );
    }
  } else {
    setupUncompletedSheet(
      workbook,
      operations,
      activeLots,
      progressByLot,
      input.department,
      title,
      subtitle,
    );
  }

  const output = await workbook.xlsx.writeBuffer();
  const buffer =
    Buffer.isBuffer(output)
      ? output
      : output instanceof Uint8Array
        ? Buffer.from(output)
        : Buffer.from(output as unknown as ArrayBuffer);

  const operationPart = input.operationId === "all" ? "all" : "operation";
  const departmentPart = department === "ALL" ? "all" : safeFilename(department);
  const filename = `${safeFilename(
    `silai_saathi_${departmentPart}_${status}_${fromLabel}_to_${toLabel}_${operationPart}`,
  )}.xlsx`;

  return {
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: buffer.toString("base64"),
  };
}
