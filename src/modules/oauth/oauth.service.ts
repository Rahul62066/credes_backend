import crypto from "crypto";
import { Platform } from "../../../generated/prisma";
import { env } from "../../config/env";
import { redis } from "../../config/redis";
import { BadRequest } from "../../utils/appError";
import { encrypt } from "../../utils/encryption";
import { userRepository } from "../user/user.repository";

type OAuthPlatform = "twitter" | "linkedin" | "meta";

interface OAuthStateRecord {
  userId: string;
  platform: OAuthPlatform;
  codeVerifier?: string;
}

interface TwitterTokenResponse {
  access_token?: string;
  refresh_token?: string;
}

interface LinkedInTokenResponse {
  access_token?: string;
  refresh_token?: string;
}

interface MetaTokenResponse {
  access_token?: string;
}

interface TwitterProfileResponse {
  data?: {
    id?: string;
    username?: string;
  };
}

interface LinkedInProfileResponse {
  sub?: string;
}

interface MetaPagesResponse {
  data?: Array<{
    id?: string;
    access_token?: string;
  }>;
}

interface MetaPageDetailResponse {
  instagram_business_account?: {
    id?: string;
  };
}

export class OAuthService {
  private readonly statePrefix = "oauth:state";
  private readonly stateTtlSeconds = 10 * 60;

  async createTwitterAuthorizationUrl(userId: string): Promise<string> {
    this.requireConfig("TWITTER_CLIENT_ID", env.TWITTER_CLIENT_ID);
    this.requireConfig("TWITTER_REDIRECT_URI", env.TWITTER_REDIRECT_URI);
    this.requireConfig("TWITTER_CLIENT_SECRET", env.TWITTER_CLIENT_SECRET);

    const codeVerifier = this.generatePkceVerifier();
    const codeChallenge = this.generatePkceChallenge(codeVerifier);
    const state = await this.storeState({ userId, platform: "twitter", codeVerifier });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.TWITTER_CLIENT_ID,
      redirect_uri: env.TWITTER_REDIRECT_URI,
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  async createLinkedInAuthorizationUrl(userId: string): Promise<string> {
    this.requireConfig("LINKEDIN_CLIENT_ID", env.LINKEDIN_CLIENT_ID);
    this.requireConfig("LINKEDIN_REDIRECT_URI", env.LINKEDIN_REDIRECT_URI);
    this.requireConfig("LINKEDIN_CLIENT_SECRET", env.LINKEDIN_CLIENT_SECRET);

    const state = await this.storeState({ userId, platform: "linkedin" });
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.LINKEDIN_CLIENT_ID,
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      state,
      scope: "openid profile email w_member_social",
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async createMetaAuthorizationUrl(userId: string): Promise<string> {
    this.requireConfig("META_CLIENT_ID", env.META_CLIENT_ID);
    this.requireConfig("META_REDIRECT_URI", env.META_REDIRECT_URI);
    this.requireConfig("META_CLIENT_SECRET", env.META_CLIENT_SECRET);

    const state = await this.storeState({ userId, platform: "meta" });
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.META_CLIENT_ID,
      redirect_uri: env.META_REDIRECT_URI,
      state,
      scope: "pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish",
    });

    return `https://www.facebook.com/${env.META_API_VERSION}/dialog/oauth?${params.toString()}`;
  }

  async handleTwitterCallback(code: string, state: string): Promise<void> {
    const oauthState = await this.consumeState(state, "twitter");
    const tokenResponse = await this.exchangeTwitterCode(code, oauthState.codeVerifier || "");
    const accessToken = this.requireValue(tokenResponse.access_token, "Twitter token response missing access token");
    const profile = await this.fetchTwitterProfile(accessToken);
    const handle = profile.data?.username || profile.data?.id;

    if (!handle) {
      throw new Error("Twitter profile response missing username or user id");
    }

    await userRepository.upsertSocialAccount({
      userId: oauthState.userId,
      platform: Platform.TWITTER,
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: tokenResponse.refresh_token ? encrypt(tokenResponse.refresh_token) : undefined,
      handle,
    });
  }

  async handleLinkedInCallback(code: string, state: string): Promise<void> {
    const oauthState = await this.consumeState(state, "linkedin");
    const tokenResponse = await this.exchangeLinkedInCode(code);
    const accessToken = this.requireValue(tokenResponse.access_token, "LinkedIn token response missing access token");
    const profile = await this.fetchLinkedInProfile(accessToken);
    const handle = `urn:li:person:${this.requireValue(profile.sub, "LinkedIn profile response missing sub id")}`;

    await userRepository.upsertSocialAccount({
      userId: oauthState.userId,
      platform: Platform.LINKEDIN,
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: tokenResponse.refresh_token ? encrypt(tokenResponse.refresh_token) : undefined,
      handle,
    });
  }

  async handleMetaCallback(code: string, state: string): Promise<void> {
    const oauthState = await this.consumeState(state, "meta");
    const tokenResponse = await this.exchangeMetaCode(code);
    const userAccessToken = this.requireValue(tokenResponse.access_token, "Meta token response missing access token");
    const pages = await this.fetchMetaPages(userAccessToken);
    const selectedPage = await this.findInstagramAndThreadsAccounts(pages.data || []);

    if (!selectedPage || (!selectedPage.instagramBusinessAccountId && !selectedPage.threadsBusinessAccountId)) {
      throw BadRequest("No Instagram or Threads business account is connected to any Facebook page for this account");
    }

    // Store Instagram account if available
    if (selectedPage.instagramBusinessAccountId) {
      await userRepository.upsertSocialAccount({
        userId: oauthState.userId,
        platform: Platform.INSTAGRAM,
        accessTokenEnc: encrypt(selectedPage.accessToken),
        handle: selectedPage.instagramBusinessAccountId,
      });
    }

    // Store Threads account if available (with different user ID)
    if (selectedPage.threadsBusinessAccountId) {
      await userRepository.upsertSocialAccount({
        userId: oauthState.userId,
        platform: Platform.THREADS,
        accessTokenEnc: encrypt(selectedPage.accessToken),
        handle: selectedPage.threadsBusinessAccountId,
      });
    }
  }

  private async exchangeTwitterCode(code: string, codeVerifier: string): Promise<TwitterTokenResponse> {
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: env.TWITTER_CLIENT_ID,
      redirect_uri: env.TWITTER_REDIRECT_URI,
      code_verifier: codeVerifier,
      client_secret: env.TWITTER_CLIENT_SECRET,
    });

    const response = await fetch(`${env.TWITTER_API_BASE_URL}/2/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const body = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(`Twitter token exchange failed (${response.status}): ${this.extractError(body)}`);
    }

    return body as TwitterTokenResponse;
  }

  private async exchangeLinkedInCode(code: string): Promise<LinkedInTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
    });

    const response = await fetch(`${env.LINKEDIN_API_BASE_URL}/oauth/v2/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const body = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(`LinkedIn token exchange failed (${response.status}): ${this.extractError(body)}`);
    }

    return body as LinkedInTokenResponse;
  }

  private async exchangeMetaCode(code: string): Promise<MetaTokenResponse> {
    const params = new URLSearchParams({
      client_id: env.META_CLIENT_ID,
      client_secret: env.META_CLIENT_SECRET,
      redirect_uri: env.META_REDIRECT_URI,
      code,
    });

    const response = await fetch(`${env.META_API_BASE_URL}/${env.META_API_VERSION}/oauth/access_token?${params.toString()}`);
    const body = await this.safeJson(response);

    if (!response.ok) {
      throw new Error(`Meta token exchange failed (${response.status}): ${this.extractError(body)}`);
    }

    return body as MetaTokenResponse;
  }

  private async fetchTwitterProfile(accessToken: string): Promise<TwitterProfileResponse> {
    const response = await fetch("https://api.twitter.com/2/users/me?user.fields=username", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(`Twitter profile lookup failed (${response.status}): ${this.extractError(body)}`);
    }

    return body as TwitterProfileResponse;
  }

  private async fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfileResponse> {
    const response = await fetch(`${env.LINKEDIN_API_BASE_URL}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(`LinkedIn profile lookup failed (${response.status}): ${this.extractError(body)}`);
    }

    return body as LinkedInProfileResponse;
  }

  private async fetchMetaPages(accessToken: string): Promise<MetaPagesResponse> {
    const response = await fetch(
      `${env.META_API_BASE_URL}/${env.META_API_VERSION}/me/accounts?fields=id,name,access_token`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const body = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(`Meta pages lookup failed (${response.status}): ${this.extractError(body)}`);
    }

    return body as MetaPagesResponse;
  }

  private async findInstagramAndThreadsAccounts(
    pages: Array<{ id?: string; access_token?: string }>
  ): Promise<{ accessToken: string; instagramBusinessAccountId?: string; threadsBusinessAccountId?: string } | null> {
    for (const page of pages) {
      if (!page.id || !page.access_token) {
        continue;
      }

      const response = await fetch(
        `${env.META_API_BASE_URL}/${env.META_API_VERSION}/${page.id}?fields=instagram_business_account,threads_business_account`,
        { headers: { Authorization: `Bearer ${page.access_token}` } }
      );
      const body = await this.safeJson(response);

      if (!response.ok) {
        continue;
      }

      const detail = body as MetaPageDetailResponse & { threads_business_account?: { id: string } };
      const instagramBusinessAccountId = detail.instagram_business_account?.id;
      const threadsBusinessAccountId = detail.threads_business_account?.id;

      // Return if we found either Instagram or Threads account
      if (instagramBusinessAccountId || threadsBusinessAccountId) {
        return {
          accessToken: page.access_token,
          instagramBusinessAccountId,
          threadsBusinessAccountId,
        };
      }
    }

    return null;
  }

  private async storeState(record: OAuthStateRecord): Promise<string> {
    const state = crypto.randomBytes(32).toString("hex");
    await redis.set(this.stateKey(state), JSON.stringify(record), "EX", this.stateTtlSeconds);
    return state;
  }

  private async consumeState(state: string, expectedPlatform: OAuthPlatform): Promise<OAuthStateRecord> {
    if (!state) {
      throw BadRequest("Missing OAuth state");
    }

    const raw = await redis.get(this.stateKey(state));
    if (!raw) {
      throw BadRequest("Invalid or expired OAuth state");
    }

    await redis.del(this.stateKey(state));

    let parsed: OAuthStateRecord;
    try {
      parsed = JSON.parse(raw) as OAuthStateRecord;
    } catch {
      throw BadRequest("Invalid OAuth state payload");
    }

    if (parsed.platform !== expectedPlatform) {
      throw BadRequest("OAuth state does not match the requested provider");
    }

    return parsed;
  }

  private generatePkceVerifier(): string {
    return this.base64Url(crypto.randomBytes(48));
  }

  private generatePkceChallenge(verifier: string): string {
    return this.base64Url(crypto.createHash("sha256").update(verifier).digest());
  }

  private base64Url(buffer: Buffer): string {
    return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  private stateKey(state: string): string {
    return `${this.statePrefix}:${state}`;
  }

  private requireConfig(name: string, value: string): string {
    if (!value) {
      throw new Error(`${name} is not configured`);
    }
    return value;
  }

  private requireValue<T>(value: T | undefined | null, message: string): T {
    if (value === undefined || value === null || value === "") {
      throw new Error(message);
    }
    return value;
  }

  private async safeJson(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private extractError(body: unknown): string {
    if (!body) return "no response body";
    if (typeof body === "string") return body;
    if (typeof body === "object") {
      const record = body as Record<string, any>;
      if (record.error?.message) return String(record.error.message);
      if (record.error_description) return String(record.error_description);
      if (record.message) return String(record.message);
    }
    return JSON.stringify(body);
  }
}

export const oauthService = new OAuthService();