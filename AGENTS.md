# Architecture rules

- Render technical-report section bodies through `src/lib/pdfRichText.ts` while retaining the shared PDF layout; this preserves selectable formatted text without rasterizing sections.
- Plan addendum activity synchronization through `aditivoSync.ts` and omit progress/status from existing-row updates; this preserves daily progress while isolating changes to the selected addendum.
- Scope app-shell recovery to the app worker and its known caches, coordinate boot/chunk/boundary reset guards, and retain NetworkFirst HTML with preview registration guards; this avoids stale releases, reload loops and interference with auth or messaging.
