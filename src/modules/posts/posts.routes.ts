/**
 * Posts module — Routes.
 */
import { Router } from "express";
import { postsController } from "./posts.controller";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import { createPostSchema } from "./posts.validation";

const router = Router();

router.post("/", authGuard, validate(createPostSchema), postsController.create);
router.get("/", authGuard, postsController.list);
router.get("/:id", authGuard, postsController.getById);
router.delete("/:id", authGuard, postsController.cancel);

export { router as postsRoutes };
