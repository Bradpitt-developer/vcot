import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { config } from "./config";
import { pool } from "./db";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import managerRoutes from "./routes/manager";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());

const allowedOrigins: true | string[] =
  config.corsOrigin === "*"
    ? true
    : config.corsOrigin
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "unavailable", database: "disconnected" });
  }
});

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  }),
);

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/manager", managerRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Express error handler. SQL details and stack traces never reach the app.
const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid request body." });
    return;
  }

  console.error(`[${req.method} ${req.originalUrl}]`, error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
};

app.use(errorHandler);

export default app;
