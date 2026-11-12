import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";

import { config } from "../config";
import { pool } from "../db";
import type { StaffRole, StaffUser, StaffUserRow } from "../types";
import { toUser } from "../utils/serializers";

async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      res.status(401).json({ error: "Please log in to continue." });
      return;
    }

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      res.status(401).json({
        error: "Your session has expired. Please log in again.",
      });
      return;
    }

    if (typeof payload === "string" || !payload.sub) {
      res.status(401).json({
        error: "Your session has expired. Please log in again.",
      });
      return;
    }

    const { rows } = await pool.query<StaffUserRow>(
      `SELECT id, name, username, role, department, is_active, last_login_at, created_at
       FROM staff_users
       WHERE id = $1 AND is_active = true`,
      [payload.sub],
    );

    const user = toUser(rows[0]);
    if (!user) {
      res.status(401).json({ error: "This account is no longer active." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(role: StaffRole): RequestHandler {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: "You do not have access to this action." });
      return;
    }
    next();
  };
}

/**
 * Routes behind `router.use(authenticate, ...)` always have a user. This helper
 * gives those handlers a non-optional value without scattering assertions.
 */
function getAuthenticatedUser(req: Request): StaffUser {
  if (!req.user) {
    throw new Error("Authenticated user is missing from the request.");
  }
  return req.user;
}

export { authenticate, requireRole, getAuthenticatedUser };
