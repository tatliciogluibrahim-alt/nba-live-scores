# docs/qa-checklist.md

# Sightline — QA Checklist

This file contains two checklists: one for new seed cases before publication, and one for new features or page changes before shipping.

Run the appropriate checklist before marking any work done. The build must pass before any checklist is considered complete.

---

## Checklist A: New seed case

Use this checklist before setting `published: true` on any case entry.

### Schema and validation

- [ ] `npm run validate-seed` passes with no errors for this case file
- [ ] All required fields are populated (no undefined required fields)
- [ ] `id` is a valid URL-safe slug (lowercase, hyphens only, no spaces)
- [ ] `date` is in ISO 8601 format (full, month-only, or year-only)
- [ ] `dateUncertainty` matches the precision of `date`
- [ ] `sourceURL` is a valid URL that resolves to a live primary source document
- [ ] `sourceType` correctly categorizes the source (see enum in `docs/data-taxonomy.md`)
- [ ] `sourceReleasedDate` is populated
- [ ] `reviewedBy` is populated ("Sightline editorial team" or named reviewer)
- [ ] `lastReviewed` is populated with today's date in ISO 8601 format

### Source quality

- [ ] The source is a primary source (government, military, FOIA, academic peer-reviewed)
- [ ] The source is NOT a news article, documentary, YouTube channel, podcast, or advocacy website
- [ ] If the source is paywalled, `sourceNotes` explains this and the DOI/abstract link is in `sourceURL`
- [ ] If the document has moved, `sourceNotes` includes an archive note

### Summary and copy

- [ ] `summary` is 4–6 sentences in plain English
- [ ] `summary` contains no jargon unexplained to a general reader
- [ ] `summary` does not contain any banned language:
  - [ ] No "unexplained"
  - [ ] No "defies physics"
  - [ ] No "reveals" or "exposes"
  - [ ] No "alien" as a conclusion
  - [ ] No "cover-up"
  - [ ] No "classified for a reason"
  - [ ] No "stunning", "shocking", or "bombshell"
  - [ ] No "remains unexplained"
  - [ ] No "the truth"
  - [ ] No "proof" as a conclusion
- [ ] `interestReason` is one sentence and states why the case is notable in the public record (not why it is dramatic)
- [ ] `scientificUsefulnessReason` explains the usefulness rating in one sentence
- [ ] All text in `possibleExplanations[].reason` is source-cited if `ruledOut` is true

### Evidence and claims

- [ ] `reportedClaims` only contains entries with `source: "witness"` or `source: "document"` — never `source: "sensor"` unless independently corroborated
- [ ] `measuredData` is an empty array if no calibrated sensor data is in the public record
- [ ] `evidenceLevel` is consistent with the `evidenceScore` band (see `docs/scoring-framework.md`)
- [ ] `sensorTypes` is an empty array if no sensor data is present — not `["none_reported"]` (use the enum correctly)
- [ ] `evidenceFormats` is accurate to what is actually available in the public record

### Missing data

- [ ] `missingFields` lists every field that is not in the public record
- [ ] `missingFields` does not include fields that are partially or fully present
- [ ] If a field is partially present, it is reflected in `measuredData` with `confidence: "moderate"` or `confidence: "low"`, not listed in `missingFields`

### Possible explanations

- [ ] `possibleExplanations` has at least two conventional hypothesis entries
- [ ] Conventional hypotheses appear before speculative entries in the array
- [ ] Every entry with `ruledOut: true` has a `reason` field with a source citation
- [ ] No entry concludes an extraterrestrial explanation — the extraterrestrial hypothesis may appear as speculative with `ruledOut: false` and `reason: "No physical evidence in the public record supports this hypothesis."`

### Similarity tags

- [ ] `tags` uses only tags from the controlled vocabulary in `docs/data-taxonomy.md`
- [ ] Tags accurately reflect documented characteristics — not speculative ones
- [ ] No tags claim a characteristic that is in `reportedClaims` but not in `measuredData` (e.g., do not tag `hypersonic_speed` if speed was only reported by a witness, not measured)
- [ ] `similarCases` is left as an empty array — it will be computed at build time

### Final

- [ ] `published` is set to `true`
- [ ] `npm run validate-seed` passes one final time after all edits
- [ ] `npm run build` passes with no errors

---

## Checklist B: New feature or page change

Use this checklist before marking any code change as done.

### Build

- [ ] `npm run build` passes with no errors and no TypeScript errors
- [ ] `npm run validate-seed` still passes after the change
- [ ] No `any` types introduced
- [ ] No console errors or warnings in the browser at runtime

### Functionality

- [ ] The new feature or change works correctly at 375px (mobile)
- [ ] The new feature or change works correctly at 768px (tablet)
- [ ] The new feature or change works correctly at 1280px (desktop)
- [ ] All interactive elements work with keyboard navigation (Tab, Enter, Space, Escape)
- [ ] All interactive elements work with touch input on mobile

### Data and scores

- [ ] No scores are hardcoded in component props — all scores come from `lib/scoring.ts`
- [ ] Every evidence score display includes the adjacent plain-English explanation copy
- [ ] Every evidence score display includes a link to `/methodology`
- [ ] Every missing data indicator includes the required copy ("This data is not in the public record. Its absence does not confirm or deny any explanation.")
- [ ] Every scientific usefulness badge includes its one-sentence reason

### Copy and language

- [ ] No banned language in any new UI copy (see Checklist A for the full list)
- [ ] All section headers use the correct labels from `docs/design-direction.md`
- [ ] Empty states use approved copy from `docs/design-direction.md`
- [ ] No new jargon introduced without a plain-English explanation adjacent to it

### Visual system

- [ ] No new colors introduced that are not in the design token set
- [ ] No evidence-level colors used outside of evidence-scoring contexts
- [ ] No UFO/alien iconography introduced
- [ ] No glitch effects, redaction tape, or dramatic overlays introduced
- [ ] Cards use 8px border radius, badges use 4px border radius
- [ ] Data values, scores, IDs, and sensor readings use `font-mono` (JetBrains Mono)

### Accessibility

- [ ] All color coding has a text or icon companion — color is never the only signal
- [ ] All new text elements meet WCAG AA contrast ratio (4.5:1 for body, 3:1 for large text)
- [ ] All new interactive elements are keyboard navigable with a visible focus indicator
- [ ] Any new data table uses `<th scope="col">` or `<th scope="row">` correctly
- [ ] Any new data table includes a `<caption>`
- [ ] Any new tooltip uses `role="tooltip"` and is triggered by both hover and focus (not hover-only)
- [ ] Any new dialog uses `role="dialog"`, `aria-modal="true"`, and traps focus
- [ ] Any new chart or visualization has a `role="img"` with a descriptive `aria-label`
- [ ] Any new chart or visualization has a visually hidden `<table>` fallback with the same data
- [ ] Minimum touch target size for all new interactive elements: 44px × 44px

### Source links

- [ ] No new `SourceLink` components point to secondary sources (news, blogs, YouTube)
- [ ] All new source links open in a new tab (`target="_blank"`) with `rel="noopener noreferrer"`
- [ ] All new source links are 44px minimum tap target

### Exports

- [ ] If the change affects case data, verify JSON export still downloads valid JSON on mobile and desktop
- [ ] If the change affects the evidence matrix, verify CSV export still downloads correctly

### Static generation

- [ ] Any new dynamic route has `generateStaticParams` implemented
- [ ] No `fetch` calls or `useEffect` data fetching introduced for case data
- [ ] No external API calls introduced (Phase 1 is static only)

### Routes and pages

- [ ] `app/not-found.tsx` exists and renders correctly with `AppShell` wrapper
- [ ] `app/cases/page.tsx` exists and redirects to `/explore`
- [ ] `ModeToggle` is visible without scrolling on all screen sizes (sticky on mobile, tab strip below BreadcrumbBar on desktop)
- [ ] `SourceLink` on case detail pages is visible above the fold on desktop without scrolling

### Final check

- [ ] The `AGENTS.md` rules have not been violated
- [ ] The `PROJECT_CONTEXT.md` non-negotiable rules have not been violated
- [ ] The change is documented in `CHANGELOG.md` if it is user-facing
- [ ] `npm run test` passes (Vitest)
- [ ] `npm run build` passes one final time after all edits
