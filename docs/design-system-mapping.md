# Design System — Applied Mapping (role colors, states)
This is an APPLICATION of the extracted palette from `design-system.md`, not new extraction. Every color used below is pulled directly from that doc's palette — nothing new introduced.

## Role-accent mapping (who's looking)
| Role | Color | Hex | Reasoning |
|---|---|---|---|
| **HR** | Lavender/Indigo (tertiary accent) | `#BFBBF2` / `#A4A0C9` | HR is the "review/oversight" role — the cooler, more administrative-feeling accent fits, and it's distinct from Manager/New-Hire so no clash on shared views |
| **Manager** | Amber/Orange (highlight) | `#F7B06B` / `#ED7D42` | Used sparingly in the source images (small cards/badges only) — fits Manager's role as a lower-frequency, high-importance touchpoint (final approval) rather than a constantly-active surface |
| **New Hire** | Primary Lime/Olive Green | `#BEC658` / `#BDF989` | The most-recurring, most energetic accent — appropriate for the person actually experiencing "onboarding," matches the Zeigarnik-effect progress-bar/CTA color pattern already extracted (Image 6's lime "Next" button) |

Applied consistently: nav highlight, active-tab underline, primary button per role's own dashboard, avatar ring color.

## Confidence badges (OCR data reliability — separate axis from role color, do not merge)
| Confidence | Color | Hex | Source |
|---|---|---|---|
| High (≥95%) | Success/Alt-green (sage/mint) | `#B5C7B0` / `#E1E9D2` | Distinct from New-Hire's lime so it never reads as "whose page is this" — reads purely as "this field is trustworthy" |
| Medium (70-94%) | Highlight amber | `#F0D366` | Same amber family as Manager's role color but used as a small badge fill, not a large surface — consistent with how the source images always keep amber small-dose |
| Low (<70%) / mismatch | closest available warm accent: Hot Pink/Magenta | `#F1B7D7` (soft) or `#ECB6E6` | No true red exists in the extracted palette — using the most saturated warm accent as "needs attention" stays within the extracted set rather than introducing an off-palette red. Flagging this explicitly: if a harder "error" signal is needed, that's the one place you may want to deliberately introduce a red, since none of the 6 references contain one |

## Document/employee status pills
| Status | Color | Hex |
|---|---|---|
| PENDING / not started | Neutral grey | `#D6D8DC` |
| IN PROGRESS / submitted | Tertiary lavender | `#BFBBF2` |
| VERIFIED / approved | Success sage | `#B5C7B0` |
| REJECTED / needs action | Soft pink | `#F1B7D7` |
| COMPLETE | Primary lime, filled with black checkmark icon | `#BDF989` |

## Structural anchors (unchanged across all roles/states)
- Nav bar / primary buttons: Black `#121212` — universal constant per the extraction, do not vary this by role.
- Card surfaces: Off-white/cream `#FDFDFD` / `#F8F2E2` — same rule, keep neutral regardless of role viewing it.
- Page background wash: pick ONE per role's dashboard (not mixed) — HR gets a lavender wash, Manager gets a very light cream/neutral wash (since amber as a full background would break the "small-dose only" pattern observed in every source image), New Hire gets the lime-tinted-white or soft pink wash (Image 1's pattern).

## Explicit boundary
The role/confidence/status mappings above are a design decision using only extracted colors — they are not something present in the 6 reference images (none of those images are HR/onboarding tools). Treat this file as "how we chose to apply the found palette," separate from the prior file's "what we found."
