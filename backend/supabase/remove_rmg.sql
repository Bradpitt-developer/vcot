-- One-time Petticoat-only migration.
-- This permanently removes all RMG data. Run only after a full backup.

BEGIN;

DELETE FROM public.employee_operations eo
  USING public.employees e
  WHERE eo.employee_id = e.id
    AND e.department = 'RMG';

DELETE FROM public.employee_operations eo
  USING public.operations o
  WHERE eo.operation_id = o.id
    AND o.department = 'RMG';

DELETE FROM public.work_entries
  WHERE department = 'RMG';

DELETE FROM public.employees
  WHERE department = 'RMG';

DELETE FROM public.operations
  WHERE department = 'RMG';

DELETE FROM public.staff_users
  WHERE role = 'manager'
    AND department = 'RMG';

ALTER TABLE public.staff_users
  DROP CONSTRAINT IF EXISTS staff_users_department_check;

ALTER TABLE public.staff_users
  ADD CONSTRAINT staff_users_department_check
  CHECK (department IS NULL OR department = 'PETTICOAT');

ALTER TABLE public.staff_users
  DROP CONSTRAINT IF EXISTS staff_users_role_department_check;

ALTER TABLE public.staff_users
  ADD CONSTRAINT staff_users_role_department_check
  CHECK (
    (role = 'admin' AND department IS NULL)
    OR (role = 'manager' AND department = 'PETTICOAT')
  );

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_department_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_department_check
  CHECK (department = 'PETTICOAT');

ALTER TABLE public.operations
  DROP CONSTRAINT IF EXISTS operations_department_check;

ALTER TABLE public.operations
  ADD CONSTRAINT operations_department_check
  CHECK (department = 'PETTICOAT');

ALTER TABLE public.work_entries
  DROP CONSTRAINT IF EXISTS work_entries_department_check;

ALTER TABLE public.work_entries
  ADD CONSTRAINT work_entries_department_check
  CHECK (department = 'PETTICOAT');

COMMENT ON TABLE public.staff_users
  IS 'Admin and Petticoat manager login accounts.';
COMMENT ON TABLE public.employees
  IS 'Petticoat employees shown in the manager dropdown.';
COMMENT ON TABLE public.operations
  IS 'Petticoat operations shown in the manager dropdown.';

COMMIT;
