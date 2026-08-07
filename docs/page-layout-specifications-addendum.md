# Page Layout Specifications — Addendum (Depth Pages)
Extends `page-layout-specifications.md`. Same LOCKED TOKENS from `global-design-system-contract.md` apply — nothing new introduced at the token level, only new page compositions.

**Backend note**: pages 1-2 require one small backend addition first — an `AuditLog` model (`{id, employeeId, fromStatus, toStatus, actorId, actorRole, timestamp, note?}`), written inside each existing state-transition function in Phase 1-4.5's services. This is additive, not a rewrite — do not touch existing transition logic beyond adding the log write.

---
## A. Audit Trail (`/employees/[id]/history`, linked from Employee Detail)
**Background wash**: Lavender (HR role color, since this is an HR-facing page).
**Layout**: Single-column vertical timeline inside a cream card (`--radius-lg`).
- Each entry: small circular dot (color = destination status's mapped state color, e.g. sage for VERIFIED, pink for REJECTED) connected by a thin vertical line — same visual grammar as the roadmap's dashed-connector pattern, adapted to a log instead of a forward path.
- Entry content: `[status] — by [actor name/role] — [timestamp]`, optional note text below in `--text-micro` grey.
- Filter/search bar at top (by status type or actor) — simple, no new component needed beyond the existing search input pattern.

## B. Compliance Deadline Dashboard (`/compliance`, HR nav item)
**Background wash**: Lavender (HR role).
**Layout**: Bento-grid, same pattern as HR Dashboard.
- **Top metric row**: 3 stat cards — "Forms Pending Signature", "Due Within 3 Days" (amber accent card), "Overdue" (pink accent card).
- **Table below**: employee name, form type (PF_FORM11/PF_FORM2/ESI_FORM1), deadline date, days remaining, status pill. Row background tints faint amber if <3 days remaining, faint pink if overdue — subtle, not full-color rows, staying inside the "small-dose accent" rule.
- **Row action**: "Send Reminder" button (outline style) — can be a stub/log-only action if email automation for this specific reminder isn't built; still demonstrates the UX intent.

## C. Milestone Tracker
**New Hire view** (`/onboarding/milestones`): background wash lime (New Hire role).
- Reuses the roadmap card+dashed-connector pattern from the main onboarding roadmap, but scoped to just the 4 post-hire milestones (DAY1/30/60/90), each expandable to show its checklist items with checkboxes.
**Manager/HR view** (`/employees/[id]/milestones`, or a cross-employee `/milestones` list for Manager): background wash amber (Manager) or lavender (HR) depending on who's viewing.
- Table/list: employee name, current milestone, due date, completion checkbox — "Mark Complete" button (role-accent filled pill) per the locked button recipe.

---
## Nav updates required
- HR sidebar: add "Compliance" and each employee detail page gets a "View History" link/tab.
- Manager sidebar: add "Milestones" if not already present.
- New Hire dashboard: add "Milestones" as a real nav item, not just a locked step card, once past ACTIVE status.
