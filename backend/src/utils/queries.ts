export const ENTRY_SELECT = `
  SELECT
    w.id,
    w.employee_id,
    e.name AS employee_name,
    w.manager_id,
    m.name AS manager_name,
    w.operation_id,
    o.name AS operation_name,
    w.lot_no,
    w.quantity,
    w.department,
    w.created_at
  FROM work_entries w
  JOIN employees e ON e.id = w.employee_id
  JOIN staff_users m ON m.id = w.manager_id
  JOIN operations o ON o.id = w.operation_id
`;

export const TODAY_FILTER = `(w.created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date`;
