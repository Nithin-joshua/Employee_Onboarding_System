import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Readable } from 'stream';

function requireVaultKey(): Buffer {
  const rawKey = process.env.VAULT_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      'VAULT_ENCRYPTION_KEY environment variable is required. ' +
        'Set it in your .env file (see .env.example).',
    );
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

@Injectable()
export class LocalVaultService {
  private readonly encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = requireVaultKey();
  }

  encryptBuffer(buffer: Buffer): {
    encryptedData: Buffer;
    iv: Buffer;
    authTag: Buffer;
  } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encryptedData = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return { encryptedData, iv, authTag };
  }

  decryptBuffer(encryptedData: Buffer, iv: Buffer, authTag: Buffer): Readable {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    return Readable.from(decrypted);
  }

  pack(encryptedData: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    return Buffer.concat([iv, authTag, encryptedData]);
  }

  unpack(packedBuffer: Buffer): {
    encryptedData: Buffer;
    iv: Buffer;
    authTag: Buffer;
  } {
    const iv = packedBuffer.subarray(0, 12);
    const authTag = packedBuffer.subarray(12, 28);
    const encryptedData = packedBuffer.subarray(28);
    return { encryptedData, iv, authTag };
  }
}
