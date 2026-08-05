# BloodSync 2.0 — Implementation Plan (v2)

**Prepared by:** Zeeshan Sajid · zeeshansajid361@gmail.com
**Team:** Zeeshan Sajid & Irtaza
**Stack:** MongoDB · Express.js · React.js · Node.js (MERN)
**Timeline:** 4 weeks

---

## 0. Landscape Review — What Real Platforms Actually Do

Before revising the plan, it's worth knowing who else is solving this problem, because it changes what "hospital integration" should realistically mean.

- **BloodSync Pakistan** (bloodsync.pk) — an initiative of the Family and Fellows Foundation, registered with SECP and the Punjab Charity Commission. 900+ donors, 40+ facilitated donations, partners including NUST's Community Service Club, Air University, and Sundas Foundation Islamabad. Its model: donors and recipients use the app, but every request is **manually reviewed by foundation staff** against uploaded ID and a hospital-issued request document before any donor is notified. Donation always happens *at* a hospital or blood bank — the app never claims to integrate with a hospital's internal systems. Donors are gamified with verified-donation tiers (Spark → Pulse → Life Saver → Guardian → Anchor).
- **E Blood** (eblood.com.pk) — AI/location-based matching; testimonials describe donors routed directly to named hospitals (e.g. Shifa International, Islamabad) for the actual donation.
- **Pakistan Red Crescent Society (PRCS)** — already runs a national Regional Blood Donor Program that collaborates directly with hospitals and blood banks for donation camps, screening, and distribution.
- **Academic MERN precedents** (BloodConnect, and a 2026 "Blood Bank Management System with AI Demand Forecasting" study) — both validate MERN as the right stack for this problem and add two ideas worth borrowing: **QR-code check-in** to confirm a donation actually happened, and a **simple moving-average forecast** for anticipating shortages instead of a flat low-stock threshold.

**Two takeaways that reshape this plan:**

1. **Even a registered, funded NGO doesn't attempt live hospital API integration.** No one in this market does. So Phase 4 below stops treating that as the goal and instead builds what actually works: hospitals as a *verified location directory*, manual document-based request verification, and partnerships with organizations that already have hospital relationships (PRCS, university community-service clubs) rather than hospital IT departments.
2. **The name "BloodSync" is already in active use** by a registered Pakistani NGO with a Play Store app. Fine for a university project, but worth knowing — don't publicly launch or promote this build under that exact name without checking, and it's worth a one-line acknowledgment in your report that a similarly named platform already exists (shows awareness of the space, which reads well to a grader).

---

## Phase Roadmap

| Phase | Focus | Week |
|---|---|---|
| 1 | Foundation: architecture, design system, shared auth | Week 1 (first half) |
| 2 | Donor module (+ donor recognition levels) | Week 1 (2nd half) – Week 2 |
| 3 | Seeker module (+ document-based request verification) | Week 2 |
| 4 | Hospital & Partner Network (practical model, real outreach) | Week 3 (first half) |
| 5 | Admin & Verification Module | Week 3 (2nd half) |
| 6 | Real-time notifications, engagement & lightweight analytics | Week 4 (first half) |
| 7 | QR donation check-in (stretch) | Week 4 (first half, parallel) |
| 8 | Integration, testing & deployment | Week 4 (second half) |

Hospital/partner outreach (Phase 4's real-world component) is emails and conversations, not code — it can and should start in **Week 1**, running in parallel with development, so you have real responses by the time you're building that phase.

---

## Phase 1 — Foundation: Architecture, Design System & Core Authentication

**Objective:** Shared schema and a single auth system all four roles plug into.

**Tools:** Figma, Mermaid/Draw.io (ERD), MongoDB Atlas, Node.js, Express.js, Mongoose, JWT, bcryptjs, Helmet, express-rate-limit, dotenv, Nodemailer (free SMTP) for email verification.

**Design system:** a Figma "Design System" page — emergency red for alerts, a trusted medical blue for primary actions, consistent typography and button/badge states. Auto Layout so components map cleanly to Tailwind later.

**Data model:** one `Users` collection with a `role` enum (donor / seeker / hospital / admin) plus role-specific optional fields. `Organizations`, `Inventory`, and `Requests` stay separate.

**Auth endpoints:** `POST /api/auth/register`, `POST /api/auth/verify-email`, `POST /api/auth/login`, plus `requireAuth` and `requireRole([...])` middleware.

**Deliverables:** ERD, Figma design system + wireframes for all four dashboards, Express scaffold with security middleware, User schema, auth routes + RBAC middleware.

---

## Phase 2 — Donor Module

**Objective:** Donor registration, profile, eligibility, availability, dashboard.

**Registration fields:** full name, age (≥ 18), gender (drives cooldown calculation), blood group, phone, email, password, city, last donation date (nullable).

**Eligibility engine (WHO-standard, gender-aware cooldown):**
- Male: 90-day cooldown · Female: 120-day cooldown
- `nextEligibleDate = lastDonationDate + cooldown`; immediately eligible if null
- Compute on read rather than storing a stale boolean — no cron job required for the MVP

```javascript
const COOLDOWN_DAYS = { male: 90, female: 120 };

function getEligibility(gender, lastDonationDate) {
  if (!lastDonationDate) return { eligible: true, nextEligibleDate: null };
  const cooldown = COOLDOWN_DAYS[gender] ?? 90;
  const nextEligibleDate = new Date(lastDonationDate);
  nextEligibleDate.setDate(nextEligibleDate.getDate() + cooldown);
  return { eligible: new Date() >= nextEligibleDate, nextEligibleDate };
}
```

**Availability vs. eligibility — keep separate.** A donor can be medically eligible but personally unavailable. Only donors who are both eligible and available surface in search or Code Red alerts.

**Donor recognition levels** (borrowed directly from the real BloodSync Pakistan model — a free, purely cosmetic engagement feature): count each *confirmed* donation (see Phase 7) and assign a tier — Spark (1+), Pulse (3+), Life Saver (7+), Guardian (12+), Anchor (20+). Shown as a badge on the donor's dashboard. Costs nothing but a field and a lookup table; noticeably increases perceived polish.

**Deliverables:** `GET/PUT /api/donors/me`, `PATCH /api/donors/me/availability`, eligibility utility function (unit-testable), donor dashboard UI with eligibility card and level badge.

---

## Phase 3 — Seeker Module

**Objective:** Registration/login, compatible-donor search, and a request flow that's actually verifiable — not just a trust-me text field.

**Registration fields:** name, phone, email, password, city.

**Blood-group compatibility matrix** (who a patient can safely receive from):

```javascript
const COMPATIBLE_DONORS = {
  'O-':  ['O-'],
  'O+':  ['O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['A+','A-','B+','B-','AB+','AB-','O+','O-'], // universal recipient
};
```

**Request flow — upgraded from "Patient ID text field" to document-based verification**, matching how the real platforms actually deter misuse: the seeker selects a verified hospital, uploads a photo of the hospital-issued blood request slip (and optionally a CNIC), and selects the needed blood group. This creates a `Requests` document with `status: 'pending_review'`. An admin (acting as the "foundation staff" role in Phase 5) reviews the uploaded documents before the request moves to `'approved'` and triggers donor notifications.

- Free image storage: **Cloudinary free tier** (25 GB storage/bandwidth) handles the uploads — a `documentUrl` field on the Requests schema is enough, no need to store binary blobs in MongoDB.
- This is a genuinely stronger scope boundary than the original "logged but unverifiable Patient ID" — it's the same trade-off real platforms make, and it gives your report an honest, defensible "verification without a hospital API" story.

**Anonymous routing:** donor sees only the hospital's contact/address; seeker sees only request status, never the donor's identity.

**Deliverables:** `GET /api/search`, `POST /api/requests` (with document upload), `GET /api/requests/mine`, compatibility matrix utility, seeker dashboard (search, results, request form with file upload, status tracker).

---

## Phase 4 — Hospital & Partner Network Module (Practical Model)

**Objective:** Get real hospitals and organizations actually involved — realistically, not aspirationally.

**Reframing what "hospital integration" means:** no hospital's IT department will give a student project API access to their internal systems in a month — and, per the landscape review, no comparable platform in this market has that either. So hospitals are modeled as a **verified location directory** your platform lists and routes people to, with an optional lightweight manual dashboard for staff who want to update stock themselves. That is a real, achievable form of collaboration.

### Two parallel tracks — both should start in Week 1

**Track A — Direct hospital contact (lower priority, harder sell).** Reach out to hospitals already referenced in your own project's demo data — PIMS Islamabad, Shifa International, hospitals in Rawalpindi — but ask for something small and realistic: permission to list them as a verified donation location, and willingness to have front-desk or blood-bank staff use a simple manual inventory dashboard. Do **not** lead with "API integration" — that's the ask that gets a meeting declined.

**Track B — Organizational partnership (higher priority, realistic in a month).** This is what actually worked for the real Blood Link Pakistan:
- Contact the **PRCS regional blood donor program** (Islamabad/Rawalpindi chapter) — they already collaborate with hospitals and blood banks nationally, so partnering with them gets you hospital-adjacent legitimacy without needing a single hospital's sign-off.
- Approach your **own university's community-service society** (the equivalent of NUST's or Air University's clubs) as your first verified partner organization. They can generate real test data, run a small pilot blood drive, and give you an authentic collaboration story for your report — achievable with zero hospital involvement at all.

**Document every outreach attempt** — who you contacted, what they said, the outcome — even a polite decline is legitimate material for a "Real-World Validation" section in your final report, and is more credible than an unverified claim of "hospital integration."

### What still gets built (regardless of outreach outcome)

- Hospital registration → `status: 'pending'` until admin approval
- **Manual inventory dashboard** (add/edit/delete: blood group, units, expiry) — the default and primary path
- A hashed API key + `POST /api/inventory/sync` endpoint — build and demo this with a **mock hospital simulation script** (as originally planned) so the technical capability exists and is testable, but label it explicitly in your report as a forward-looking capability rather than something a real hospital is using on day one. That's an honest, still-impressive engineering deliverable.
- **Code Red broadcast** with a MongoDB TTL index (auto-expires ~6 hours), gated behind a confirmation modal.

**Deliverables:** `POST /api/inventory`, `PUT/DELETE /api/inventory/:id`, `POST /api/inventory/sync` (API-key protected, demoed via mock script), `POST /api/broadcast`, hospital dashboard UI, an outreach log (who/what/outcome) for your report.

---

## Phase 5 — Admin & Verification Module

**Objective:** Platform oversight, playing the same "foundation staff" verification role the real platforms use.

- **Hospital verification queue:** approve (activates account + issues API key) or reject.
- **Request verification queue:** review each seeker's uploaded document before approving a request — this is where Phase 3's document upload actually gets used.
- **API key management:** view issued keys (masked), revoke instantly.
- **User/donor management:** search, list, block/unblock.
- **Analytics dashboard:** totals, units by blood group, low-stock list, most-requested group.

**Deliverables:** `GET /api/admin/hospitals/pending`, approve/reject routes, `GET /api/admin/requests/pending` + approve/reject, `POST /api/admin/hospitals/:id/revoke-key`, `GET/PATCH /api/admin/users`, `GET /api/admin/analytics`, admin dashboard UI (Recharts or Chart.js).

---

## Phase 6 — Real-Time Notifications, Engagement & Lightweight Analytics

**Objective:** Wire the alert pipeline and add low-cost intelligence on top of it.

- **Notification pipeline:** on an approved Request or Code Red, query donors matching `{ bloodGroup: compatible, eligible: true, available: true, city/near: hospital }`, then send a Web Push notification (service worker + `web-push`, self-generated VAPID keys — free) **and** write to an in-app notifications list as a guaranteed-delivery fallback.
- **Geocoding:** OpenStreetMap Nominatim (free, ~1 req/sec) — cache city coordinates on first lookup.
- **Lightweight demand forecasting (stretch, inspired by the AI-forecasting paper above, without any ML):** a simple 7-day moving average of unit consumption per blood group per hospital, flagged if the trend suggests stock will hit zero before the next expected donation cycle. This is a few lines of aggregation logic, not a model — but it lets you honestly claim "predictive" low-stock alerts instead of only a flat threshold.

**Deliverables:** notification pipeline, Web Push setup, Nominatim caching layer, moving-average forecast utility (stretch), admin dashboard forecast widget (stretch).

---

## Phase 7 — QR Donation Check-In (Stretch)

**Objective:** Close a real gap from the original Java version — `lastDonationDate` was purely self-reported with no confirmation, so the eligibility engine could be gamed.

- **MVP version:** when a donor completes a donation, hospital/admin staff manually mark the request as "donation completed" from their dashboard, which updates the donor's `lastDonationDate` and recalculates eligibility and their recognition level.
- **Stretch polish:** generate a QR code for the accepted request; staff scan it (any free QR scanner library, e.g. `html5-qrcode`) to confirm completion in one tap instead of a manual form — matches the real BloodConnect precedent above.

**Deliverables:** `PATCH /api/requests/:id/complete`, QR generation (`qrcode` npm package, free) and scan-to-confirm UI (stretch).

---

## Phase 8 — Integration, Testing & Deployment

**Objective:** Wire every module together, test thoroughly, ship.

- **Testing:** Postman collection covering every endpoint including failure paths (expired token, blocked user, invalid/revoked API key, unverified email, rejected document); Jest + Supertest unit tests for the eligibility engine and compatibility matrix; a manual test matrix across all four dashboards mirroring your Sprint 3 Black-Box/White-Box structure.
- **Deployment:** Backend → Render free tier (note the cold-start delay as a known limitation); Database → MongoDB Atlas free cluster; Frontend → Vercel; update CORS/env vars, verify via Postman, then deploy frontend.

**Deliverables:** live URL, Postman collection export, test report, deployment checklist.

---

## Suggested Division of Labor (2 people)

- **Backend & partnerships owner:** Phase 1 (auth/schema), Phase 4 (hospital logic *and* outreach — since Track B partnership conversations are non-technical, whoever owns this phase should be doing both the API work and the emails), Phase 5, Phase 8 backend half.
- **Frontend & UX owner:** Phase 1 (design system), Phase 2 (donor UI), Phase 3 (seeker UI + document upload), Phase 6/7 frontend half.

Adjust based on who's stronger where — the point of role-scoped phases is that either person can pick one up independently.

## What Changed From v1 and Why

| v1 | v2 | Why |
|---|---|---|
| Hospital API sync as the primary integration story | Manual dashboard + directory as primary; API sync kept as a labeled technical demo | Matches how every real platform in this market actually operates |
| "Patient ID" text field, unverifiable | Uploaded hospital slip + CNIC, reviewed by admin | Verifiable, matches real platforms' trust model |
| No donation confirmation loop | Manual/QR check-in updates `lastDonationDate` | Closes a real gap from your original Java version |
| Flat low-stock threshold only | Threshold + optional moving-average trend (stretch) | Cheap way to sound "predictive" without ML |
| No engagement mechanic | Donor recognition levels | Free, borrowed from a real platform, boosts perceived polish |
| No competitive/market context | Landscape review section | Shows the grader you did real research, not just internal iteration |
