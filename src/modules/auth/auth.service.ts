/**
 * Auth module — Service layer.
 * Business logic for registration, login, token rotation, logout.
 */
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../../config/env";
import { authRepository, AuthRepository } from "./auth.repository";
import { Unauthorized, Conflict } from "../../utils/appError";
import type { RegisterInput, LoginInput } from "./auth.validation";

const BCRYPT_COST = 12;

export class AuthService {
  constructor(private repo: AuthRepository = authRepository) {}

  // ── Register ────────────────────────────────────

  async register(input: RegisterInput) {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw Conflict("Email already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const user = await this.repo.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: this.stripPassword(user),
      ...tokens,
    };
  }

  // ── Login ───────────────────────────────────────

  async login(input: LoginInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw Unauthorized("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw Unauthorized("Invalid email or password");
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: this.stripPassword(user),
      ...tokens,
    };
  }

  // ── Refresh (with rotation) ─────────────────────

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!stored) {
      throw Unauthorized("Invalid refresh token");
    }

    if (stored.revokedAt) {
      // Token reuse detected — revoke entire family for safety
      await this.repo.revokeAllUserTokens(stored.userId);
      throw Unauthorized("Refresh token already used — all sessions revoked");
    }

    if (stored.expiresAt < new Date()) {
      throw Unauthorized("Refresh token expired");
    }

    // Revoke the old token (rotation)
    await this.repo.revokeRefreshToken(tokenHash);

    // Issue fresh pair
    const user = await this.repo.findUserById(stored.userId);
    if (!user) {
      throw Unauthorized("User not found");
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user,
      ...tokens,
    };
  }

  // ── Logout ──────────────────────────────────────

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);

    if (stored && !stored.revokedAt) {
      await this.repo.revokeRefreshToken(tokenHash);
    }
  }

  // ── Me (current user) ──────────────────────────

  async me(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw Unauthorized("User not found");
    }
    return user; // already excludes passwordHash via repository select
  }

  // ── Private helpers ─────────────────────────────

  /**
   * Generate an access token + refresh token pair.
   * The refresh token is stored as a SHA-256 hash in the database.
   */
  private async generateTokenPair(userId: string, email: string) {
    // Access token (JWT) — use numeric seconds for expiresIn
    const accessToken = jwt.sign(
      { userId, email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: this.parseDurationToSeconds(env.ACCESS_TOKEN_EXPIRES_IN) }
    );

    // Refresh token (opaque random string)
    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = this.hashToken(rawRefreshToken);
    const refreshSeconds = this.parseDurationToSeconds(env.REFRESH_TOKEN_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + refreshSeconds * 1000);

    await this.repo.createRefreshToken({ tokenHash, userId, expiresAt });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /**
   * SHA-256 hash a token before storing / looking up.
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Parse duration strings like "7d", "24h", "15m", "30s" into seconds.
   * Falls back to 900 (15 min) if unparseable.
   */
  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) return 900; // fallback 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      d: 86400,
      h: 3600,
      m: 60,
      s: 1,
    };

    return value * (multipliers[unit] ?? 60);
  }

  /**
   * Remove passwordHash from a user object.
   */
  private stripPassword<T extends { passwordHash?: string }>(
    user: T
  ): Omit<T, "passwordHash"> {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();

