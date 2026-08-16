export const PanSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    panNumber: { type: 'string' },
    dob: { type: 'string' },
    fatherName: { type: 'string' },
  },
  required: ['name', 'panNumber', 'dob', 'fatherName'],
};
