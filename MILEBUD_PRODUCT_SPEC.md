# Milebud Product Specification

## Product definition

Milebud is an independent, privacy-first community and intelligence platform for professional truck drivers. It launches for drivers in Canada and the United States, with an architecture that can support additional countries. Its distinguishing value is timely, trustworthy facility intelligence—not tracking drivers.

The mobile app targets iOS and Android. Usability should favor glanceable information, large touch targets, short contribution flows, and one-handed use. The product must not encourage interaction while a vehicle is moving. Core community features are intended to remain free; premium and business offerings are future possibilities, not launch requirements.

## Product principles

1. Keep permanent facility facts separate from time-sensitive driver observations.
2. Keep reviews (subjective experiences over a visit) separate from reports (observable conditions at a time).
3. Identify official or verified information separately from community-submitted information.
4. Never publish or retain a driver's live location as a product feature. Nearby search is opt-in and should not persist a user's current coordinates.
5. Make the age, expiry, and corroboration of temporary information apparent.
6. Apply least privilege, server-side ownership checks, and moderation controls to user-generated content.
7. Prefer a reliable, useful discovery-and-reporting MVP over breadth in secondary social features.

## Roles

| Role | Intended capabilities | Current state |
|---|---|---|
| Visitor | Browse public approved facilities and visible, current reports. | Public database reads exist; app discovery is a list, not a map. |
| Driver (authenticated user) | Maintain a profile; submit facility suggestions and reports; corroborate reports; later review, save, and participate in community features. | Identity records and report/submission database paths exist. Authentication screens and most contribution UI do not. |
| Moderator | Review disputed or flagged content and facility submissions; record moderation actions. | Report moderation is protected by trusted `app_metadata`; facility submission moderation UI/workflow is absent. |
| Platform administrator | Manage roles, policy, content, and platform operations. | No administration UI or complete role-management model exists. |
| Facility/company representative | Potentially manage an official listing or respond to feedback. | Not implemented; access and verification rules are undecided. |

These are product roles, not a claim that each has a complete authorization implementation. A driver submitting a report remains a driver; it does not create a separate privileged role.

## Feature requirements and implementation status

Status is based on the repository implementation and progress log. “Implemented” describes a backend or UI slice, not a complete production-ready product module.

| Module | Product requirements | Existing status |
|---|---|---|
| Accounts and profiles | Secure sign-up/sign-in, recovery, session lifecycle, public profile, private account data, reputation that cannot be self-awarded. | Profile/private-profile tables, signup trigger, username validation, and RLS exist. The app supports email/password sign-up/sign-in, email confirmation callbacks, password recovery, sign-out, and editing public and private profile fields. OAuth, public profile browsing, reputation, and the final launch authentication policy remain open. |
| Facility discovery | Map-first and list discovery; search/filter by type, amenities, geography, and international address; details and directions; approved records only. | Approved facility schema includes PostGIS geography, types, addresses, amenities, and indexes. Home screen fetches at most 100 records, filters text locally, and displays recent report summaries. No map, radius search, details route, amenity client API, or pagination. |
| Facility information | Truck stops, shippers, receivers, rest areas, weigh stations, fuel stations, repair shops, and parking. Make source and verification status clear. | Generic facility records and types exist, including shipper/receiver. No specialized shipper/receiver fields or data provenance/verification model. |
| Facility submissions | Drivers suggest new places or corrections; moderators review; only approved data becomes public. | Submission table, ownership RLS, pending-owner edits, review fields, and a mobile/web suggestion form with owner-visible statuses exist. New submissions use manually entered coordinates; edit and moderator review flows remain limited. There is no moderator queue or action flow. |
| Temporary reports | Drivers submit structured parking, congestion, amenity, fuel, wait-time, access, and condition observations; show time and expiry; allow confirmation/dispute; moderate abuse. | Report and feedback tables, bounded expiry, server-managed counters, dispute escalation, RLS, APIs, and initial mobile/web forms for submitting and corroborating reports exist. Authenticated end-to-end coverage and transactional pgTAP execution remain outstanding. Reports are facility-linked, not driver-location-linked. |
| Facility reviews and ratings | Structured, visit-based experience reviews and ratings, distinct from current-condition reports; transparent eligibility, recency, and moderation. | Not implemented. No tables, policies, APIs, or UI. |
| Company/employer reviews | Separate workplace/employer entities and reviews from facility records and consumer facility reviews. Protect reviewers and support moderation. | Not implemented. Entity model, privacy, verification, and review rules are undecided. |
| Community | Posts, comments, reactions, profiles, feed rules, reporting, and moderation. | Not implemented. Some starter navigation and presentation components remain. |
| Saved places | Private driver collections/favorites, usable across sessions and devices. | Not implemented. |
| Notifications and personalization | Opt-in, useful updates with user controls; avoid exposing private location or sensitive activity. | Not implemented; push/in-app channels and trigger rules are undecided. |
| Weather and road advisories | Timely, geographically relevant advisories with source, freshness, and clear separation from facility reports. | Not implemented; data providers, geographic scope, and responsibility for stale/urgent notices are undecided. |
| Moderation and administration | Review queues, auditability, escalation, appeals/reporting, role management, and operational safeguards. | A report dispute threshold can set `under_review`; moderator JWT metadata can govern report changes. General admin tools, submission moderation, and a complete moderation process are missing. |
| Internationalization | Country-aware addresses, units, languages, time zones, and terminology; begin with Canada and the US without encoding North American assumptions into shared models. | Country code and flexible address columns provide a starting point. Localization, unit conventions, translation, and country-specific formats are not implemented. |

## Major user journeys

1. **Find a place:** Open discovery, search or browse a map/list, filter for a facility or amenity, inspect permanent details and their source, then choose a navigation action. Location access is optional and used only for the requested search.
2. **Check current conditions:** Open a facility and see active reports with age, expiry, and corroboration state. Expired, hidden, and under-review content is not presented as current public guidance.
3. **Contribute a report:** Sign in if required by the final access policy, select a facility, choose a short structured observation, optionally add bounded context, and submit. The UI confirms the timestamp/expiry and supports later corroboration or dispute.
4. **Suggest or correct a facility:** Submit a candidate or correction, see its pending/review status, and receive a clear outcome. Public facility data changes only through an authorized review path.
5. **Build identity and reputation:** Create a profile, manage public fields separately from private information, and earn reputation through defined trustworthy contributions—not through self-editable counters.
6. **Review a visit:** Submit a structured experience about a facility (or, separately, an employer/company) under the eligibility and privacy rules selected for that review type.
7. **Participate in community:** Publish or respond to content, use reactions, control notifications, and report abuse. Identity, visibility, and moderation follow the final community policy.
8. **Moderate:** An authorized moderator reviews a queue, sees only the information required for the decision, records an attributable action, and follows a consistent escalation/appeal policy.

## Data and trust boundaries

- **Facilities** are durable places and include geography, international address fields, category, amenities, and approval status.
- **Facility submissions** are pending user proposals; they are not public facilities until reviewed.
- **Facility reports** are expiring observations about one facility. Current constraints allow a six-hour default and at most 24 hours; feedback is unique per user/report and a dispute count of three moves a report to review.
- **Reviews** must be a separate data model from reports. A review describes a visit or relationship over time, not live parking/fuel/condition availability.
- **Company reviews** must not be stored as facility reviews. Employer identity and relationship verification require their own model and privacy rules.
- **Official/verified information** must be distinguishable from driver-submitted information. Current facility columns do not record provenance or verification history.
- **Driver identity and private profile data** are distinct. Report reads do not expose submitter identity through the granted report columns.
- **Location privacy** means no live driver-location table, public location field, or location-bearing report payload. Facility coordinates are public place coordinates, not driver coordinates.

## Architectural implications and readiness

### Strengths to preserve

- Expo Router, TypeScript, React Native, and one Supabase client are established.
- `public.profiles` and `public.private_profiles` separate public and private profile data.
- PostGIS geography and GiST indexes support future spatial querying.
- Facility, facility submission, report, and feedback records are distinct, with RLS and explicit grants.
- Report expiry, feedback counters, and moderator-only mutation are enforced in the database.
- The client has a reusable typed API boundary and does not need a privileged key.

### Gaps to address before broad feature development

1. **Define the MVP and access policies.** Decide what visitors can do, which actions require an account, and what must ship in the first public release. The existing schema does not settle these product policies.
2. **Establish generated schema types and test coverage.** `src/types/database.types.ts` currently covers facilities and reports but not profiles, private profiles, amenities, or submissions. Keep client types synchronized with migrations and add repeatable local database/RLS tests; current SQL tests are report catalog/security assertions, not full role-based journeys.
3. **Design the spatial API before building the map.** Add a bounded, paginated server-side search contract using the geography index, filters, and approved-only access. Do not fetch a large set and filter it on-device. Make location permission optional and avoid persisting the device's current position.
4. **Complete the identity path.** Build auth and profile UX, define provider support, and test signup, session persistence, recovery, ownership, and private-field access. Provider configuration is not present in the app.
5. **Add provenance and verification deliberately.** Decide how curated/imported/official data, driver submissions, and moderator verification are represented before ingesting external facility data.
6. **Keep new user-content models separate and policy-first.** Reviews, company reviews, posts, comments, reactions, and saves each need their own data ownership, visibility, retention, moderation, and indexing rules before migrations are added.
7. **Keep international data flexible.** Treat region/state/province as country-specific text or a governed country-aware value; do not assume US-only addressing, units, or language.
8. **Provide moderation operations before opening contributions widely.** A database policy is not an operational queue. Add auditable workflows and role-management safeguards without trusting client-editable profile metadata.

## Decisions that remain open

No values below are implied by this specification; resolve them with product ownership before they become schema or UI constraints.

1. **MVP boundary:** Which of facility reviews, saved places, and basic community participation are launch-blocking versus post-MVP?
2. **Authentication/access:** Can visitors browse all public information? Which actions require sign-in? Which sign-in providers and account recovery methods are required at launch? An email/password path exists for the initial implementation but does not settle the launch policy.
3. **Location:** Is nearby search offered at launch? What permission timing, distance limits, and on-device-only handling are acceptable?
4. **Facility data:** What is the authoritative seed/ingestion source, how are duplicates merged, who verifies records, and how are official details attributed and refreshed?
5. **Reports:** Are the current report categories, six-hour default, 24-hour maximum, and three-dispute escalation suitable? Can authors edit/delete? How are spam, coordinated disputes, and appeals handled?
6. **Facility reviews:** Which structured questions and rating scale are required? What constitutes an eligible visit? Are reviews anonymous/pseudonymous, editable, or removable?
7. **Employer reviews:** What counts as an employer/company, how is a reviewer relationship verified, what identifying details are prohibited, and what is the defamation/privacy response process?
8. **Community:** Are posts public, follower-based, or account-only? Which content types, retention rules, and user blocking/reporting controls are needed?
9. **Moderation:** Who appoints moderators, what is the audit/appeal process, and what criteria govern removal or restoration?
10. **Notifications:** Which events warrant notifications, which channels are supported, and what are the opt-in, quiet-hours, and retention rules?
11. **International behavior:** Which languages, measurement units, postal/address formats, and additional launch countries are in scope?
12. **Business/premium:** Are facility-owner accounts or paid products planned, and if so, what separation from neutral rankings/reviews is required?
13. **Weather/advisories:** Which sources, update frequency, jurisdictions, and stale-data disclaimers are acceptable?

## Product acceptance guardrails

- A report is visibly time-bound and cannot be mistaken for a permanent facility fact or review.
- User location is not displayed to other users or persisted as a live location.
- Public content has an explicit provenance/verification state once external or curated data is introduced.
- Ownership and moderation are enforced server-side and covered by tests for anonymous, owner, other authenticated user, and moderator roles.
- Every user-generated content type has abuse/reporting and removal behavior before broad release.
- Core discovery and contribution flows are usable on iOS and Android with accessible touch targets and a safe interaction model.
