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
import { dashboardRoutes } from "./modules/dashboard";
import { whatsappRoutes } from "./modules/whatsapp";
import { oauthRoutes } from "./modules/oauth";

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
app.get("/", (_req, res) => {
  ApiResponse.success(res, {
    message: "Postly API is working perfectly 🚀",
    data: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});
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
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/oauth", oauthRoutes);

// ── Webhook routes ──────────────────────────────────
app.use("/webhooks/whatsapp", whatsappRoutes);

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
