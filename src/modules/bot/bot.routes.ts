/**
 * Bot module — Routes.
 */
import { Router } from "express";
import { botController } from "./bot.controller";
import { authGuard } from "../../middlewares/authGuard";

const router = Router();

router.post("/trigger", authGuard, botController.trigger);
router.get("/status/:id", authGuard, botController.getStatus);

export { router as botRoutes };
