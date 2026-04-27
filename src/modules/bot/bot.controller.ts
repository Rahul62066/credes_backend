/**
 * Bot module — Controller layer.
 */
import { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { botService } from "./bot.service";

export class BotController {
  telegramWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const secret = req.params.secret as string;
      if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
        res.status(401).json({ success: false, message: "Invalid webhook secret" });
        return;
      }
      botService.getWebhookHandler()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export const botController = new BotController();
