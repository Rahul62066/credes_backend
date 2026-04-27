/**
 * Auth module — Routes.
 *
 * POST /api/auth/register   — Create account
 * POST /api/auth/login      — Authenticate
 * POST /api/auth/refresh    — Rotate refresh token
 * POST /api/auth/logout     — Revoke refresh token
 * GET  /api/auth/me         — Current user (protected)
 */
import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middlewares/validate";
import { authGuard } from "../../middlewares/authGuard";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "./auth.validation";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", validate(logoutSchema), authController.logout);
router.get("/me", authGuard, authController.me);

export { router as authRoutes };
