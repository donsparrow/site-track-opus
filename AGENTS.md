# Architecture rules

- Render technical-report section bodies through `src/lib/pdfRichText.ts` while retaining the shared PDF layout; this preserves selectable formatted text without rasterizing sections.
