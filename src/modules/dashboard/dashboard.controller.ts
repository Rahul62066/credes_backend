import { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { dashboardService, DashboardService } from "./dashboard.service";

export class DashboardController {
  constructor(private service: DashboardService = dashboardService) {}

  stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getStats(req.user!.userId);

      ApiResponse.success(res, {
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const dashboardController = new DashboardController();
