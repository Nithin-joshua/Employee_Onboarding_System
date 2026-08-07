# Page Layout Specifications
Applies the extracted component library (`design-system-extraction.md`) + role/state color mapping (`design-system-applied-mapping.md`) to every actual page in the system. Layout structure follows the Rippling/Gusto/Deel wireframe research already validated earlier in this build.

---
## 1. Login Page
**Layout**: Split-screen, per Image 5's "Tuga's App" pattern — left 45% white/cream form panel, right 55% colored illustration panel (use New-Hire's page background wash as the illustration-panel color for candidates; a neutral cream for HR/Manager since they're not first-time visitors).
**Left panel**: "Welcome back" headline (bold black, large), email + password pill inputs (soft grey border, rounded-full), black solid CTA pill "Login" (full width, 48px height per Fitts's Law note), "Forgot Password?" text link below, small text link "Not a member? Register" at the bottom linking to Registration.
**Right panel**: simple line-art illustration + one floating stat/progress card (small, rounded, soft shadow) — decorative only, reinforces the product's data/progress theme before login.
**No SSO section** — flagged earlier as out of scope (no real identity provider to federate with).

---
## 2. Registration Page + OTP
**Layout**: Same 45/55 split-screen as Login, TRUE mirror — illustration panel on the LEFT, form card on the RIGHT (opposite of Login's arrangement, so the two screens are visually distinguishable at a glance). Form content chunked into visible sections per Miller's Law, not one long list.
**Fields** (grouped in 2 visual sections inside the card): Section A — Name, Email, Phone; Section B — Invitation Code, Password (with strength meter bar using the lime→amber→pink gradient, weak-to-strong, staying inside the extracted palette). Pill inputs, rounded-full, consistent with extraction.
**Right panel**: New-Hire lime/pink wash background with a "what happens next" 3-step mini roadmap (uses the dashed-connector roadmap pattern from Image 3) — Register → Upload Docs → Get Hired — sets expectation before they even submit.
**OTP screen** (replaces the form panel after submit, same split-screen frame stays): 6 individual boxed inputs, auto-advance/auto-paste per the earlier research spec, countdown timer text below switching to a lime-colored "Resend OTP" link on expiry. Confirm button = black pill CTA.

---
## 3. New Hire Dashboard (role color: Lime/Olive `#BEC658`)
**Top nav**: white/cream bar, logo left, pill search (optional, low priority), notification bell + avatar right — Image 1 pattern.
**Hero section**: "Welcome aboard, [Name]!" headline + circular progress ring (Image 1/5 pattern) showing overall completion %, lime-filled.
**Roadmap/stepper**: horizontal step cards (Personal → Documents → Compliance Signing → Milestones), each in COMPLETED (lime fill + checkmark) / ACTIVE (white card, lime border) / LOCKED (grey, padlock icon) state — direct application of Image 3's roadmap pattern + Image 6's step-form pattern.
**Document upload section** (only visible when on that step): dashed-border dropzone (solid lime border on drag-hover), file list below each showing a small OCR-confidence badge per the confidence-badge mapping (sage/amber/pink) once processed.
**Compliance signing section**: list of pending forms (PF_FORM11 etc.) as cards, tertiary-lavender "pending" pill until signed, sage "signed" pill after — canvas/typed signature capture inline.
**Milestone section** (post-hire): 30/60/90 day cards laid out like Image 3's roadmap nodes, checklist items inside each, connector line showing progression.
**Background wash**: soft lime-tinted white or pale pink (per applied-mapping's New-Hire wash rule).

---
## 4. HR Dashboard (role color: Lavender/Indigo `#BFBBF2`)
**Top nav**: same white/cream bar pattern, "Verification Queue (N)" badge count in the nav — Image from the earlier Rippling-style research doc.
**Metric row**: 3 bento cards (Pending Reviews count, OCR extraction success rate, Avg verification time) — colored accent cards per Image 1's stat-card pattern, small delta badge in corner where relevant.
**Queue table**: candidate rows — name, submitted time, confidence status pill (sage/amber/pink per mapping), "Review" button (black pill, small).
**Detail/review view** (opens on row click): split two-column — left = document canvas viewer (zoom/rotate controls, per earlier research), right = **curated** extracted-field list only (per the Phase 4.5 curation decision — name/DOB/ID number, not gender/address) each with a confidence badge and click-to-edit (edits get an "HR Corrected" small tag).
**Actions row**: "Request Re-upload" (outline/grey button, opens reason modal) + "Approve & Forward to Manager" (black pill, primary) — this triggers the MANAGER_REVIEW transition.
**Background wash**: pale lavender.

---
## 5. Manager Dashboard (role color: Amber/Orange `#F7B06B`)
**Top nav**: same pattern, "Onboarding Queue (N)" badge.
**Activation card** (per candidate in MANAGER_REVIEW): header with name, role, department, confirmed start date, "HR Compliance Status: VERIFIED" badge (sage). Compliance summary as a collapsed checklist (checkmarks, lime). No buddy-assignment or software-license sections — cut earlier as scope creep; keep this card to compliance summary + the two action buttons only.
**Actions**: "Request Info" (outline button, sends back to HR/UNDER_REVIEW with reason) + "Approve & Complete Hire" (black pill, primary — triggers hire-confirmation email + COMPLIANCE_PROCESSING transition).
**Background wash**: very light neutral/cream — per the applied-mapping note, amber as a full-page wash would break the "small-dose only" rule observed in every reference image, so Manager's dashboard stays mostly neutral with amber reserved for small badges/accents only.

---
## 6. Settings Page (shared shell, content varies by role)
**Layout**: left sub-nav within the page (Profile / Notifications / [role-specific section]), content panel right — simple list-form pattern, no bento cards needed here, this page is utility not delight.
**Profile section** (all roles): name, email, phone — editable pill inputs, black "Save" pill button.
**Notifications section** (all roles): toggle switches (reuse Image 6's chip-toggle visual language adapted to on/off switches) for email notification preferences.
**HR-only section — Invitation Codes**: table of generated codes (job title, department, status: unused/used), "+ Generate Code" black pill button opens a modal form (job title, department, manager dropdown, salary, joining date) — this is where the Phase 4.5 `InvitationCode` creation UI lives.
**No role-color wash on Settings** — keep this page neutral cream/white regardless of who's viewing, since it's a utility page, not a "whose space is this" page.

---
## Cross-page consistency rules
- Every primary destructive/final action (Approve, Complete Hire, Submit) = black pill button, per the extraction's universal-black-anchor pattern.
- Every "back/cancel/secondary" action = white pill with grey border outline.
- Confidence and status badges NEVER change color based on which role is viewing — they're data-state colors, consistent everywhere per the applied-mapping doc.
- Role wash colors apply ONLY to that role's own dashboard background — shared pages (Settings, and the Employee Detail view HR/Manager both may open) stay neutral.
