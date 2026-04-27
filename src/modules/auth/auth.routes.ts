/**
 * Auth module — Routes.
 */
import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middlewares/validate";
import { registerSchema, loginSchema, refreshTokenSchema } from "./auth.validation";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshTokenSchema), authController.refreshToken);
router.post("/logout", authController.logout);

export { router as authRoutes };
