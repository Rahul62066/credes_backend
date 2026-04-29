/**
 * WhatsApp module — Controller layer.
 * Handles incoming Twilio WhatsApp webhooks.
 */
import { Request, Response, NextFunction } from "express";
import twilio from "twilio";
import { env } from "../../config/env";
import { whatsappService } from "./whatsapp.service";
import { twilioIncomingMessageSchema } from "./whatsapp.validation";
import { logger } from "../../utils/logger";

export class WhatsAppController {
  webhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate Twilio webhook signature
      const twilioSignature = req.headers["x-twilio-signature"] as string;
      const url = `${env.TWILIO_WEBHOOK_URL || "http://localhost:5000"}${req.originalUrl}`;

      if (env.TWILIO_VERIFY_WEBHOOK) {
        const isValid = twilio.validateRequest(
          env.TWILIO_AUTH_TOKEN,
          twilioSignature,
          url,
          req.body
        );

        if (!isValid) {
          logger.warn("Invalid Twilio webhook signature");
          res.status(401).json({ success: false, message: "Invalid signature" });
          return;
        }
      }

      // Parse and validate message
      const parsed = twilioIncomingMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: "Invalid payload" });
        return;
      }

      // Handle the message asynchronously
      whatsappService.handleIncomingMessage(parsed.data).catch((error) => {
        logger.error("WhatsApp message handling error", error);
      });

      // Return 200 immediately (Twilio requires quick response)
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error("WhatsApp webhook error", error);
      res.status(500).json({ success: false });
    }
  };
}

export const whatsappController = new WhatsAppController();
