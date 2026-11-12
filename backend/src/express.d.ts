import type { StaffUser } from "./types";

declare global {
  namespace Express {
    interface Request {
      /**
       * Set only after the `authenticate` middleware has verified the bearer
       * token and reloaded the account from PostgreSQL.
       */
      user?: StaffUser;
    }
  }
}

export {};
