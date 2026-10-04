export const EducationSchema = {
  type: 'object',
  properties: {
    percentageOrCgpa: {
      type: 'string',
      description:
        'The overall percentage (e.g. "85.4%") or CGPA (e.g. "8.6/10" or "8.6 CGPA") achieved. Only extract this value.',
    },
    percentage: {
      type: 'string',
      description:
        'Percentage if explicitly stated (e.g. "85.4%"), otherwise empty string or null.',
    },
    cgpa: {
      type: 'string',
      description:
        'CGPA or GPA if explicitly stated (e.g. "8.6"), otherwise empty string or null.',
    },
  },
  required: ['percentageOrCgpa', 'percentage', 'cgpa'],
  additionalProperties: false,
};
