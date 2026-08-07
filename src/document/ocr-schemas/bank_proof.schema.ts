export const BankProofSchema = {
  type: 'object',
  properties: {
    documentType: { type: 'string' },
    extractedText: { type: 'string' },
  },
  required: ['documentType', 'extractedText'],
};
