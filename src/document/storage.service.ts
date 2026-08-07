import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadDocument(employeeId: string, docType: string, buffer: Buffer, mimeType: string): Promise<string> {
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
    const { data, error } = await this.supabase.storage
      .from('employee-documents')
      .createSignedUrl(storagePath, 600);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }
}
