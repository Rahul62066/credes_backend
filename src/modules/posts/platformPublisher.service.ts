/**
 * Platform publisher service.
 *
 * Provides a unified interface for publishing to each social platform.
 * Real API calls are implemented where practical; unsupported platforms
 * fail explicitly so we never fake success.
 */
import { Platform } from "../../../generated/prisma";
import { env } from "../../config/env";
import { decrypt } from "../../utils/encryption";

export interface PlatformPublishContext {
  userId: string;
  postId: string;
  platformPostId: string;
  content: string;
  socialAccount: {
    accessTokenEnc: string;
    refreshTokenEnc?: string | null;
    handle?: string | null;
  };
}

export interface PlatformPublishResult {
  providerPostId?: string;
  providerRaw?: unknown;
}

export class PlatformPublisherService {
  async publish(platform: Platform, ctx: PlatformPublishContext): Promise<PlatformPublishResult> {
    switch (platform) {
      case Platform.TWITTER:
        return this.publishToTwitter(ctx);
      case Platform.LINKEDIN:
        return this.publishToLinkedIn(ctx);
      case Platform.INSTAGRAM:
        return this.publishToInstagram(ctx);
      case Platform.THREADS:
        return this.publishToThreads(ctx);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async publishToTwitter(ctx: PlatformPublishContext): Promise<PlatformPublishResult> {
    const token = this.getAccessToken(ctx);
    const baseUrl = env.TWITTER_API_BASE_URL || "https://api.twitter.com";

    const response = await fetch(`${baseUrl}/2/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: ctx.content,
      }),
    });

    const body = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(
        `Twitter publish failed (${response.status}): ${this.extractProviderError(body)}`
      );
    }

    const providerPostId = body?.data?.id as string | undefined;
    if (!providerPostId) {
      throw new Error("Twitter publish failed: response missing tweet id");
    }

    return {
      providerPostId,
      providerRaw: body,
    };
  }

  async publishToLinkedIn(ctx: PlatformPublishContext): Promise<PlatformPublishResult> {
    const token = this.getAccessToken(ctx);

    // For LinkedIn posting, handle is expected to store an author URN,
    // e.g. urn:li:person:<id> or urn:li:organization:<id>.
    const author = (ctx.socialAccount.handle || "").trim();
    if (!author || !author.startsWith("urn:li:")) {
      throw new Error(
        "LinkedIn publish failed: social account handle must contain author URN (urn:li:person:* or urn:li:organization:*)"
      );
    }

    const baseUrl = env.LINKEDIN_API_BASE_URL || "https://api.linkedin.com";
    const payload = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: ctx.content,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await fetch(`${baseUrl}/v2/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    const body = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(
        `LinkedIn publish failed (${response.status}): ${this.extractProviderError(body)}`
      );
    }

    const providerPostId =
      (typeof response.headers.get("x-restli-id") === "string" && response.headers.get("x-restli-id")) ||
      (body?.id as string | undefined);

    if (!providerPostId) {
      throw new Error("LinkedIn publish failed: response missing post id");
    }

    return {
      providerPostId,
      providerRaw: body,
    };
  }

  async publishToInstagram(_ctx: PlatformPublishContext): Promise<PlatformPublishResult> {
    // TODO(OAuth): implement Meta Graph API flow:
    // 1) create media container
    // 2) publish container
    // Requires instagram business account id + page linkage + scoped user token.
    throw new Error(
      "Instagram publishing is not configured yet. TODO: implement Meta Graph OAuth + media publish flow."
    );
  }

  async publishToThreads(_ctx: PlatformPublishContext): Promise<PlatformPublishResult> {
    // TODO(OAuth): implement Threads API flow once stable account/token
    // requirements are finalized for this app.
    throw new Error(
      "Threads publishing is not configured yet. TODO: implement Threads OAuth + publish flow."
    );
  }

  private getAccessToken(ctx: PlatformPublishContext): string {
    if (!ctx.socialAccount.accessTokenEnc) {
      throw new Error("Publish failed: missing encrypted access token for connected social account");
    }

    try {
      const token = decrypt(ctx.socialAccount.accessTokenEnc);
      if (!token) {
        throw new Error("decrypted access token is empty");
      }
      return token;
    } catch (err) {
      throw new Error(`Publish failed: unable to decrypt social access token (${(err as Error).message})`);
    }
  }

  private async safeJson(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private extractProviderError(body: any): string {
    if (!body) return "no response body";
    if (typeof body === "string") return body;
    if (body?.error?.message) return body.error.message as string;
    if (body?.message) return body.message as string;
    if (Array.isArray(body?.errors) && body.errors[0]?.message) return body.errors[0].message as string;
    return JSON.stringify(body);
  }
}

export const platformPublisherService = new PlatformPublisherService();
