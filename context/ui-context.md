# UI & Video Rendering Context

## Theme

The visual identity of ShortsMaker MCP centers on high-impact, mobile-first vertical short video aesthetics (TikTok, Instagram Reels, YouTube Shorts). High-contrast dark backgrounds, vibrant saturated highlight colors (electric yellow, neon green, cyan, magenta), and punchy visual overlays maximize viewer watch time and engagement.

---

## Colors

ASS subtitle colors and visual accents adhere to this high-contrast palette:

| Role | Name | ASS Hex Format (`&H[A][B][G][R]`) | Standard Hex |
| :--- | :--- | :--- | :--- |
| **Primary Text** | Pure White | `&H00FFFFFF` | `#FFFFFF` |
| **Accent Yellow** | Electric Yellow | `&H0000FFFF` | `#FFFF00` |
| **Accent Green** | Cyberpunk Green | `&H0000FF00` | `#00FF00` |
| **Accent Cyan** | Neon Cyan | `&H00FFFF00` | `#00FFFF` |
| **Accent Magenta** | Neon Magenta | `&H00FF00FF` | `#FF00FF` |
| **Outline / Border** | Pitch Black | `&H00000000` | `#000000` |
| **Pill Background** | Deep Translucent Black | `&H80000000` | `#000000` (80% alpha) |

---

## Typography

| Role | Font Family | Size | Weight | Case | Variable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Viral Hook** | `Impact` (fallback: `Arial Black`) | `72px - 82px` | `900` | ALL CAPS | `--font-hook` |
| **Active Subtitle** | `Impact` / `Montserrat ExtraBold` | `68px - 76px` | `900` | ALL CAPS | `--font-subtitle` |
| **Secondary Clean** | `Arial Black` | `54px - 62px` | `800` | Title Case | `--font-clean` |

---

## Border Radius

Pill badges and bounding card overlays rendered in ASS or canvas graphics use specific border radii for smooth visual weighting:

| Context | Radius / BorderStyle | Description |
| :--- | :--- | :--- |
| **Inline Subtitle Badge** | `BorderStyle=3` (Outline 4px) | Tight pill box wrapping individual active words |
| **Header Curiosity Card** | `rounded-2xl` (16px) | Rounded top curiosity banner hook |
| **Reaction Callout Box** | `rounded-xl` (12px) | Compact pop-up badges and emoji container |

---

## Layout Patterns

ShortsMaker MCP structures the 1080x1920 9:16 vertical canvas into four distinct vertical zones:

1. **Top Zone (`0px - 360px`)**: Top curiosity hook banner ("Wait till the end...", headline text, progress bar).
2. **Center Action Zone (`360px - 1240px`)**: Main video canvas centered on speaker's face via MediaPipe tracking (`crop=w=607:h=1080`).
3. **Subtitle Safe Zone (`1240px - 1480px`)**: Kinetic captions positioned above platform UI (`MarginV=680px`, `MarginL=80px`, `MarginR=80px`).
4. **Platform UI Safe Zone (`1480px - 1920px`)**: Bottom margin reserved for platform interface (username, caption, sound title, interactive like/share sidebar). No critical text is placed in this zone.
