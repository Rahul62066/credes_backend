/**
 * WhatsApp module — Routes.
 *
 * POST /webhooks/whatsapp/twilio — Twilio WhatsApp incoming messages webhook
 */
import { Router } from "express";
import { whatsappController } from "./whatsapp.controller";

const router = Router();

router.post("/twilio", whatsappController.webhook);

export { router as whatsappRoutes };
