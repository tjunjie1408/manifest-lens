# Shipping feature: where to change things

All product text and code in this feature are English. Shared UI primitives remain in `src/lib/components/ui`; they are building blocks, not the shipping pages themselves.

## Directory map

```text
src/
  routes/
    +page.server.ts                     # Redirect to the Evidence Map
    shipping/
      +layout.svelte                   # Load shipping styles once
      +page.server.ts                  # Authenticate and load the review queue
      +page.svelte                     # Compose ReviewQueue
      overview/
        +page.server.ts                # Authenticate and load Evidence Map data
        +page.svelte                   # Compose EvidenceDashboard
      [id]/
        +page.server.ts                # Load a case and handle review actions
        +page.svelte                   # Compose ReviewWorkspace
        attachment/+server.ts          # Authorize and serve original attachments
  lib/
    components/
      ui/                              # Existing generic UI primitives
      shipping/
        StatusBadge.svelte             # Shared status wording and colors
        shipping.css                   # Shipping layout and component styles
        dashboard/
          EvidenceDashboard.svelte     # Filters, summary counts and pagination
          EvidenceMatrix.svelte        # Desktop matrix and mobile evidence list
        queue/
          ReviewQueue.svelte           # Email search and review queue
        review/
          ReviewWorkspace.svelte       # Case header, form lifetime and dirty state
          EvidencePanel.svelte         # Original email and document evidence
          DocumentPairing.svelte       # Category and SI/BL selection
          FieldComparison.svelte       # Grouped fields, sources and correction inputs
          ReviewDecision.svelte        # Reason and human decision controls
          ReviewHistory.svelte         # Saved revisions and technical records
    shipping/
      types.ts                         # Typed view contracts; no database access
      presentation.ts                  # Category labels, field groups and bucket labels
      evidence-map.ts                  # Pure evidence projection, filtering and counts
    schemas/shipping.ts                # Validation and persisted domain contracts
    server/services/shipping.ts        # Original loading, database isolation, Python bridge
```

## Common changes

| Task                                             | Start here                                         |
| ------------------------------------------------ | -------------------------------------------------- |
| Change colors, spacing or responsive layout      | `shipping.css`                                     |
| Change shared status wording                     | `StatusBadge.svelte`                               |
| Change category names or field grouping          | `presentation.ts`                                  |
| Change dashboard filtering or pagination         | `dashboard/EvidenceDashboard.svelte`               |
| Change evidence cells or mobile cards            | `dashboard/EvidenceMatrix.svelte`                  |
| Change document previews                         | `review/EvidencePanel.svelte`                      |
| Change field comparison or edit controls         | `review/FieldComparison.svelte`                    |
| Change confirmation UI                           | `review/ReviewDecision.svelte`                     |
| Change confirmation permissions or persistence   | `server/services/shipping.ts` and regression tests |
| Change what counts as missing/confirmed evidence | `shipping/evidence-map.ts` and projection tests    |

## Data and state ownership

Routes enforce authentication and no-store responses. The server service pins the source run, isolates saved history by owner/run/email, and projects the latest result. Dashboard and queue consume the same typed projection; neither reads answer keys, loads models, nor accesses the database directly.

The dashboard owns only query/category/bucket/page state. Summary counts cover the selected search and category; the selected summary bucket narrows the displayed rows. Buckets are mutually exclusive in this order: confirmed, information requested, unresolved classification, other categories, missing evidence, differences, awaiting confirmation. A missing-evidence case can still contain a visible conflict cell.

ReviewWorkspace owns the single HTML form and unsaved-change flag. Child panels render inputs inside that form and receive narrow typed props. Collapsing a panel does not remove its form fields. Only the server can confirm a saved revision; the client button is an additional usability guard.

The matrix exposes Match, Difference, Unknown and Not applicable independently from the human decision. Field links open the exact field and its evidence disclosures. Unknown is used when comparison data or source locations are missing. The original classification uncertainty is retained separately from the latest reviewed classification. The UI does not infer calibrated confidence or entropy.

## Verification

- `npm run check`
- Scoped ESLint for the folders changed
- `npm test -- tests/evidence-map.test.ts tests/shipping.test.ts` (requires the configured local test database)
- `scripts/shipping-browser-smoke.mjs` (real browser; disposable synthetic account)

The browser script accepts `SHIPPING_TEST_URL`, `SHIPPING_TEST_ARTIFACTS` and `PLAYWRIGHT_MODULE_PATH`; use the existing project environment and a local URL. It checks landing, filtering, counts, pagination, evidence drill-down, correction updates, authentication, sign-off rules and mobile overflow. Its test user is deleted in a finally block. Do not put user credentials into the script.

The UI refactor requires no new packages. The local container now bundles the Python review bridge and frozen evidence; see the repository README for Docker commands. Model training and batch evaluation remain separate. Cloud deployment has not been performed.
