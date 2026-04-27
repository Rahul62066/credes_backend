/**
 * JWT authentication guard middleware.
 * Verifies the access token from the Authorization header.
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Unauthorized } from "../utils/appError";

/**
 * Decoded JWT payload attached to req.user.
 */
export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Middleware that verifies a JWT access token and attaches the decoded
 * payload to `req.user`.
 *
 * Expected header: `Authorization: Bearer <token>`
 */
export function authGuard(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      throw Unauthorized("Missing or malformed authorization header");
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(Unauthorized("Access token expired"));
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      next(Unauthorized("Invalid access token"));
      return;
    }
    next(err);
  }
}
