import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LocalVaultService } from '../common/services/local-vault.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;

  constructor(private readonly localVaultService: LocalVaultService) {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private isSupabaseEnabled(): boolean {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    return provider === 'supabase' && process.env.OCR_MODE !== 'mock';
  }

  async uploadDocument(employeeId: string, docType: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (!this.isSupabaseEnabled()) {
      // Local Vault Storage
      const { encryptedData, iv, authTag } = this.localVaultService.encryptBuffer(buffer);
      const packed = this.localVaultService.pack(encryptedData, iv, authTag);

      const ext = 'enc';
      const dir = path.join(process.cwd(), 'uploads', employeeId);
      const filePath = path.join(dir, `${docType.toUpperCase()}.${ext}`);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, packed);

      return `uploads/${employeeId}/${docType.toUpperCase()}.${ext}`;
    }

    // Supabase Storage
    const ext = mimeType.split('/')[1] || 'pdf';
    const pathWithinBucket = `${employeeId}/${docType.toUpperCase()}.${ext}`;

    const { data, error } = await this.supabase.storage
      .from('employee-documents')
      .upload(pathWithinBucket, buffer, {
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
      return `https://mock.supabase.co/storage/v1/object/public/employee-documents/${storagePath}`;
    }

    const { data, error } = await this.supabase.storage
      .from('employee-documents')
      .createSignedUrl(storagePath, 600);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async downloadDocument(storagePath: string): Promise<Buffer> {
    if (storagePath.startsWith('uploads/')) {
      const absolutePath = path.join(process.cwd(), storagePath);
      const packed = await fs.readFile(absolutePath);
      const { encryptedData, iv, authTag } = this.localVaultService.unpack(packed);
      const decryptedStream = this.localVaultService.decryptBuffer(encryptedData, iv, authTag);
      
      const chunks: any[] = [];
      for await (const chunk of decryptedStream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    if (!this.isSupabaseEnabled()) {
      return Buffer.from('mock document content');
    }

    const { data, error } = await this.supabase.storage
      .from('employee-documents')
      .download(storagePath);

    if (error) {
      throw new Error(`Failed to download from Supabase storage: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
