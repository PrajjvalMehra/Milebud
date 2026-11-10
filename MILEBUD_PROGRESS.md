# Milebud Progress

## Completed

- Inspected the repository, project instructions, current app, Supabase migrations, APIs, and existing progress record; created a product specification and phased roadmap covering the broader product vision.
- Added the reusable Supabase client with AsyncStorage-backed auth and public environment configuration.
- Added PostGIS/public schema conventions and a reusable `updated_at` trigger function.
- Added profile/private-profile identity schema, registration trigger, and RLS.
- Added facility, amenity, and facility-submission schemas with RLS and moderation boundaries.
- Added append-only facility reports with bounded expiry, confirmation/dispute feedback, server-managed counters, and moderation.
- Deployed the facility reports migration to the linked production project after confirming it was the only pending migration.
- Added typed facility and report query/submission APIs.
- Added initial email/password sign-up, sign-in, and sign-out UI, plus facility report submission and confirmation/dispute controls backed by the existing authenticated Supabase policies.
- Updated the web-specific tab navigation to expose Account and Contribute; verified the Account tab visibly renders sign-in, account creation, and password recovery controls.
- Redesigned the UI foundation: amber/slate light and dark palette with semantic success/warning/danger tokens; shared primitives (page layout, icons, status pills, filter chips, search field, text fields, segmented control, buttons, empty states, inline messages); icon-based bottom tab bar on web and native; facility cards with type icons, color-coded report status pills, expandable report details, and type filters; account hero/benefits and avatar identity card; contribution screen empty states and submission status pills. Report presentation helpers now live in `src/features/facility-reports/presentation.ts`.
- Added email-confirmation and password-recovery deep-link handling, new password updates, and editing for public profile fields plus private real name using existing owner-only RLS.
- Added authenticated facility suggestions, owner-only submission status, and pending-only editable details using the existing facility submission grants and RLS.
- Synchronized the database type definitions with the deployed public schema, including profiles, private profiles, facility submissions, PostGIS location typing, and public-table foreign-key relationships.
- Added local pgTAP coverage for 15 report schema/security invariants and 38 role-based identity, facility, report-feedback, and moderation checks.
- Replaced the home starter screen with public facility discovery, search, refresh, empty/error/loading states, and recent report summaries.
- Added server-side facility name/location search, type filtering and 20-item pages, plus an approved-facility detail screen with listed amenities and active driver reports. Existing report submission and feedback remain available.
- Added an interactive OpenStreetMap embed for web and native, with a selected facility pin from the current results page and a link to its details. Map use requires no API key or location permission.
- Implemented a moderator review queue and an atomic database review function in a new, unapplied migration. Approval creates an approved facility; rejection does not. The function checks trusted moderator claims, rejects self-review and stale submissions, and records the reviewer.
- Added an SSR-safe auth storage adapter so the web route can render without accessing browser storage on the server.

## Current status

- Product scope, current implementation coverage, key architectural gaps, unresolved decisions, and a recommended implementation sequence are documented in `MILEBUD_PRODUCT_SPEC.md` and `MILEBUD_ROADMAP.md`.
- The client database types now cover all seven deployed public tables; Supabase CLI generation against the linked schema confirmed the table inventory and the absence of public RPCs or PostgreSQL enums.
- Public discovery is wired to approved facilities and active reports. The linked project currently has no approved facilities, so the verified UI shows its empty state.
- The Account tab provides email/password sign-up/sign-in, confirmation and recovery callbacks, sign-out, and profile editing. OAuth/provider selection, public profile browsing, and the final launch authentication policy remain open.
- Current screens share layout and core visual primitives; future map features can reuse the same page, card, and action patterns.
- Discovery pages use name/ID ordering and offset pagination; records can move between pages as the dataset changes. Report queries are subject to the Supabase row limit and are not yet paginated. Literal wildcard search matches still need verification against isolated hosted fixture data.
- The embedded map displays one selected facility at a time; it does not search by map bounds or show all facilities as pins. OpenStreetMap receives map requests and selected public facility coordinates. Its donated tile service has a usage policy, limited capacity, and no uptime guarantee; revisit hosting/provider choice before scaling. See https://operations.osmfoundation.org/policies/tiles/.
- Authenticated drivers can submit the existing structured report types and confirm/dispute active reports from facility cards. End-to-end behavior with real authenticated accounts still needs validation.
- The Contribute tab supports facility suggestions and owner-visible review status. New submissions require manual facility coordinates because no map or place picker exists; pending edits intentionally do not change coordinates.
- Facility moderation is not deployed: apply and test the new migration in a separate hosted development project first. Provision trusted moderators through the Supabase Auth administrative API or another secured administrative process by setting `app_metadata.is_moderator` to `true`; never use user-editable metadata. Moderators must refresh their session to receive updated claims, and revocation may not take effect until existing JWTs expire.
- Role-based SQL tests cover owner/other-user, anonymous, and moderator behavior, but the transactional write tests have not been executed. Local Supabase testing is not part of the user's workflow; a hosted development project is needed for isolated write-capable verification.
- The review queue excludes a moderator's own submissions and asks reviewers to check duplicates manually. It does not yet support rejection reasons, duplicate linking, or appeals. End-to-end hosted database verification and moderator provisioning remain outstanding.
- Supabase environment variables are configured locally; never print or commit their values.

## Architecture

- Permanent facility records are separate from expiring driver reports.
- Report records identify a facility, not a driver's live location.
- Authenticated report creation derives the submitter from `auth.uid()`; read grants omit the submitter ID.
- Public content is exposed through explicit grants and RLS policies.

## Verification

- `npx tsc --noEmit` passed.
- `npx expo lint` passed.
- Expo web export bundled the Home, Account, and Contribute routes successfully; linked-schema type generation completed without displaying credentials.
- Account recovery and profile editing pass lint and TypeScript checks and bundle into the web export.
- `git diff --check` passed.
- After the UI redesign, `npx expo lint`, `npx tsc --noEmit` passed; browser checks (390px mobile and desktop widths, light and dark) confirmed Home (with mocked facility/report responses, no data written), Account, and Contribute render correctly. Native tab icons (SF Symbols/Material) are type-checked but not yet visually verified on a device.
- Facility discovery/detail browser checks used non-persistent fixtures for pagination, navigation, amenities and reports; live reads showed the empty state. Fresh Expo server renders of Home and an invalid detail link in light and dark modes produced no hydration errors after clearing Metro's stale cache. Native navigation has not been device-tested.
- OpenStreetMap embed, visible attribution, zoom controls, a selected pin, and location-error retry were verified in the browser with a non-persistent facility fixture. The live GeoJSON endpoint returned an empty feature collection; there are no approved facilities available to test a real marker. The Android JavaScript bundle builds; native WebView has not been device-tested.
- Moderator queue, approval, rejection, cancellation, and anonymous visibility were browser-tested using mocked auth and API responses only. `supabase/tests/facility_submission_review.sql` contains transactional authorization and review tests, but has not been executed because an isolated hosted development database is not configured. The migration has not been applied.
- No local Supabase stack is used. Write-capable database tests have not been run; do not run fixtures against linked production. Use a separate hosted development project if database integration tests are needed.
- Auth confirmation and recovery redirects use the configured app scheme; add the app callback and deployed web URL to Supabase Auth's allowed redirect URLs before testing those email flows. No Auth settings were changed.
- 15 read-only production catalog/security assertions passed for the facility reports migration.
- `npx supabase db lint --remote --schema public --level error` found no schema errors.
- Public active-report REST access returned HTTP 200; anonymous feedback access was denied.
- Expo web smoke test rendered the discovery route and its empty state without the prior SSR storage crash.
- No migration was applied during this report or submission UX work.

## Next

- Resolve product decisions that affect MVP access/authentication, report policy, location handling, facility data provenance, and MVP reviews/saves.
- Validate the authenticated report and facility-submission flows against a hosted development project, not production.
- Run the moderation migration and SQL tests in an isolated hosted development project, provision test moderators securely, and verify approval/rejection end to end before deployment.
- Design bounded, stable PostGIS discovery before adding map-bounds/nearby search and directions; review tile capacity and provider alternatives before launch.
- Add coordinate editing/place picking and deduplication to facility suggestions after choosing a place-search/map approach.
- Replace remaining starter navigation/presentation components as the MVP information architecture is implemented.
