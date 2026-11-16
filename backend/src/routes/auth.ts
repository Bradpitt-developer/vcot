import bcrypt from "bcryptjs";
import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

import { config } from "../config";
import { pool } from "../db";
import { authenticate, getAuthenticatedUser } from "../middleware/auth";
import type { LoginUserRow, StaffUser } from "../types";
import { asyncHandler } from "../utils/http";
import { toUser } from "../utils/serializers";
import {
  isDepartment,
  normalizeDepartment,
  normalizeUsername,
} from "../utils/validation";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
});

// Compared even when a username does not exist, so unknown and known usernames
// take a similar amount of time to answer.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", 10);

function signToken(
  user: Pick<StaffUser, "id" | "role" | "department">,
): string {
  return jwt.sign(
    { sub: user.id, role: user.role, department: user.department },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

function normalizePassword(value: unknown): string {
  return typeof value === "string" ? value : "";
}

router.post(
  "/manager/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const department = normalizeDepartment(req.body?.department);
    const username = normalizeUsername(req.body?.username);
    const password = normalizePassword(req.body?.password);

    if (!isDepartment(department)) {
      return res.status(400).json({ error: "Please choose Petticoat or RMG." });
    }
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Login ID and password are required." });
    }

    const { rows } = await pool.query<LoginUserRow>(
      `SELECT id, name, username, password_hash, role, department, is_active, last_login_at, created_at
       FROM staff_users
       WHERE username = $1 AND role = 'manager'`,
      [username],
    );

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password_hash || DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || user.department !== department) {
      return res.status(401).json({ error: "Invalid login ID or password." });
    }
    if (!user.is_active) {
      return res.status(403).json({
        error: "This account is disabled. Please contact your admin.",
      });
    }

    await pool.query(
      "UPDATE staff_users SET last_login_at = NOW() WHERE id = $1",
      [user.id],
    );

    return res.json({
      token: signToken(user),
      user: toUser(user),
    });
  }),
);

router.post(
  "/admin/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const password = normalizePassword(req.body?.password);

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Login ID and password are required." });
    }

    const { rows } = await pool.query<LoginUserRow>(
      `SELECT id, name, username, password_hash, role, department, is_active, last_login_at, created_at
       FROM staff_users
       WHERE username = $1 AND role = 'admin'`,
      [username],
    );

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password_hash || DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      return res
        .status(401)
        .json({ error: "Invalid admin login ID or password." });
    }
    if (!user.is_active) {
      return res.status(403).json({
        error: "This admin account is disabled. Please contact support.",
      });
    }

    await pool.query(
      "UPDATE staff_users SET last_login_at = NOW() WHERE id = $1",
      [user.id],
    );

    return res.json({
      token: signToken(user),
      user: toUser(user),
    });
  }),
);

router.get("/me", authenticate, (req, res) => {
  res.json({ user: getAuthenticatedUser(req) });
});

export default router;
