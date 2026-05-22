---
name: Midnight Velocity
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bdcab9'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#879484'
  outline-variant: '#3e4a3c'
  surface-tint: '#66df75'
  primary: '#66df75'
  on-primary: '#00390f'
  primary-container: '#28a745'
  on-primary-container: '#00330d'
  inverse-primary: '#006e25'
  secondary: '#d3bbff'
  on-secondary: '#3f008d'
  secondary-container: '#5929ab'
  on-secondary-container: '#c7aaff'
  tertiary: '#ffb68a'
  on-tertiary: '#522300'
  tertiary-container: '#e77000'
  on-tertiary-container: '#491f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#83fc8e'
  primary-fixed-dim: '#66df75'
  on-primary-fixed: '#002106'
  on-primary-fixed-variant: '#00531a'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#250059'
  on-secondary-fixed-variant: '#5726a8'
  tertiary-fixed: '#ffdbc8'
  tertiary-fixed-dim: '#ffb68a'
  on-tertiary-fixed: '#321300'
  on-tertiary-fixed-variant: '#743500'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  stats-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is a high-performance, dark-mode-first framework optimized for data-dense trip analytics and low-light environments. The aesthetic sits at the intersection of **Corporate Modern** and **Minimalism**, stripping away non-essential decorative elements to focus entirely on information density and visual hierarchy.

The brand personality is precise, urgent, and authoritative. It targets power users and logistics analysts who require clarity without eye strain. By utilizing an OLED-ready deep black foundation, the system maximizes contrast for vibrant functional accents, ensuring that critical trip statuses and vehicle types are immediately identifiable at a glance.

## Colors
The palette is built on a "True Black" foundation to provide infinite contrast and battery efficiency on mobile OLED displays.

- **Backgrounds:** The primary canvas is `#000000`. Secondary surfaces use `#121212` to create subtle depth.
- **Accents (Functional):**
    - **Moto (Green):** `#28a745` for growth, active trips, and movement.
    - **Wait & Save (Purple):** `#6f42c1` for secondary options and scheduled items.
    - **UberX (Orange):** `#fd7e14` for standard active states and warnings.
    - **Cancelado (Red):** `#dc3545` for alerts, errors, and terminal negative states.
- **Typography:** Primary text defaults to high-contrast white (`#FFFFFF`) with secondary information in a muted gray (`#9CA3AF`).

## Typography
This design system utilizes **Plus Jakarta Sans** for its modern, geometric clarity and excellent legibility in dark environments. 

Large-scale statistical displays use tight letter-spacing and heavy weights to emphasize data velocity. Headlines are kept concise with slightly negative letter-spacing to maintain a sophisticated, technical feel. For data-heavy tables, the `body-sm` role ensures high information density without sacrificing readability.

## Layout & Spacing
The system follows a strict **4px baseline grid** to ensure mathematical precision across all components.

- **Desktop:** A 12-column fluid grid with 24px gutters. Dashboard widgets typically span 3, 4, or 6 columns.
- **Mobile:** A single-column layout with 16px side margins.
- **Logic:** Content is grouped using "Stack" spacing. Related items use `stack-sm` (8px), while distinct sections use `stack-lg` (32px). Lists and repetitive data entries use a 1px divider or `stack-sm` to maximize vertical density.

## Elevation & Depth
In a pure black environment, traditional soft shadows are ineffective. Instead, this design system uses **Tonal Layering** and **Low-Contrast Outlines**:

1.  **Base Layer:** `#000000` (Background).
2.  **Surface Layer:** `#121212` (Cards and containers).
3.  **Overlay Layer:** `#1E1E1E` (Modals and dropdowns).
4.  **Stroke:** All elevated elements receive a 1px hairline border of `rgba(255, 255, 255, 0.1)` to define their edges against the black void.

Depth is communicated through brightness: the higher an object is in the stack, the lighter its surface hex value becomes.

## Shapes
The shape language is **Soft** but disciplined. A universal corner radius of `4px` (0.25rem) is applied to buttons, input fields, and small cards to maintain a professional, technical edge.

Larger dashboard containers may scale to `8px` (`rounded-lg`), but the system avoids fully rounded or pill-shaped elements to maintain its high-performance, analytical character. Circles are reserved strictly for user avatars and status indicators.

## Components
- **Buttons:** Primary buttons use high-saturation accent colors (Moto Green or Wait & Save Purple) with black text for maximum legibility. Secondary buttons use the hairline white outline.
- **Cards:** Background `#121212` with no shadow. Use a 1px top-border in an accent color to categorize the card by trip type (e.g., an Orange top-border for UberX analytics).
- **Input Fields:** Filled style using `#121212` background and a bottom-border that glows with the primary accent color on focus.
- **Chips/Badges:** Small, high-contrast labels. For "Cancelado," use a `#dc3545` background with white text. For inactive states, use a semi-transparent gray.
- **Lists:** Clean rows with `#1E1E1E` hover states. Use "Moto Green" typography for positive deltas (price drop, time saved) and "Cancelado Red" for negative deltas.
- **Status Indicators:** Use 8px solid circles. A pulsating animation is permitted for "Active" or "In-Progress" trips to denote real-time data velocity.