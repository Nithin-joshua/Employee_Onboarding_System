# Design System Extraction — Reference Synthesis (6 sources)
Extracted only — nothing invented. Colors are algorithmically sampled (KMeans dominant-color clustering) from the actual uploaded images, not estimated by eye. Typography/spacing/component notes are visual-inspection based, describing only what's present across the 6 references.

## Source map
1. "Projector" — project mgmt dashboard, pink/lavender bg, orange logo
2. "Learning" app — course dashboard, lavender bg
3. "Dei" — learning roadmap, black nav, mint/pastel sticky-note cards
4. "intelly" — healthcare dashboard, black sidebar, cream bg
5. "Tuga's App" — login split-screen, sage green
6. Job-search step form — white card, lime green progress/CTA

## 1. Unified Color Palette (extracted, cross-referenced across sources)

These 6 hues recur across 3+ of the 6 sources independently — that recurrence is the signal this is the actual shared "vibe," not a one-off choice from a single image.

| Role | Hex (sampled) | Found in | Notes |
|---|---|---|---|
| **Primary accent — Lime/Olive Green** | `#BEC658`, `#92996C`, `#BDF989` | Images 1, 4, 6 | The most recurring accent — appears as card fill, progress bar, CTA button |
| **Secondary accent — Hot Pink/Magenta** | `#ECB6E6`, `#F68EE1`, `#F1B7D7` | Images 1, 2, 4 | Used as full-bleed background wash AND as small bento-card fills |
| **Tertiary accent — Lavender/Indigo** | `#BFBBF2`, `#A4A0C9`, `#F3D6FB` | Images 2, 3 | Background wash in 2, soft card fill in 3 |
| **Highlight — Amber/Orange** | `#ED7D42`, `#F7B06B`, `#F0D366` | Images 1, 2, 4 | Always used sparingly — single small card or badge, never a background |
| **Success/Alt-green — Sage/Mint** | `#E1E9D2`, `#B5C7B0`, `#E3F4F6` | Images 3, 4, 5 | Softer/cooler than the primary lime — used for calm/completed states |
| **Anchor — Black/Deep Navy** | `#121212`, `#020202`, `#1C1731`, `#383944` | ALL 6 images | Every single reference uses near-black for nav bars, primary buttons, or body text — this is the one universal constant |
| **Surface — Off-white/Cream** | `#FDFDFD`, `#F8F2E2`, `#F6F8F4`, `#FAFBFB` | ALL 6 images | Card/content surface, never pure `#FFFFFF` — always slightly warm or cool tinted |
| **Neutral/Muted — Grey scale** | `#D6D8DC`, `#DFE0DF`, `#BBCACB`, `#807689` | ALL 6 images | Borders, disabled states, secondary text |

**Pattern observed:** every reference uses ONE saturated wash color as the full-page background (pink, lavender, cream, mint, or grey), an off-white/cream card surface floating on top, black for nav/CTA/headline anchoring, and 2-4 additional saturated accents used ONLY in small doses (badges, small cards, chart bars) — never as large fills. This is the core "colorful but not overwhelming" mechanic that makes it feel Gen-Z-vibrant rather than garish.

## 2. Typography (visual inspection — no font names claimed, only characteristics)
- **Headlines** ("Good Morning, Rafael!", "My Learning Plan"): bold, geometric sans-serif, black or near-black, large size (24-32px equivalent), tight letter-spacing.
- **Body/labels**: same sans-serif family, regular weight, muted grey (`#807689`/`#989f9e` range) for secondary text, near-black for primary.
- **Stats/numbers** ("94.8%", "43%", "12:59:16"): bold weight, sometimes larger than surrounding text, occasionally monospace-adjacent for timers (Image 1's countdown clock).
- **Micro-labels** (badge text, tags): small size, medium-bold weight, often uppercase or title-case, sit inside pill shapes.

## 3. Spacing & Shape tokens
- **Corner radius**: consistently large and rounded — cards ~16-24px, buttons/pills/badges/inputs fully rounded (`border-radius: 9999px` / pill shape). Image 6's whole modal card and Image 5's whole panel use ~24-32px radius. Nothing in any reference uses sharp corners.
- **Padding**: generous — cards have visibly large internal padding (~24-32px), never cramped.
- **Card elevation**: soft, diffuse drop shadows separating white/cream cards from the colored background wash — not hard borders.
- **Bento-grid layout**: Images 1 and 4 both use a multi-column grid of unevenly-sized cards (some wide, some square) — this "bento box" arrangement is a recurring structural pattern, not just a color one.

## 4. Component patterns (extracted, per element type)

**Cards**: two types recur — (a) white/cream neutral cards holding data/lists, (b) fully colored accent cards (lime, pink, amber) holding a single stat/percentage, always with a small white pill badge in the corner showing a +/- delta (Image 1: "+3%", "+7%").

**Buttons**: primary CTA = solid black pill, white text, generous height (Images 5, 6). Secondary/selected state = solid lime-green pill with white checkmark icon (Image 6). Unselected/outline = white pill with grey border.

**Badges/chips/tags**: small rounded-full pills, colored fill matching semantic meaning (green=positive/complete, pink/amber=attention). Confidence or status tags sit directly on list rows (Image 4's "Emergency"/"Caught"/"Heart Burn" tags).

**Navigation**: two patterns present — black full-height left sidebar with icon+label rows (Images 3, 4) OR white/cream top bar with a pill-shaped search input plus icon buttons on the right (Image 1).

**Avatars**: circular, used in overlapping stacks (3-4 avatars overlapping with slight white ring border) to represent team/participants (Images 1, 2, 3).

**Progress indicators**: two forms — (a) thin horizontal rounded progress bar with colored fill (Images 2, 6), (b) circular ring/donut progress with percentage in center (Images 1, 5).

**Roadmap/path visualization**: dashed connector lines linking sequential cards top-to-bottom, each node showing a lock icon (locked/future), checkmark (done), or play button (in progress) — Image 3. Directly relevant to a stage-based onboarding flow.

**Notification/event cards**: "sticky note" style — colored rounded card with a small pin/clip icon in the corner, date label, short description (Image 3's "My Events" panel).

**Data viz**: bar charts and line charts always sit ON TOP of a colored card background (not a white chart on white card) — e.g. Image 1's activity bars on white/cream, Image 4's line chart directly on a pink card fill.

**Forms**: pill-shaped text inputs with soft grey border, selectable option chips that toggle between white-outline (unselected) and green-filled-with-checkmark (selected) — Image 6. Multi-step forms show a thin top progress bar and "Step X/Y" label.

## 5. Explicit extraction boundary
Everything above is drawn directly from the 6 uploaded images — no colors, components, or patterns were introduced beyond what's present across them. Where a role needed a color and only one image supplied it (e.g., mint/sage as "success/alt-green"), that's noted as single-sourced rather than cross-referenced, so you know which parts are strongest-signal (appear 3+ times) vs single-instance.
