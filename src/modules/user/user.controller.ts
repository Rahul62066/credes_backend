/**
 * User module — Controller layer.
 */
import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";

export class UserController {
  async getProfile(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      message: "Get profile endpoint — not implemented yet",
    });
  }

  async updateProfile(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      message: "Update profile endpoint — not implemented yet",
    });
  }

  async deleteAccount(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      message: "Delete account endpoint — not implemented yet",
    });
  }
}

export const userController = new UserController();
