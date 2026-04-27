/**
 * Bot module — Controller layer.
 */
import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";

export class BotController {
  async trigger(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "Bot trigger — not implemented yet" });
  }

  async getStatus(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "Bot status — not implemented yet" });
  }
}

export const botController = new BotController();
