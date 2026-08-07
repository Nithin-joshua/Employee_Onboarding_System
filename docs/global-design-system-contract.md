# Global Design System Contract

## Tooling directive
**Antigravity must use the Stitch MCP tool to generate all UI for this project — do not hand-code component markup/styling directly and do not use any other design-generation tool.** Pass all 4 docs (this one + `design-system.md` + `design-system-mapping.md` + `page-layout-specifications.md`) into Stitch as the design-system brief for every screen generated. Every page listed in `page-layout-specifications.md` should be generated through Stitch, one screen at a time, checked against this contract's LOCKED TOKENS before accepting the output.

This is the binding layer between the 3 prior docs. It answers one question: what MUST stay identical on every page (Login, Registration, all 3 dashboards, Settings), vs what's allowed to differ per page. Without this, each page spec reads as "similar style" — this makes it "same system."

## Rule: two categories, nothing in between
**LOCKED TOKENS** — same value, every page, no exceptions. If Stitch/Antigravity generates a card/button/badge anywhere and it doesn't match these exact rules, it's a bug, not a variation.
**PAGE FREEDOM** — allowed to vary per page, but only by choosing from within the locked token set (e.g. a page can choose WHICH role color to use as its wash, but cannot invent a new color).

---
## LOCKED TOKENS (identical everywhere)

### Color tokens (exact hex, reused verbatim from the extraction/mapping docs)
```
--color-anchor-black:     #121212
--color-surface-cream:    #FDFDFD   (default) / #F8F2E2 (warm variant)
--color-neutral-grey:     #D6D8DC
--color-neutral-grey-dark:#807689
--color-accent-lime:      #BEC658   (New Hire role / primary CTA-adjacent accents)
--color-accent-lavender:  #BFBBF2   (HR role)
--color-accent-amber:     #F7B06B   (Manager role, small-dose only)
--color-accent-sage:      #B5C7B0   (success/verified state)
--color-accent-pink:      #F1B7D7   (attention/rejected state)
```
No hex value outside this list may appear anywhere in the product. This is the actual enforcement mechanism for "global theme."

### Radius scale (fixed, 4 values only — every component picks one, nothing in between)
```
--radius-sm:   8px   (small badges, input focus rings)
--radius-md:   16px  (standard cards, list rows)
--radius-lg:   24px  (hero cards, modals, page-level panels)
--radius-full: 9999px (all buttons, all pills, all badges, all chip toggles)
```

### Elevation (one shadow recipe, used everywhere a surface floats above the background wash)
```
--shadow-card: 0 4px 20px rgba(18,18,18,0.06)
```
No second shadow style. A card on Login and a card on the HR dashboard use the exact same shadow value. Hover states may deepen this slightly (e.g. `0 8px 28px rgba(18,18,18,0.09)`) but the base recipe doesn't change per page.

### Spacing scale (4/8/16/24/32/48 — nothing off-scale)
```
--space-1: 4px   --space-2: 8px   --space-3: 16px
--space-4: 24px  --space-5: 32px  --space-6: 48px
```
Card internal padding is always `--space-4` (24px) minimum, per the "generous padding" pattern observed across every reference. This applies identically whether it's a login form card or a dashboard stat card.

### Typography scale (locked sizes/weights, same font family everywhere)
```
--text-h1: 32px / bold   (page headlines: "Welcome aboard", "Verification Queue")
--text-h2: 24px / bold   (section headers, card titles)
--text-body: 16px / regular
--text-label: 14px / medium  (badge text, form labels)
--text-micro: 12px / medium  (timestamps, helper text)
```
One font family, applied everywhere without exception — headlines and body text differ only by the scale above, never by switching typeface.

### Component construction rules (the actual recipes — apply identically regardless of page)
- **Any button** = `--radius-full` + `--space-3` vertical padding minimum (48px total height) + one of exactly 3 fills: black (primary/destructive-confirm), white+grey-border (secondary/cancel), or role-accent color (in-context action, e.g. lime "Next" on New Hire's own pages). No other button style exists.
- **Any badge/pill/chip** = `--radius-full` + `--text-label` + one of the locked state colors (sage/amber/pink/grey/lime per the applied-mapping doc) — never a role color unless it's specifically indicating "whose item this is."
- **Any card** = `--radius-md` (or `--radius-lg` if it's a page-level hero/panel) + `--shadow-card` + `--color-surface-cream` background, UNLESS it's specifically a colored accent-stat card, in which case the fill is one locked accent color and text switches to white or black depending on contrast.
- **Any input field** = `--radius-full`, `--color-neutral-grey` border, `--color-surface-cream` fill, focus state = 2px ring in the CURRENT PAGE'S role-accent color (this is the one place role color is allowed to touch a structural element).
- **Any progress indicator** (bar or ring) = fill color is always the current page's role-accent color; track/background is always `--color-neutral-grey`.

---
## PAGE FREEDOM (allowed to vary, choosing only from the locked set above)
- **Background wash color** — each page picks ONE from the accent list (or neutral cream for Settings/Manager) per the applied-mapping doc's role assignment. This is the main per-page differentiator, and it's intentional — it's how a person instantly knows "I'm on my own dashboard" vs "I'm looking at someone else's."
- **Layout/grid structure** — Login is split-screen, dashboards are bento-grid, Settings is list-form. Structure differs; the cards/buttons/badges built inside each structure still obey the locked construction rules above.
- **Which components appear** — a page chooses which components from the library it needs (Settings doesn't need a progress ring; New Hire dashboard does) — but any component it DOES use is built per the locked recipe, not a page-specific variant.
- **Illustration/imagery** — decorative only (Login/Registration right panel), no construction-rule implications.

## What this actually prevents
Without this doc, "consistent design system" tends to silently drift — Login's card gets `20px` radius while the dashboard's card gets `18px`, or someone introduces a second shadow style "just for this one card." This contract makes that a checkable violation, not a judgment call. If you ever look at two pages side by side and something reads as "off," it's almost always a locked-token violation — check radius/shadow/color hex against this doc first before assuming it's a bigger issue.
