# Silai Saathi setup guide

This guide takes the project from a fresh copy to a working app backed by
Supabase PostgreSQL. Preview mode (the default in Expo development) works
without any of these steps; use it to try the interface first.

## 1. What you need

- Node.js 20 or newer.
- npm.
- A phone with **Expo Go** installed (for the mobile app).
- A free or paid [Supabase](https://supabase.com) project.
- A computer and phone on the same Wi-Fi network for local testing.

Check Node:

```powershell
node --version
npm --version
```

## 2. Install project dependencies

From the repository root:

```powershell
npm install
npm --prefix mobile install
npm --prefix backend install
```

There are two independent npm projects. The root scripts simply forward to
them.

## 3. Create the Supabase database

1. Sign in to Supabase and create a new project.
2. Choose the region closest to the factory. For India, a Mumbai
   (`ap-south-1`) region is usually the lowest-latency choice.
3. Save the database password somewhere safe. It is not the same as your
   Supabase account password.
4. Wait until the project finishes provisioning.

### Get the connection string

In the Supabase dashboard, open:

**Project Settings → Database → Connection string → URI**

Copy the URI and replace the password placeholder with the database password.

If your network/computer cannot reach the direct `db.<project-ref>.supabase.co`
host (this is often an IPv6 issue), use the **Session pooler** URI instead. A
session pooler URL looks like this:

```text
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Use the **session** pooler (port `5432`) for this Express server. If your
password contains characters such as `@`, `#`, `/`, or `:`, percent-encode it:

```powershell
node -e "console.log(encodeURIComponent('your-password-here'))"
```

Put the encoded password into the URL.

> The setup script and API connect as the database owner. They never use a
> Supabase anon or service-role key. This is why RLS can stay locked down with no
> public policies.

## 4. Configure the backend

Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Open `backend/.env` and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | No | `development` locally, `production` when deployed |
| `HOST` | No | `0.0.0.0` so phones on the LAN can connect |
| `PORT` | No | Defaults to `4000` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL URI |
| `DATABASE_SSL` | No | Defaults to `true`; set `false` only for a local non-SSL database |
| `DATABASE_SSL_STRICT` | No | `true` verifies the certificate; requires `DATABASE_CA` |
| `DATABASE_CA` | No | PEM certificate when strict verification is enabled |
| `JWT_SECRET` | Yes | At least 32 characters; use a long random value |
| `JWT_EXPIRES_IN` | No | Defaults to `7d` |
| `CORS_ORIGIN` | No | Defaults to `*`; use a specific web origin in production |
| `ADMIN_USERNAME` | Setup only | First admin login ID; default `admin` |
| `ADMIN_PASSWORD` | Setup only | First admin password; default `Admin@123` |
| `ADMIN_NAME` | Setup only | Optional display name for the first admin |
| `RESET_ADMIN_PASSWORD` | Setup only | Set `true` to reset the first admin's password |

Generate a strong JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output into `JWT_SECRET`.

Example minimal backend `.env` for a Supabase project:

```dotenv
NODE_ENV=development
HOST=0.0.0.0
PORT=4000
DATABASE_URL=postgresql://postgres.abcdefgh:my%40password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
DATABASE_SSL_STRICT=false
JWT_SECRET=paste-a-long-random-secret-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-before-going-live
```

Never commit `backend/.env`. It is already ignored by Git.

## 5. Create the schema and first admin

From the repository root:

```powershell
npm run db:setup
```

This script:

- applies `backend/supabase/schema.sql`,
- creates the first admin if no admin exists,
- adds starter Petticoat and RMG operations.

It is safe to run again. Existing staff accounts and work entries are kept.
Operations are only added when they are missing. If an admin already exists, the
password is **not** changed unless you explicitly set
`RESET_ADMIN_PASSWORD=true`.

### Reset an admin password

Set the desired `ADMIN_PASSWORD` and `RESET_ADMIN_PASSWORD=true` in
`backend/.env`, then run:

```powershell
npm run db:setup
```

Remove `RESET_ADMIN_PASSWORD` afterward. The setup script resets the oldest admin
account. If you have more than one admin, verify which account was changed.

### Using the Supabase SQL editor instead

You can create everything manually from the Supabase dashboard:

1. Open **SQL Editor → New query**.
2. Paste the complete contents of `backend/supabase/schema.sql` and click
   **Run**.
3. Open another new query.
4. Paste the complete contents of `backend/supabase/seed.sql` and click **Run**.

`seed.sql` creates:

- The first admin account: login ID `admin`, password `Admin@123`.
- 10 manager accounts, all with password `Manager@123`:
  - Petticoat: `peticot1` through `peticot5`
    (The department is now Petticoat; existing login IDs were intentionally not renamed.)
  - RMG: `rmg1` through `rmg5`
- 20 employees: 10 Petticoat and 10 RMG.
- Seven starter operations in each section: Kamarpatti, Interlock, Bottom,
  Dhoka, Folding, Dori, and Nada.

If you previously ran an older seed, running the current seed again also
disables the previous starter operations (Cutting, Stitching, Elastic fitting,
Finishing, Packing, Checking, and Ironing). Their work history is kept, and the
admin can re-enable them from **Setup** if needed.

The seed file is safe to run more than once. It will not create a second admin,
duplicate managers or employees, or duplicate operations. It will not overwrite
an existing admin or manager password.

To use a different admin password, generate a bcrypt hash before running the
seed:

```powershell
cd backend
node -e "console.log(require('bcryptjs').hashSync('YOUR_NEW_PASSWORD', 10))"
```

Replace the existing `password_hash` value in `seed.sql` with the output. You can
also edit the admin display name in the same `INSERT` statement.

Using SQL Editor does **not** replace the need to set `DATABASE_URL` in
`backend/.env`; the Express API still needs that connection string to run.

## 6. Start the API

Development mode with automatic restart on file changes:

```powershell
npm run backend
```

Compiled start (builds the TypeScript source first, then runs `backend/dist`):

```powershell
npm run backend:start
```

The terminal should show:

```text
Database connected.
Silai Saathi API listening on http://localhost:4000
Phone on the same Wi-Fi: http://192.168.1.25:4000
```

Test it from the computer:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Expected result:

```json
{ "status": "ok", "database": "connected" }
```

If the server cannot connect, it exits and prints a configuration or database
error. See [Troubleshooting](#troubleshooting).

## 7. Point the mobile app at the API

Create the mobile environment file:

```powershell
Copy-Item mobile\.env.example mobile\.env
```

Set `EXPO_PUBLIC_API_URL` to the API address the **phone** can reach. Use the
computer's Wi-Fi/LAN address, not `localhost`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000
```

Find the computer's IPv4 address on Windows:

```powershell
ipconfig
```

Look for the IPv4 address of the active Wi-Fi adapter. The backend also prints
the correct candidate addresses when it starts.

Rules:

- Leave `EXPO_PUBLIC_API_URL` unset/empty to use preview mode in Expo
  development only. Release builds must have the live API address.
- Set it to a LAN address for a phone on the same Wi-Fi.
- Set it to a publicly reachable HTTPS address for a distributed build.
- Do not use `http://localhost:4000` on a physical phone; localhost means the
  phone itself.
- Restart Expo after changing `.env`.

## 8. Run the app with Expo Go

For live mode, make sure the backend is running first.

From the repository root:

```powershell
npm run start
```

Or, from `mobile/`:

```powershell
npx expo start -c
```

Then:

1. Keep the phone and computer on the same Wi-Fi.
2. Open Expo Go on the phone.
3. Scan the QR code in the terminal. On Android, Expo Go can scan it from the
   app. On iOS, use the Camera app.
4. Tap **Login**, choose Petticoat or RMG, and sign in with the admin-created login.

### If the phone cannot reach the API

- Confirm the backend is running on port `4000`.
- Open `http://<computer-lan-ip>:4000/health` in the phone's browser. It should
  return JSON, not time out.
- Allow Node.js through the Windows firewall for private networks, or create an
  inbound rule for TCP port `4000`.
- Check that the phone is not on a guest Wi-Fi network that blocks
  device-to-device traffic.
- Use the LAN address printed by the backend, not `localhost`.
- Restart Expo with `npx expo start -c` after editing `mobile/.env`.
- For remote/tunnel development, `npx expo start --tunnel` only tunnels Metro.
  The API URL still needs to be reachable by the phone (a deployed HTTPS API or
  a temporary public tunnel).

## 9. First-use checklist

1. Sign in as the admin.
2. Open **People** and create at least one Petticoat and one RMG manager.
3. Add employees to both sections.
4. Open **Setup** and check the starter operations. Add or disable operations if
   the factory uses different names.
5. Log out and sign in as a manager.
6. Confirm that only the manager's section employees and operations appear.
7. Submit a test entry and verify it appears in the manager's history and the
   admin's entries.
8. Disable a test employee and confirm that they disappear from the manager
   dropdown without deleting their historical entries.

## 10. Building the Android app

The project uses EAS Build. You need an Expo account and project configuration.

Preview APK (internal distribution):

```powershell
cd mobile
npx eas build --platform android --profile preview
```

Production AAB:

```powershell
cd mobile
npx eas build --platform android --profile production
```

Set `EXPO_PUBLIC_API_URL` in the EAS environment for the build profile. A build
installed on phones outside your Wi-Fi needs an API address the phone can reach
over the internet. Use HTTPS for a production build.

The app identifiers are already set in `mobile/app.config.ts`:

- Android package: `com.silaisaathi.app`
- iOS bundle identifier: `com.silaisaathi.app`
- Android version code: `1`

Change these identifiers if you publish under a different organization.

## 11. Deploying the API

The API is a normal Express server. You can deploy it to a VPS, Render, Railway,
Fly.io, or another Node.js host. Only the `backend` folder is needed on the
server. For the complete VPS walkthrough, see
[`backend/README.md`](../backend/README.md).

Production requirements:

- Set all environment variables in the host's secret manager, not in Git.
- Set `NODE_ENV=production`.
- Use a long random `JWT_SECRET`.
- Set `CORS_ORIGIN` to your exact web origin(s) if you serve a web client. Leave
  it as `*` only for development.
- Terminate TLS at the host or a reverse proxy and expose the API over HTTPS.
- Use `DATABASE_SSL=true`. Enable `DATABASE_SSL_STRICT=true` and provide
  `DATABASE_CA` when your environment can verify Supabase's certificate.
- Keep the database service alive and monitor `/health`.
- Configure Supabase backups and alerts.
- Do not put a Supabase service-role key in the mobile app or in any
  `EXPO_PUBLIC_*` variable.

After deployment, set `mobile/.env` (and the EAS environment) to the production
API URL and rebuild the app.

## 12. How authentication works

- Admin and manager passwords are hashed with bcrypt in the Express API.
- Login returns a JWT containing the staff user ID and role.
- The phone stores only the JWT in AsyncStorage.
- Every protected request sends `Authorization: Bearer <token>`.
- The API looks the user up on every request and rejects disabled accounts.
- The API checks the manager's own section when listing or submitting entries.
- Rate limiting protects login and general API traffic.
- RLS is enabled on all tables; no public policies are created.

The preview/demo auth is a separate local implementation and is only for UI
testing. Do not use preview mode for real factory accounts.

## 13. Database and retention notes

The schema uses these tables:

- `staff_users` — admins and Petticoat/RMG managers.
- `employees` — workers shown in section-specific manager dropdowns.
- `operations` — section-specific operations.
- `work_entries` — submitted production entries.

There is no delete endpoint in the app. Managers and employees are disabled
rather than deleted, and historical work entries remain. Foreign keys use
`ON DELETE RESTRICT`, so direct database deletion cannot silently destroy
production history.

"Today" totals use the `Asia/Kolkata` timezone in PostgreSQL. This keeps the
counts aligned with the factory's Indian working day.

## 14. Troubleshooting

### `DATABASE_URL is missing`

Create `backend/.env` from `backend/.env.example`. The API looks for it in the
backend folder, not the repository root.

### `Configuration error: JWT_SECRET must be at least 32 characters long`

Generate a longer secret and update `backend/.env`.

### `password authentication failed`

- Check the Supabase database password.
- Percent-encode special characters in `DATABASE_URL`.
- Make sure the username/project reference matches the connection string from
  the dashboard.
- Use the session pooler URI if direct connections fail.

### `getaddrinfo ENOTFOUND` or database timeout

- Check your internet connection.
- Try the Supabase session pooler connection string.
- Confirm the project is not paused in Supabase.
- Check whether your network blocks outbound PostgreSQL connections.

### SSL errors

- Supabase with `DATABASE_SSL=true` is the normal setup.
- Only set `DATABASE_SSL=false` for a local PostgreSQL server that does not
  support SSL.
- Strict verification additionally needs a valid CA certificate. If you enable
  `DATABASE_SSL_STRICT=true` without `DATABASE_CA`, certificate verification may
  fail.

### Mobile app says "Cannot reach the server"

- On the phone, open `http://<lan-ip>:4000/health`.
- Confirm the phone and computer are on the same network.
- Start the backend before opening the app.
- Check `mobile/.env` and restart Expo after any change.
- Do not use `localhost` in the phone's API URL.

### Mobile app is still using preview mode

Preview mode is available only in Expo development builds. In development, it
is selected when `EXPO_PUBLIC_API_URL` is absent or empty. Create `mobile/.env`,
set the URL, then fully restart Expo with `npx expo start -c`.

A release build without an API URL will show a configuration error instead of
using preview data.

### Expo Go shows a version/SDK mismatch

Update Expo Go from the app store, or use the SDK version expected by the
project (Expo SDK 57). Expo Go must support the project's SDK.

### Login rate limit reached

Login attempts are limited per IP. Wait 15 minutes or restart the development
API if you are testing locally.

### A disabled manager is still signed in

The API rejects disabled accounts on their next request and returns a session
error. If the phone is offline, reopen the app after reconnecting. All protected
operations re-check the account in the database.

## 15. Preview mode details

Preview mode is selected automatically in Expo development when no API URL is
configured. Release builds never use preview mode.

- It seeds sample managers, employees, operations, and entries.
- It stores data in AsyncStorage on the device or browser.
- It includes quick **Use preview login** cards on the login screens.
- Clearing app/site data resets the sample database.
- Passwords in preview data are local plain-text samples and are not production
  credentials.

To switch back to preview mode during development, remove or empty
`EXPO_PUBLIC_API_URL` in
`mobile/.env` and restart Expo.
