/**
 * Content module — Routes.
 */
import { Router } from "express";
import { contentController } from "./content.controller";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import { createContentSchema } from "./content.validation";

const router = Router();

router.post("/", authGuard, validate(createContentSchema), contentController.create);
router.get("/", authGuard, contentController.list);
router.get("/:id", authGuard, contentController.getById);
router.patch("/:id", authGuard, contentController.update);
router.delete("/:id", authGuard, contentController.delete);

export { router as contentRoutes };
