/**
 * Content module — Controller layer.
 */
import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";

export class ContentController {
  async create(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { statusCode: 201, message: "Create content — not implemented yet" });
  }

  async getById(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "Get content — not implemented yet" });
  }

  async list(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "List content — not implemented yet" });
  }

  async update(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "Update content — not implemented yet" });
  }

  async delete(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "Delete content — not implemented yet" });
  }
}

export const contentController = new ContentController();
