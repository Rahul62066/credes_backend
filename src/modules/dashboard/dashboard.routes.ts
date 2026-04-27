import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard";
import { dashboardController } from "./dashboard.controller";

const router = Router();

router.get("/stats", authGuard, dashboardController.stats);

export { router as dashboardRoutes };
