/**
 * User module — Routes.
 *
 * All routes are protected behind authGuard.
 *
 * GET    /api/user/profile             — Get current user profile
 * PUT    /api/user/profile             — Update profile
 * GET    /api/user/social-accounts     — List connected social accounts
 * POST   /api/user/social-accounts     — Connect a social account
 * DELETE /api/user/social-accounts/:id — Disconnect a social account
 * PUT    /api/user/ai-keys             — Update AI API keys
 */
import { Router } from "express";
import { userController } from "./user.controller";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import {
  updateProfileSchema,
  connectSocialAccountSchema,
  socialAccountIdParamSchema,
  updateAiKeysSchema,
} from "./user.validation";

const router = Router();

// All user routes require authentication
router.use(authGuard);

// ── Profile ───────────────────────────────────────
router.get("/profile", userController.getProfile);
router.put("/profile", validate(updateProfileSchema), userController.updateProfile);

// ── Social Accounts ───────────────────────────────
router.get("/social-accounts", userController.listSocialAccounts);
router.post(
  "/social-accounts",
  validate(connectSocialAccountSchema),
  userController.connectSocialAccount
);
router.delete(
  "/social-accounts/:id",
  validate(socialAccountIdParamSchema, "params"),
  userController.disconnectSocialAccount
);

// ── AI Keys ───────────────────────────────────────
router.put("/ai-keys", validate(updateAiKeysSchema), userController.updateAiKeys);

export { router as userRoutes };
