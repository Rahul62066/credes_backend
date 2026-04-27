/**
 * Encryption utility — unit tests.
 */
import { encrypt, decrypt, maskSecret } from "../utils/encryption";

describe("AES-256-GCM encryption", () => {
  // Set a test encryption key in env before tests
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("should encrypt and decrypt a string", () => {
    const plaintext = "sk-proj-abc123def456";
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "same-secret-value";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);

    expect(a).not.toBe(b); // Different IVs
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("should produce ciphertext in iv:authTag:data format", () => {
    const ciphertext = encrypt("test");
    const parts = ciphertext.split(":");

    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(24); // 12 bytes hex
    expect(parts[1]).toHaveLength(32); // 16 bytes hex
  });

  it("should throw on tampered ciphertext", () => {
    const ciphertext = encrypt("secret");
    const parts = ciphertext.split(":");
    parts[2] = "0000" + parts[2].slice(4); // tamper data

    expect(() => decrypt(parts.join(":"))).toThrow();
  });
});

describe("maskSecret", () => {
  it("should mask a long secret", () => {
    expect(maskSecret("sk-proj-abcdefgh1234")).toBe("sk-p...1234");
  });

  it("should fully mask a short secret", () => {
    expect(maskSecret("abc")).toBe("••••");
  });

  it("should use custom visible end length", () => {
    expect(maskSecret("sk-proj-abcdefgh1234", 6)).toBe("sk-p...gh1234");
  });
});
