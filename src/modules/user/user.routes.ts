/**
 * User module — Routes.
 */
import { Router } from "express";
import { userController } from "./user.controller";
import { authGuard } from "../../middlewares/authGuard";

const router = Router();

router.get("/profile", authGuard, userController.getProfile);
router.patch("/profile", authGuard, userController.updateProfile);
router.delete("/account", authGuard, userController.deleteAccount);

export { router as userRoutes };
