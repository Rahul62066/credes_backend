/**
 * User module — Controller layer.
 * Translates HTTP requests into service calls.
 */
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { userService, UserService } from "./user.service";
import type {
  UpdateProfileInput,
  ConnectSocialAccountInput,
  UpdateAiKeysInput,
} from "./user.validation";

export class UserController {
  constructor(private service: UserService = userService) {}

  // GET /api/user/profile
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getProfile(req.user!.userId);

      ApiResponse.success(res, {
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/user/profile
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpdateProfileInput;
      const user = await this.service.updateProfile(req.user!.userId, input);

      ApiResponse.success(res, {
        message: "Profile updated successfully",
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/user/social-accounts
  listSocialAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = await this.service.listSocialAccounts(req.user!.userId);

      ApiResponse.success(res, {
        data: { accounts },
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/user/social-accounts
  connectSocialAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as ConnectSocialAccountInput;
      const account = await this.service.connectSocialAccount(req.user!.userId, input);

      ApiResponse.success(res, {
        statusCode: 201,
        message: "Social account connected successfully",
        data: { account },
      });
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/user/social-accounts/:id
  disconnectSocialAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.disconnectSocialAccount(req.user!.userId, req.params.id as string);

      ApiResponse.success(res, {
        message: "Social account disconnected",
      });
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/user/ai-keys
  updateAiKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpdateAiKeysInput;
      const keys = await this.service.updateAiKeys(req.user!.userId, input);

      ApiResponse.success(res, {
        message: "AI keys updated successfully",
        data: { keys },
      });
    } catch (err) {
      next(err);
    }
  };
}

export const userController = new UserController();
