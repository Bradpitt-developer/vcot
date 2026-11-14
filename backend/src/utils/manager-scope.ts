import type { Request, Response } from "express";

import { getAuthenticatedUser } from "../middleware/auth";
import type { Department } from "../types";

export type ManagerScope = {
  id: string;
  department: Department;
};

export function managerScope(req: Request, res: Response): ManagerScope | null {
  const user = getAuthenticatedUser(req);

  if (!user.department) {
    res.status(403).json({
      error: "Your manager account has no section. Please contact your admin.",
    });
    return null;
  }

  return { id: user.id, department: user.department };
}
