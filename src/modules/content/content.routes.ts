/**
 * Content module — Routes.
 *
 * POST /api/content/generate — AI-powered content generation
 */
import { Router } from "express";
import { contentController } from "./content.controller";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import { generateContentSchema } from "./content.validation";
import { contentRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post(
  "/generate",
  authGuard,
  contentRateLimiter,
  validate(generateContentSchema),
  contentController.generate
);

export { router as contentRoutes };
