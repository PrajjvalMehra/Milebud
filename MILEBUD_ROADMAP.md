# Milebud Roadmap

This roadmap sequences delivery around facility intelligence while preserving room for the broader community vision. It is a recommendation, not a claim that unresolved product decisions have been made. No feature or migration work should start from an undecided policy as if it were settled.

## Before MVP implementation: resolve and prepare

### Product decisions

- Confirm launch scope, account requirements, supported authentication methods, and visitor access.
- Confirm whether facility reviews and saved facilities are MVP requirements.
- Set report expiry/escalation rules and moderation/appeal ownership.
- Decide initial facility data sources, deduplication, verification, and attribution.
- Establish location-permission and internationalization expectations for Canada/US.

### Technical readiness

- Generate and validate Supabase TypeScript types from the schema; add coverage for profiles, amenities, and facility submissions.
- Create repeatable role-based database tests. Use an isolated hosted development project for write-capable tests; do not require a local Supabase stack or run fixtures against production.
- Design the PostGIS search RPC/API contract (bounded radius, approved-only filters, stable pagination) before map UI.
- Define provenance and audit requirements before importing or manually curating a substantial facility dataset.
- Keep secrets server-side; never ship a service-role key in the mobile client.

**Exit gate:** Product decisions that affect schema and access are recorded; migrations and cross-platform UI can be tested reproducibly.

## MVP: trustworthy facility intelligence

### 1. Identity and access

- Confirm recovery and email-confirmation callbacks, profile editing, and session handling in hosted test accounts; add OAuth or other providers only after launch auth policy is decided.
- Verify public/private profile boundaries and ownership rules for all roles.

**Depends on:** authentication decisions, type coverage, role-level tests.

### 2. Discovery and facility details

- Replace starter navigation/content with product navigation.
- Deliver mobile-first map and list views backed by bounded, paginated geospatial search; provide text search and practical facility/amenity filters.
- Add a facility detail experience for address, categories, amenities, provenance, directions, and current reports.
- Keep nearby search opt-in; do not persist or expose device coordinates. Provide list/text discovery without location permission.
- Validate performance and behavior on iOS and Android, plus web where supported.

**Depends on:** spatial API contract, map-provider decision, facility data/provenance policy.

### 3. Facility supply and moderation

- Expand the implemented facility suggestion and owner-visible status flow with coordinate correction, duplicate detection, and better place entry.
- Add moderator queue, approval/rejection actions, audit trail, and duplicate handling.
- Ensure unapproved or rejected records cannot leak through public discovery.

**Depends on:** source-of-truth, verification, moderator-role and appeal decisions.

### 4. Reports and corroboration

- Build structured, one-handed report submission, active report display, confirm/dispute controls, and clear age/expiry.
- Add report abuse handling and a moderator workflow for disputed content.
- Exercise anonymous, author, other-driver, and moderator policies in database tests; validate expiry boundaries and concurrent counter updates.

**Depends on:** facility discovery/details for selecting a place, and resolution of report categories, expiry, authorship, threshold, and appeals.

### 5. Launch quality and operations

- Add privacy and safety review, accessibility checks, crash/error observability, database backups/retention review, and support/moderation procedures.
- Verify onboarding, empty states, slow/offline/error behavior, pagination, and location-denied flows.
- Release only after useful facility coverage exists in the launch region and moderation capacity is available.

**MVP scope decision:** The product vision calls facility reviews and saved places core modules, but their inclusion in the first release remains undecided. Resolve this before declaring the MVP scope complete.

## Post-MVP: deepen community and trust

1. **Facility reviews and ratings:** Separate visit-based reviews from reports, with agreed eligibility, structured prompts, edit/removal policy, fraud resistance, provenance, and moderation.
2. **Saved places:** Private, synchronized saved facilities and simple collections.
3. **Community posts and interactions:** Posts, comments, reactions, reporting/blocking, feed rules, moderation, and clear identity/privacy controls.
4. **Reputation:** Reputation based on transparent, abuse-resistant contribution signals; do not expose private trust/safety data.
5. **Notifications and personalization:** Explicit preferences and opt-in event notifications; deliver only after privacy, quiet-hour, and retention policies are set.
6. **Shipper/receiver intelligence:** Add role-relevant structured information only after validating driver needs and lawful/credible data sources.
7. **Moderation improvements:** Appeals, moderator audit review, queue prioritization, and operational reporting as volume warrants.

Each feature depends on a product policy, dedicated schema/RLS review, migration tests, and an end-to-end role-based test before broad rollout.

## Future expansion

- Separate company/employer entities and employer reviews, following decisions on relationship verification, reviewer protection, and legal/privacy response.
- Weather and road advisories with sourced data, freshness indicators, regional coverage, and explicit stale/urgent-information handling.
- Additional countries, languages, local units, address conventions, and region-specific facility categories.
- Verified facility/business tools or premium offerings, with transparent separation from community rankings and editorial decisions.
- More advanced personalization and cross-device experiences once core privacy controls and user preferences are established.

## Recommended implementation order

1. Resolve the product decisions that affect MVP access, report policy, map/location handling, and facility provenance.
2. Synchronize database types and add repeatable role-based database tests; execute write-capable cases only against an isolated hosted development project.
3. Complete authentication and profile UX for the existing identity schema; initial email/password entry and report contribution UI are now in place.
4. Build the geospatial search API, map/list discovery, and facility details.
5. Deliver facility-submission UX and moderation, with launch-region data quality. The user submission/status/edit flow is implemented; secure moderator read/update policies and the review queue remain.
6. Deliver report submission/feedback UX and moderation, then decide and implement MVP facility reviews/saves.
7. Finish launch readiness and cross-platform validation; add post-MVP community, employer, and notification modules as separately scoped, policy-backed work.
8. Expand internationally and consider weather/business offerings only with validated sources and operating plans.
