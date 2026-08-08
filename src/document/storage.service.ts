import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LocalVaultService } from '../common/services/local-vault.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * StorageService handles document file storage.
 *
 * Storage mode is controlled by STORAGE_PROVIDER env var:
 *   - 'local'    (default): stores encrypted files under uploads/
 *   - 'supabase': stores files in Supabase Storage bucket 'employee-documents'
 *
 * Both providers are production-grade. There is no mock/fake mode.
 * If required configuration is missing, this service throws a configuration error.
 */
@Injectable()
export class StorageService {
  private supabase: SupabaseClient | null = null;

  constructor(private readonly localVaultService: LocalVaultService) {
    if (this.isSupabaseEnabled()) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'STORAGE_PROVIDER is set to "supabase" but SUPABASE_URL and/or ' +
            'SUPABASE_SERVICE_ROLE_KEY are not set. ' +
            'Configure them in your .env file (see .env.example).',
        );
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  private isSupabaseEnabled(): boolean {
    return (process.env.STORAGE_PROVIDER || 'local') === 'supabase';
  }

  async uploadDocument(
    employeeId: string,
    docType: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (!this.isSupabaseEnabled()) {
      // Local encrypted vault storage
      const { encryptedData, iv, authTag } =
        this.localVaultService.encryptBuffer(buffer);
      const packed = this.localVaultService.pack(encryptedData, iv, authTag);

      const dir = path.join(process.cwd(), 'uploads', employeeId);
      const filePath = path.join(dir, `${docType.toUpperCase()}.enc`);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, packed);

      return `uploads/${employeeId}/${docType.toUpperCase()}.enc`;
    }

    // Supabase Storage
    const ext = mimeType.split('/')[1] || 'pdf';
    const pathWithinBucket = `${employeeId}/${docType.toUpperCase()}.${ext}`;

    const { error } = await this.supabase!.storage.from(
      'employee-documents',
    ).upload(pathWithinBucket, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      throw new Error(`Failed to upload to Supabase storage: ${error.message}`);
    }

    return pathWithinBucket;
  }

  async getSignedUrl(storagePath: string): Promise<string> {
    if (!this.isSupabaseEnabled()) {
      // For local vault files, construct a local-accessible reference.
      // The signed URL concept only applies to Supabase; for local files the
      // OCR service must use downloadDocument() to get the decrypted buffer.
      throw new Error(
        'getSignedUrl is only available when STORAGE_PROVIDER=supabase. ' +
          'For local storage, use downloadDocument() to obtain the file buffer.',
      );
    }

    const { data, error } = await this.supabase!.storage.from(
      'employee-documents',
    ).createSignedUrl(storagePath, 600);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async downloadDocument(storagePath: string): Promise<Buffer> {
    if (storagePath.startsWith('uploads/')) {
      const absolutePath = path.join(process.cwd(), storagePath);
      const packed = await fs.readFile(absolutePath);
      const { encryptedData, iv, authTag } =
        this.localVaultService.unpack(packed);
      const decryptedStream = this.localVaultService.decryptBuffer(
        encryptedData,
        iv,
        authTag,
      );

      const chunks: Buffer[] = [];
      for await (const chunk of decryptedStream) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buf);
      }
      return Buffer.concat(chunks);
    }

    if (!this.isSupabaseEnabled()) {
      throw new Error(
        `Cannot download document at path "${storagePath}": ` +
          'STORAGE_PROVIDER is not "supabase" and the path is not a local uploads/ path.',
      );
    }

    const { data, error } =
      await this.supabase!.storage.from('employee-documents').download(
        storagePath,
      );

    if (error) {
      throw new Error(
        `Failed to download from Supabase storage: ${error.message}`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
