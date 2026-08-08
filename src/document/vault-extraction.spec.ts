import { LocalVaultService } from '../common/services/local-vault.service';
import { DocumentParserService } from '../employee/document-parser.service';

describe('LocalVault & DocumentParser Services', () => {
  let vaultService: LocalVaultService;
  let parserService: DocumentParserService;

  beforeAll(() => {
    vaultService = new LocalVaultService();
    parserService = new DocumentParserService();
  });

  it('should encrypt and decrypt a buffer correctly', async () => {
    const rawData = Buffer.from('Hello Secure Local Vault world!');
    const { encryptedData, iv, authTag } = vaultService.encryptBuffer(rawData);

    expect(encryptedData).not.toEqual(rawData);

    const decryptedStream = vaultService.decryptBuffer(encryptedData, iv, authTag);
    const chunks: Buffer[] = [];
    for await (const chunk of decryptedStream) {
      chunks.push(chunk as Buffer);
    }
    const decryptedBuffer = Buffer.concat(chunks);

    expect(decryptedBuffer.toString('utf-8')).toBe('Hello Secure Local Vault world!');
  });

  it('should pack and unpack encrypted parts correctly', () => {
    const rawData = Buffer.from('hello');
    const { encryptedData, iv, authTag } = vaultService.encryptBuffer(rawData);
    
    const packed = vaultService.pack(encryptedData, iv, authTag);
    const unpacked = vaultService.unpack(packed);

    expect(unpacked.iv).toEqual(iv);
    expect(unpacked.authTag).toEqual(authTag);
    expect(unpacked.encryptedData).toEqual(encryptedData);
  });

  it('should extract metadata gracefully from a buffer', async () => {
    const dummyBuffer = Buffer.from('hello');
    const metadata = await parserService.extractPdfMetadata(dummyBuffer);
    expect(metadata).toBeDefined();
  });
});
