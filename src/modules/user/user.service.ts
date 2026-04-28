/**
 * User module — Service layer.
 * Business logic for profile, social accounts, and AI key management.
 */
import { userRepository, UserRepository } from "./user.repository";
import { encrypt, decrypt, maskSecret } from "../../utils/encryption";
import { NotFound, Conflict } from "../../utils/appError";
import type { Platform, Tone } from "../../../generated/prisma";
import type {
  UpdateProfileInput,
  ConnectSocialAccountInput,
  UpdateAiKeysInput,
} from "./user.validation";

export class UserService {
  constructor(private repo: UserRepository = userRepository) {}

  // ── Profile ─────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw NotFound("User not found");
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const data: {
      name?: string;
      bio?: string;
      defaultTone?: Tone;
      defaultLanguage?: string;
    } = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.defaultTone !== undefined) data.defaultTone = input.defaultTone as Tone;
    if (input.defaultLanguage !== undefined)
      data.defaultLanguage = input.defaultLanguage;

    return this.repo.updateProfile(userId, data);
  }

  // ── Social Accounts ─────────────────────────────

  async listSocialAccounts(userId: string) {
    return this.repo.findSocialAccounts(userId);
  }

  async connectSocialAccount(userId: string, input: ConnectSocialAccountInput) {
    // Encrypt tokens before storing
    const accessTokenEnc = encrypt(input.accessToken);
    const refreshTokenEnc = input.refreshToken
      ? encrypt(input.refreshToken)
      : undefined;

    // Upsert — reconnecting an existing platform updates the tokens
    const account = await this.repo.upsertSocialAccount({
      userId,
      platform: input.platform as Platform,
      accessTokenEnc,
      refreshTokenEnc,
      handle: input.handle,
    });

    return account;
  }

  async disconnectSocialAccount(userId: string, accountId: string) {
    const deleted = await this.repo.deleteSocialAccount(accountId, userId);
    if (!deleted) {
      throw NotFound("Social account not found");
    }
    return deleted;
  }

  // ── AI Keys ─────────────────────────────────────

  async getAiKeys(userId: string) {
    const aiKey = await this.repo.findAiKey(userId);
    if (!aiKey) {
      return { openaiKey: null, anthropicKey: null, openrouterKey: null };
    }

    return {
      openaiKey: aiKey.openaiKeyEnc
        ? maskSecret(decrypt(aiKey.openaiKeyEnc))
        : null,
      anthropicKey: aiKey.anthropicKeyEnc
        ? maskSecret(decrypt(aiKey.anthropicKeyEnc))
        : null,
      openrouterKey: aiKey.openrouterKeyEnc
        ? maskSecret(decrypt(aiKey.openrouterKeyEnc))
        : null,
      updatedAt: aiKey.updatedAt,
    };
  }

  async updateAiKeys(userId: string, input: UpdateAiKeysInput) {
    const data: {
      userId: string;
      openaiKeyEnc?: string | null;
      anthropicKeyEnc?: string | null;
      openrouterKeyEnc?: string | null;
    } = { userId };

    if (input.openaiKey !== undefined) {
      data.openaiKeyEnc = encrypt(input.openaiKey);
    }
    if (input.anthropicKey !== undefined) {
      data.anthropicKeyEnc = encrypt(input.anthropicKey);
    }
    if (input.openrouterKey !== undefined) {
      data.openrouterKeyEnc = encrypt(input.openrouterKey);
    }

    await this.repo.upsertAiKey(data);

    // Return masked view
    return this.getAiKeys(userId);
  }
}

export const userService = new UserService();
