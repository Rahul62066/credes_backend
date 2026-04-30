/**
 * OAuth module — Routes.
 *
 * Backend-only OAuth flow for Twitter/X, LinkedIn, and Meta/Instagram.
 */
import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard";
import { oauthController } from "./oauth.controller";

const router = Router();

router.get("/twitter/connect", authGuard, oauthController.connectTwitter);
router.get("/twitter/callback", oauthController.callbackTwitter);

router.get("/linkedin/connect", authGuard, oauthController.connectLinkedIn);
router.get("/linkedin/callback", oauthController.callbackLinkedIn);

router.get("/meta/connect", authGuard, oauthController.connectMeta);
router.get("/meta/callback", oauthController.callbackMeta);

export { router as oauthRoutes };