/**
 * Posts module — Routes.
 */
import { Router } from "express";
import { postsController } from "./posts.controller";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import {
	publishPostSchema,
	schedulePostSchema,
	listPostsQuerySchema,
	postIdParamSchema,
} from "./posts.validation";
import { publishRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post(
	"/publish",
	authGuard,
	publishRateLimiter,
	validate(publishPostSchema),
	postsController.publish
);
router.post(
	"/schedule",
	authGuard,
	publishRateLimiter,
	validate(schedulePostSchema),
	postsController.schedule
);
router.get("/", authGuard, validate(listPostsQuerySchema, "query"), postsController.list);
router.get("/:id", authGuard, validate(postIdParamSchema, "params"), postsController.getById);
router.post("/:id/retry", authGuard, validate(postIdParamSchema, "params"), postsController.retry);
router.delete("/:id", authGuard, validate(postIdParamSchema, "params"), postsController.cancel);

export { router as postsRoutes };
