/**
 * Auth module — Controller layer.
 * Translates HTTP requests into service calls and sends responses.
 */
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { authService, AuthService } from "./auth.service";
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput } from "./auth.validation";

export class AuthController {
  constructor(private service: AuthService = authService) {}

  // POST /api/auth/register
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as RegisterInput;
      const result = await this.service.register(input);

      ApiResponse.success(res, {
        statusCode: 201,
        message: "User registered successfully",
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/login
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as LoginInput;
      const result = await this.service.login(input);

      ApiResponse.success(res, {
        statusCode: 200,
        message: "Login successful",
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/refresh
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as RefreshInput;
      const result = await this.service.refresh(refreshToken);

      ApiResponse.success(res, {
        statusCode: 200,
        message: "Token refreshed successfully",
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/logout
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as LogoutInput;
      await this.service.logout(refreshToken);

      ApiResponse.success(res, {
        statusCode: 200,
        message: "Logged out successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/auth/me
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.me(req.user!.userId);

      ApiResponse.success(res, {
        statusCode: 200,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
