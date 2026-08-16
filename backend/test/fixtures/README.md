# Test Fixtures

This directory contains fixtures **for automated tests only**.

## Rules
- These files are loaded exclusively by code under `test/` or `src/**/*.spec.ts`
- **Runtime application code** must never import from `test/fixtures/`
- **Seed data** lives in `prisma/seed-data/` — separate and distinct

## Structure
```
test/fixtures/
  ocr/        — Pre-extracted OCR JSON responses per document type (for spec mocks)
```

## Relationship to prisma/seed-data/
| Location | Purpose | Loaded by |
|---|---|---|
| `prisma/seed-data/ocr/` | Dev OCR data used when `OCR_MODE=local` | `OcrService` (runtime) |
| `test/fixtures/ocr/` | OCR data stubs for unit/integration tests | Test specs only |
