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
  CONSTRAINT work_entries_employee_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees (id) ON DELETE RESTRICT,
  CONSTRAINT work_entries_manager_fkey
    FOREIGN KEY (manager_id) REFERENCES public.staff_users (id) ON DELETE RESTRICT,
  CONSTRAINT work_entries_operation_fkey
    FOREIGN KEY (operation_id) REFERENCES public.operations (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS work_entries_manager_created_idx
  ON public.work_entries (manager_id, created_at DESC);

CREATE INDEX IF NOT EXISTS work_entries_department_created_idx
  ON public.work_entries (department, created_at DESC);

CREATE INDEX IF NOT EXISTS work_entries_created_idx
  ON public.work_entries (created_at DESC);

CREATE INDEX IF NOT EXISTS work_entries_employee_idx
  ON public.work_entries (employee_id);

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

COMMENT ON TABLE public.staff_users IS 'Admin and Petticoat/RMG manager login accounts.';
COMMENT ON TABLE public.employees IS 'Employees shown in the manager work-entry dropdown.';
COMMENT ON TABLE public.operations IS 'Department-specific operations shown in the manager dropdown.';
COMMENT ON TABLE public.work_entries IS 'Production entries submitted by managers.';
