/**
 * Express application setup.
 * All middleware and route mounting happens here.
 * The server (server.ts) imports this and calls .listen().
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { ApiResponse } from "./utils/apiResponse";

// ── Module routes ───────────────────────────────────
import { authRoutes } from "./modules/auth";
import { userRoutes } from "./modules/user";
import { contentRoutes } from "./modules/content";
import { postsRoutes } from "./modules/posts";
import { botRoutes } from "./modules/bot";

const app = express();

// ── Global middleware ───────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ────────────────────────────────────
app.get("/health", (_req, res) => {
  ApiResponse.success(res, {
    message: "Postly API is healthy 🚀",
    data: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// ── API routes ──────────────────────────────────────
const API_PREFIX = "/api/v1";

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/content`, contentRoutes);
app.use(`${API_PREFIX}/posts`, postsRoutes);
app.use(`${API_PREFIX}/bot`, botRoutes);

// ── 404 handler ─────────────────────────────────────
app.use((_req, res) => {
  ApiResponse.error(res, {
    statusCode: 404,
    message: "Route not found",
  });
});

// ── Global error handler (must be last) ─────────────
app.use(errorHandler);

export { app };
