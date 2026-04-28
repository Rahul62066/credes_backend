/**
 * User module — Repository layer.
 * All Prisma database operations for user, social accounts, and AI keys.
 */
import { prisma } from "../../config/prisma";
import type { Platform, Tone } from "../../../generated/prisma";

// ── User ─────────────────────────────────────────────

export class UserRepository {
  async findById(id: string) {
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
        // passwordHash excluded
      },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      bio?: string;
      defaultTone?: Tone;
      defaultLanguage?: string;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        defaultTone: true,
        defaultLanguage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ── Social Accounts ─────────────────────────────

  async findSocialAccounts(userId: string) {
    return prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        handle: true,
        connectedAt: true,
        // tokens excluded
      },
      orderBy: { connectedAt: "desc" },
    });
  }

  async findSocialAccountById(id: string, userId: string) {
    return prisma.socialAccount.findFirst({
      where: { id, userId },
    });
  }

  async findSocialAccountByPlatform(userId: string, platform: Platform) {
    return prisma.socialAccount.findUnique({
      where: { userId_platform: { userId, platform } },
    });
  }

  async createSocialAccount(data: {
    userId: string;
    platform: Platform;
    accessTokenEnc: string;
    refreshTokenEnc?: string;
    handle?: string;
  }) {
    return prisma.socialAccount.create({
      data,
      select: {
        id: true,
        platform: true,
        handle: true,
        connectedAt: true,
      },
    });
  }

  async upsertSocialAccount(data: {
    userId: string;
    platform: Platform;
    accessTokenEnc: string;
    refreshTokenEnc?: string;
    handle?: string;
  }) {
    return prisma.socialAccount.upsert({
      where: {
        userId_platform: {
          userId: data.userId,
          platform: data.platform,
        },
      },
      update: {
        accessTokenEnc: data.accessTokenEnc,
        refreshTokenEnc: data.refreshTokenEnc,
        handle: data.handle,
        connectedAt: new Date(),
      },
      create: data,
      select: {
        id: true,
        platform: true,
        handle: true,
        connectedAt: true,
      },
    });
  }

  async deleteSocialAccount(id: string, userId: string) {
    // Verify ownership first
    const account = await prisma.socialAccount.findFirst({
      where: { id, userId },
    });
    if (!account) return null;

    return prisma.socialAccount.delete({ where: { id } });
  }

  // ── AI Keys ─────────────────────────────────────

  async findAiKey(userId: string) {
    return prisma.aiKey.findUnique({
      where: { userId },
    });
  }

  async upsertAiKey(data: {
    userId: string;
    openaiKeyEnc?: string | null;
    anthropicKeyEnc?: string | null;
    openrouterKeyEnc?: string | null;
  }) {
    return prisma.aiKey.upsert({
      where: { userId: data.userId },
      update: {
        ...(data.openaiKeyEnc !== undefined && {
          openaiKeyEnc: data.openaiKeyEnc,
        }),
        ...(data.anthropicKeyEnc !== undefined && {
          anthropicKeyEnc: data.anthropicKeyEnc,
        }),
        ...(data.openrouterKeyEnc !== undefined && {
          openrouterKeyEnc: data.openrouterKeyEnc,
        }),
      },
      create: {
        userId: data.userId,
        openaiKeyEnc: data.openaiKeyEnc ?? null,
        anthropicKeyEnc: data.anthropicKeyEnc ?? null,
        openrouterKeyEnc: data.openrouterKeyEnc ?? null,
      },
    });
  }
}

export const userRepository = new UserRepository();
