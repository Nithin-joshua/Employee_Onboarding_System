export const AadhaarSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    dob: { type: 'string' },
    gender: { type: 'string' },
    aadhaarNumber: { type: 'string' },
    address: { type: 'string' },
  },
  required: ['name', 'dob', 'gender', 'aadhaarNumber', 'address'],
};
