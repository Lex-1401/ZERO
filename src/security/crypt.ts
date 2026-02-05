import crypto from "node:crypto";
import fs from "node:fs/promises";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * AuditCrypt: Utilitários para criptografia at-rest do estado do ZERO.
 */
export class AuditCrypt {
  /**
   * Deriva uma chave de 256 bits a partir do token do Gateway.
   */
  static deriveKey(token: string, salt: Buffer): Buffer {
    return crypto.scryptSync(token, salt, 32);
  }

  /**
   * Criptografa uma string usando AES-256-GCM.
   */
  static encrypt(text: string, token: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.deriveKey(token, salt);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
  }

  /**
   * Descriptografa uma string usando AES-256-GCM.
   */
  static decrypt(data: string, token: string): string {
    const buffer = Buffer.from(data, "base64");

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = this.deriveKey(token, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final("utf8");
  }

  /**
   * Verifica se um buffer parece estar criptografado pelo AuditCrypt.
   */
  static isEncrypted(data: string | Buffer): boolean {
    if (typeof data === "string") {
      // Checagem rápida de base64 e tamanho mínimo (salt + iv + tag + algo)
      return (
        data.length > (SALT_LENGTH + IV_LENGTH + TAG_LENGTH) * 1.3 && /^[A-Za-z0-9+/=]+$/.test(data)
      );
    }
    return data.length > SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  }

  /**
   * Prepara um arquivo de sessão para uso, descriptografando se necessário.
   * Retorna o caminho do arquivo descriptografado (pode ser um arquivo temporário).
   */
  static async prepareSessionFile(
    filePath: string,
    token: string,
  ): Promise<{ path: string; isTemp: boolean }> {
    try {
      const stats = await fs.stat(filePath).catch(() => null);
      if (!stats || stats.size === 0) {
        return { path: filePath, isTemp: false };
      }

      const content = await fs.readFile(filePath, "utf8");
      if (this.isEncrypted(content.trim())) {
        const decrypted = this.decrypt(content.trim(), token);
        const tempPath = `${filePath}.tmp.${crypto.randomBytes(4).toString("hex")}`;
        await fs.writeFile(tempPath, decrypted, { mode: 0o600 });
        return { path: tempPath, isTemp: true };
      }
    } catch (err) {
      console.error("[AuditCrypt] Erro ao preparar arquivo de sessão:", err);
    }
    return { path: filePath, isTemp: false };
  }

  /**
   * Finaliza o uso de um arquivo de sessão, criptografando e movendo para o destino final.
   */
  static async finalizeSessionFile(
    tempPath: string,
    targetPath: string,
    token: string,
    encrypt: boolean,
  ): Promise<void> {
    try {
      const content = await fs.readFile(tempPath, "utf8");
      if (encrypt) {
        const encrypted = this.encrypt(content, token);
        await fs.writeFile(targetPath, encrypted, { mode: 0o600 });
      } else {
        // Se não for para criptografar, apenas move se for diferente
        if (tempPath !== targetPath) {
          await fs.writeFile(targetPath, content, { mode: 0o600 });
        }
      }
    } catch (err) {
      console.error("[AuditCrypt] Erro ao finalizar arquivo de sessão:", err);
    } finally {
      if (tempPath !== targetPath) {
        await fs.unlink(tempPath).catch(() => null);
      }
    }
  }
}
