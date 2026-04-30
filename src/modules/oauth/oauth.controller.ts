import { Request, Response } from "express";
import { env } from "../../config/env";
import { AppError, BadRequest } from "../../utils/appError";
import { oauthService, OAuthService } from "./oauth.service";

export class OAuthController {
  constructor(private service: OAuthService = oauthService) {}

  connectTwitter = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectUrl = await this.service.createTwitterAuthorizationUrl(req.user!.userId);
      res.redirect(redirectUrl);
    } catch (err) {
      this.renderError(res, err, "Twitter connection failed");
    }
  };

  callbackTwitter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error, error_description } = req.query;
      if (error) {
        throw BadRequest(String(error_description || error));
      }
      if (typeof code !== "string" || typeof state !== "string") {
        throw BadRequest("Missing OAuth code or state");
      }

      await this.service.handleTwitterCallback(code, state);
      this.renderSuccess(res, "Twitter connected successfully");
    } catch (err) {
      this.renderError(res, err, "Twitter connection failed");
    }
  };

  connectLinkedIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectUrl = await this.service.createLinkedInAuthorizationUrl(req.user!.userId);
      res.redirect(redirectUrl);
    } catch (err) {
      this.renderError(res, err, "LinkedIn connection failed");
    }
  };

  callbackLinkedIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error, error_description } = req.query;
      if (error) {
        throw BadRequest(String(error_description || error));
      }
      if (typeof code !== "string" || typeof state !== "string") {
        throw BadRequest("Missing OAuth code or state");
      }

      await this.service.handleLinkedInCallback(code, state);
      this.renderSuccess(res, "LinkedIn connected successfully");
    } catch (err) {
      this.renderError(res, err, "LinkedIn connection failed");
    }
  };

  connectMeta = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectUrl = await this.service.createMetaAuthorizationUrl(req.user!.userId);
      res.redirect(redirectUrl);
    } catch (err) {
      this.renderError(res, err, "Instagram connection failed");
    }
  };

  callbackMeta = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error, error_description } = req.query;
      if (error) {
        throw BadRequest(String(error_description || error));
      }
      if (typeof code !== "string" || typeof state !== "string") {
        throw BadRequest("Missing OAuth code or state");
      }

      await this.service.handleMetaCallback(code, state);
      this.renderSuccess(res, "Instagram connected successfully");
    } catch (err) {
      this.renderError(res, err, "Instagram connection failed");
    }
  };

  private renderSuccess(res: Response, message: string): void {
    const link = env.APP_BASE_URL
      ? `<p><a href="${this.escapeHtml(env.APP_BASE_URL)}">Return to app</a></p>`
      : "";
    res.status(200).type("html").send(this.pageShell("Success", message, "#0f766e", link));
  }

  private renderError(res: Response, err: unknown, fallbackMessage: string): void {
    const statusCode = this.getStatusCode(err);
    const message = err instanceof Error ? err.message : fallbackMessage;
    const link = env.APP_BASE_URL
      ? `<p><a href="${this.escapeHtml(env.APP_BASE_URL)}">Return to app</a></p>`
      : "";
    res.status(statusCode).type("html").send(this.pageShell("Error", message || fallbackMessage, "#b91c1c", link));
  }

  private getStatusCode(err: unknown): number {
    if (err && typeof err === "object" && "statusCode" in err) {
      const statusCode = (err as AppError).statusCode;
      if (typeof statusCode === "number") {
        return statusCode;
      }
    }
    return 500;
  }

  private pageShell(title: string, message: string, accent: string, extraHtml = ""): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(title)}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { max-width: 520px; width: 100%; background: white; border-radius: 16px; padding: 28px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12); border-top: 6px solid ${accent}; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0 0 12px; line-height: 1.6; }
      a { color: ${accent}; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${this.escapeHtml(title)}</h1>
        <p>${this.escapeHtml(message)}</p>
        ${extraHtml}
      </div>
    </div>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

export const oauthController = new OAuthController();