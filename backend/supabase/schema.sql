-- Silai Saathi — Supabase PostgreSQL schema
--
-- Run this with `npm run db:setup` from the backend folder.
--
-- To set up through the Supabase SQL Editor, run this file first and then run
-- seed.sql. The seed file creates the first admin user and starter operations.
--
-- The mobile app never talks to this database directly. It talks to the
-- Express API, which connects to Supabase as the database owner. Row Level
-- Security is therefore enabled with no public policies: anon/authenticated
-- keys cannot read or write these tables directly.

-- ---------------------------------------------------------------------------
-- Staff accounts (admin + department managers)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  username text NOT NULL UNIQUE CHECK (username = lower(username)),
  password_hash text NOT NULL CHECK (char_length(password_hash) > 0),
  role text NOT NULL CHECK (role IN ('admin', 'manager')),
  department text CHECK (department IN ('PETTICOAT', 'RMG')),
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_users_role_department_check CHECK (
    (role = 'admin' AND department IS NULL)
    OR (role = 'manager' AND department IN ('PETTICOAT', 'RMG'))
  )
);

CREATE INDEX IF NOT EXISTS staff_users_role_active_idx
  ON public.staff_users (role, is_active);

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  department text NOT NULL CHECK (department IN ('PETTICOAT', 'RMG')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employees_department_active_idx
  ON public.employees (department, is_active, name);

-- ---------------------------------------------------------------------------
-- Employee-to-operation assignments used by Petticoat workflow filtering
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.employee_operations (
  employee_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, operation_id),
  CONSTRAINT employee_operations_employee_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees (id) ON DELETE CASCADE,
  CONSTRAINT employee_operations_operation_fkey
    FOREIGN KEY (operation_id) REFERENCES public.operations (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS employee_operations_operation_idx
  ON public.employee_operations (operation_id, employee_id);

-- ---------------------------------------------------------------------------
-- Operations available in each department
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 60),
  department text NOT NULL CHECK (department IN ('PETTICOAT', 'RMG')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operations_department_name_unique
  ON public.operations (department, lower(name));

CREATE INDEX IF NOT EXISTS operations_department_active_idx
  ON public.operations (department, is_active, name);

-- ---------------------------------------------------------------------------
-- Guided production lots: one active cycle per Petticoat lot number
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.production_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  department text NOT NULL CHECK (department = 'PETTICOAT'),
  lot_number text NOT NULL CHECK (char_length(trim(lot_number)) BETWEEN 1 AND 40),
  meter numeric(12, 3) NOT NULL CHECK (meter >= 0),
  area numeric(12, 3) NOT NULL CHECK (area >= 0),
  width numeric(12, 3) NOT NULL CHECK (width >= 0),
  panel numeric(12, 3) NOT NULL CHECK (panel >= 0),
  remarks text CHECK (remarks IS NULL OR char_length(trim(remarks)) <= 300),
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 1000000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT production_lots_manager_fkey
    FOREIGN KEY (manager_id) REFERENCES public.staff_users (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS production_lots_active_lot_unique
  ON public.production_lots (department, lower(lot_number))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS production_lots_manager_status_idx
  ON public.production_lots (manager_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS production_lots_department_status_idx
  ON public.production_lots (department, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Submitted production entries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.work_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  department text NOT NULL CHECK (department IN ('PETTICOAT', 'RMG')),
  lot_no text NOT NULL CHECK (char_length(trim(lot_no)) BETWEEN 1 AND 40),
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 1000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  production_lot_id uuid,
  CONSTRAINT work_entries_employee_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees (id) ON DELETE RESTRICT,
  CONSTRAINT work_entries_manager_fkey
    FOREIGN KEY (manager_id) REFERENCES public.staff_users (id) ON DELETE RESTRICT,
  CONSTRAINT work_entries_operation_fkey
    FOREIGN KEY (operation_id) REFERENCES public.operations (id) ON DELETE RESTRICT,
  CONSTRAINT work_entries_production_lot_fkey
    FOREIGN KEY (production_lot_id) REFERENCES public.production_lots (id) ON DELETE RESTRICT
);

ALTER TABLE public.work_entries
  ADD COLUMN IF NOT EXISTS production_lot_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_entries_production_lot_fkey'
  ) THEN
    ALTER TABLE public.work_entries
      ADD CONSTRAINT work_entries_production_lot_fkey
      FOREIGN KEY (production_lot_id) REFERENCES public.production_lots (id) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS work_entries_manager_created_idx
  ON public.work_entries (manager_id, created_at DESC);

CREATE INDEX IF NOT EXISTS work_entries_department_created_idx
  ON public.work_entries (department, created_at DESC);

CREATE INDEX IF NOT EXISTS work_entries_created_idx
  ON public.work_entries (created_at DESC);

CREATE INDEX IF NOT EXISTS work_entries_employee_idx
  ON public.work_entries (employee_id);

CREATE INDEX IF NOT EXISTS work_entries_production_lot_idx
  ON public.work_entries (production_lot_id);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS production_lots_set_updated_at ON public.production_lots;
CREATE TRIGGER production_lots_set_updated_at
  BEFORE UPDATE ON public.production_lots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS staff_users_set_updated_at ON public.staff_users;
CREATE TRIGGER staff_users_set_updated_at
  BEFORE UPDATE ON public.staff_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS employees_set_updated_at ON public.employees;
CREATE TRIGGER employees_set_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS operations_set_updated_at ON public.operations;
CREATE TRIGGER operations_set_updated_at
  BEFORE UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock down direct API access. The Express server uses the database owner
-- connection, which bypasses RLS. No policies are intentionally created.
-- ---------------------------------------------------------------------------

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_operations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.staff_users IS 'Admin and Petticoat/RMG manager login accounts.';
COMMENT ON TABLE public.employees IS 'Employees shown in the manager work-entry dropdown.';
COMMENT ON TABLE public.employee_operations IS 'Operation categories assigned to each employee.';
COMMENT ON TABLE public.operations IS 'Department-specific operations shown in the manager dropdown.';
COMMENT ON TABLE public.work_entries IS 'Production entries submitted by managers.';
COMMENT ON TABLE public.production_lots IS 'Guided Petticoat production lot cycles from Cutting through Folding.';
