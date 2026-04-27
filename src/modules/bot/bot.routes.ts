/**
 * Bot module — Routes.
 */
import { Router } from "express";
import { botController } from "./bot.controller";

const router = Router();

router.post("/telegram/webhook/:secret", botController.telegramWebhook);

export { router as botRoutes };
