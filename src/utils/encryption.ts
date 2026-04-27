/**
 * AES-256-GCM encryption / decryption utility.
 *
 * Ciphertext format stored in DB:  iv:authTag:ciphertext  (all hex)
 * - iv       = 12 bytes (96-bit, recommended for GCM)
 * - authTag  = 16 bytes (128-bit)
 * - ciphertext = variable length
 */
import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — NIST recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SEPARATOR = ":";

/**
 * Derive the 32-byte key from the hex string in ENCRYPTION_KEY.
 */
function getKey(): Buffer {
  const hex = env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns the format  `iv:authTag:ciphertext`  (hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return [iv.toString("hex"), authTag, encrypted].join(SEPARATOR);
}

/**
 * Decrypt a ciphertext string produced by `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(SEPARATOR);

  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mask a secret for safe display.
 * Example: "sk-proj-abcdefgh1234" → "sk-p...1234"
 */
export function maskSecret(secret: string, visibleEnd = 4): string {
  if (secret.length <= visibleEnd + 4) {
    return "••••";
  }
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-visibleEnd);
  return `${prefix}...${suffix}`;
}
