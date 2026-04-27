/**
 * Posts module — Controller layer.
 */
import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";

export class PostsController {
  async create(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { statusCode: 201, message: "Create post — not implemented yet" });
  }

  async getById(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "Get post — not implemented yet" });
  }

  async list(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "List posts — not implemented yet" });
  }

  async cancel(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, { message: "Cancel post — not implemented yet" });
  }
}

export const postsController = new PostsController();
