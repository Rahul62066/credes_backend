/**
 * Auth module — Repository layer.
 * All Prisma database operations for auth live here.
 */
import { prisma } from "../../config/prisma";

export class AuthRepository {
  // ── User ────────────────────────────────────────

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        defaultTone: true,
        defaultLanguage: true,
        createdAt: true,
        updatedAt: true,
        // passwordHash deliberately excluded
      },
    });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }) {
    return prisma.user.create({ data });
  }

  // ── Refresh Token ───────────────────────────────

  async createRefreshToken(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  async revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
