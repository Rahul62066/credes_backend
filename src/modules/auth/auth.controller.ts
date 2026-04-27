/**
 * Auth module — Controller layer.
 * HTTP request handlers for authentication.
 */
import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";

export class AuthController {
  async register(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      statusCode: 201,
      message: "Register endpoint — not implemented yet",
    });
  }

  async login(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      message: "Login endpoint — not implemented yet",
    });
  }

  async refreshToken(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      message: "Refresh token endpoint — not implemented yet",
    });
  }

  async logout(_req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      message: "Logout endpoint — not implemented yet",
    });
  }
}

export const authController = new AuthController();
