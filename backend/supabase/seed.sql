-- Silai Saathi starter data
--
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- It is safe to run more than once. Existing accounts, employees, work
-- history, and custom data are preserved. Previous starter operations are
-- disabled (not deleted) so they no longer appear in the manager dropdown.
--
-- Starter logins:
--   Admin:        admin        / Admin@123
--   Petticoat mgr:  peticot1..5  / Manager@123
--
-- IMPORTANT: Change these passwords before entering real factory data.
--
-- To seed a different admin password before running this file, generate a
-- bcrypt hash from the backend folder:
--   node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 10))"
-- Then replace the admin password_hash value below with the output.
--
-- The manager accounts share the password Manager@123 for easy testing. You can
-- generate a different bcrypt hash and replace the manager hash in the same way.

-- ---------------------------------------------------------------------------
-- First admin account (created only when no admin exists)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  admin_username text := 'admin';
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff_users WHERE role = 'admin') THEN
    RAISE NOTICE 'An admin account already exists. No admin was created.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_users WHERE username = lower(admin_username)
  ) THEN
    RAISE EXCEPTION
      'The username "%" is already used by another account. Choose another admin username.',
      lower(admin_username);
  END IF;

  INSERT INTO public.staff_users (
    name,
    username,
    password_hash,
    role,
    department
  )
  VALUES (
    'Administrator',
    lower(admin_username),
    '$2b$10$VSmwFyTUDWs7JeIr1RbIROcKwR7oA0bejBTARkps6j7nZEHxXSGY2',
    'admin',
    NULL
  );

  RAISE NOTICE 'Admin account created with username: %', lower(admin_username);
END
$$;

-- ---------------------------------------------------------------------------
-- Managers: 5 Petticoat
-- Password for all seeded managers: Manager@123
-- ---------------------------------------------------------------------------

INSERT INTO public.staff_users (
  name,
  username,
  password_hash,
  role,
  department
)
VALUES
  (
    'Ramesh Yadav',
    'peticot1',
    '$2b$10$tt2c/KQl2yEUxLj/CkPWLOA0pDA9K5CvfwoGXl8jZlIqcMJlmpZwe',
    'manager',
    'PETTICOAT'
  ),
  (
    'Suresh Patel',
    'peticot2',
    '$2b$10$tt2c/KQl2yEUxLj/CkPWLOA0pDA9K5CvfwoGXl8jZlIqcMJlmpZwe',
    'manager',
    'PETTICOAT'
  ),
  (
    'Anil Sharma',
    'peticot3',
    '$2b$10$tt2c/KQl2yEUxLj/CkPWLOA0pDA9K5CvfwoGXl8jZlIqcMJlmpZwe',
    'manager',
    'PETTICOAT'
  ),
  (
    'Deepak Verma',
    'peticot4',
    '$2b$10$tt2c/KQl2yEUxLj/CkPWLOA0pDA9K5CvfwoGXl8jZlIqcMJlmpZwe',
    'manager',
    'PETTICOAT'
  ),
  (
    'Manoj Kumar',
    'peticot5',
    '$2b$10$tt2c/KQl2yEUxLj/CkPWLOA0pDA9K5CvfwoGXl8jZlIqcMJlmpZwe',
    'manager',
    'PETTICOAT'
  )
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Employees: 10 Petticoat
-- ---------------------------------------------------------------------------

INSERT INTO public.employees (name, department)
SELECT seed.name, seed.department
FROM (
  VALUES
    ('Anil Kumar', 'PETTICOAT'),
    ('Meena Kumari', 'PETTICOAT'),
    ('Rahul Singh', 'PETTICOAT'),
    ('Sunita Devi', 'PETTICOAT'),
    ('Kavita Sharma', 'PETTICOAT'),
    ('Ravi Prasad', 'PETTICOAT'),
    ('Pooja Verma', 'PETTICOAT'),
    ('Ajay Yadav', 'PETTICOAT'),
    ('Neha Gupta', 'PETTICOAT'),
    ('Suresh Kumar', 'PETTICOAT')
) AS seed(name, department)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees AS existing
  WHERE existing.department = seed.department
    AND lower(existing.name) = lower(seed.name)
);

-- ---------------------------------------------------------------------------
-- Operations: 8 Petticoat.
-- Cutting is required for the guided Petticoat production workflow.
-- ---------------------------------------------------------------------------
-- Operations shown in the manager dropdown after login.
-- ---------------------------------------------------------------------------

INSERT INTO public.operations (name, department)
VALUES
  ('Cutting', 'PETTICOAT'),
  ('Kamarpatti', 'PETTICOAT'),
  ('Interlock', 'PETTICOAT'),
  ('Bottom', 'PETTICOAT'),
  ('Dhoka', 'PETTICOAT'),
  ('Folding', 'PETTICOAT'),
  ('Dori', 'PETTICOAT'),
  ('Nada', 'PETTICOAT')
ON CONFLICT DO NOTHING;

-- If you already ran an older seed, hide the previous starter operations
-- while keeping their work history. They can be re-enabled from Admin > Setup.
UPDATE public.operations
SET is_active = false
WHERE name IN (
  'Stitching', 'Elastic fitting', 'Finishing',
  'Packing', 'Checking', 'Ironing'
)
AND department = 'PETTICOAT'
AND is_active = true;

-- Optional verification (remove the leading dashes to run):
-- SELECT role, department, count(*) FROM public.staff_users GROUP BY role, department ORDER BY role, department;
-- SELECT department, count(*) FROM public.employees GROUP BY department ORDER BY department;
-- SELECT department, count(*) FROM public.operations GROUP BY department ORDER BY department;
