/**
 * Content module — Repository layer.
 * Fetches user's saved AI keys for content generation.
 */
import { prisma } from "../../config/prisma";

export class ContentRepository {
  async findUserAiKey(userId: string) {
    return prisma.aiKey.findUnique({ where: { userId } });
  }
}

export const contentRepository = new ContentRepository();
