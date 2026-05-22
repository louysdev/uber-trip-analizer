---
name: Trip Insight Analytics
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-mono:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
spacing:
  unit: 8px
  container-padding-desktop: 40px
  container-padding-mobile: 16px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system for this analytics platform is rooted in a high-contrast, editorial aesthetic that prioritizes clarity, data density, and professional utility. It draws direct inspiration from modern transportation and logistics interfaces, emphasizing a "utility-first" philosophy where the user's data is the protagonist.

The visual style is **Corporate / Modern** with a lean toward **Minimalism**. It utilizes expansive white space not just for aesthetics, but as a functional tool to separate complex data sets. The emotional response should be one of efficiency, reliability, and precision. High-contrast black-on-white foundations are punctuated by a specific secondary palette used for categorical differentiation (product tiers) rather than mere decoration.

## Colors

The color strategy is strictly functional. The primary core is monochromatic—utilizing absolute black for text and primary actions to ensure maximum legibility and brand authority against white and soft gray surfaces.

Semantic accents are reserved for categorical data:
- **Moto (Green):** Represents growth, successful completions, and two-wheeled mobility.
- **Wait & Save (Purple):** Identifies budget-conscious choices and scheduled optimizations.
- **UberX (Orange):** Highlights standard tier analytics and mid-range performance.
- **Canceled (Red):** Flags churn, friction points, and lost revenue.

Backgrounds use `#FFFFFF` for the main content areas to maintain an editorial feel, while `#F6F6F6` provides subtle depth for sidebars and secondary containers.

## Typography

The typography system uses **Plus Jakarta Sans** to bridge the gap between friendly approachability and modern technicality. The scale is designed for an "Editorial Data" look: large, bold headlines for high-level insights and tight, structured labels for dense information.

- **Headlines:** Use tight letter-spacing and bold weights to create a sense of urgency and importance.
- **Body:** Set with generous line heights to ensure readability during long analysis sessions.
- **Data Mono:** While the system uses Plus Jakarta Sans for most UI, a monospace fallback is recommended for tabular numeric data to ensure perfect vertical alignment in trip lists and cost breakdowns.

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy for dashboard views to maintain control over data visualization layouts, transitioning to a **Fluid Grid** for mobile views.

- **Desktop:** A 12-column grid with a maximum container width of 1440px. Gutters are fixed at 24px to ensure distinct separation between data widgets.
- **Mobile:** A 4-column fluid grid.
- **Spacing Rhythm:** Based on an 8px base unit. Vertical stacks should strictly follow 8/16/32/64px increments to maintain a structured, systematic feel. Use large top margins (64px+) for major section headers to mimic a premium newspaper layout.

## Elevation & Depth

To maintain the high-contrast editorial look, depth is communicated through **Tonal Layers** and **Low-contrast Outlines** rather than heavy shadows.

- **Surfaces:** The primary workspace is `#FFFFFF`. Secondary panels or "wells" use `#F6F6F6`.
- **Borders:** Instead of shadows, use 1px solid borders in `#EEEEEE` to define card boundaries and table rows. This reinforces the "flat and precise" aesthetic.
- **Active State:** Use a 2px solid black border to indicate focus or selection, providing an unmistakable visual cue that doesn't rely on blur or glow effects.

## Shapes

The shape language is **Sharp (0px)**. To align with a professional, data-driven editorial style, we intentionally avoid rounded corners on primary containers, buttons, and input fields. 

- **Hard Edges:** All buttons, cards, and input fields must have 0px border-radius. This creates a architectural, structured look that feels authoritative.
- **Exceptions:** Small icons or status "dots" may be circular to provide a soft contrast to the rigid grid, but all structural UI elements remain rectangular.

## Components

### Buttons
Primary buttons are solid `#000000` with `#FFFFFF` text, sharp corners, and no gradient. Secondary buttons use a 1px `#000000` border with no fill.

### Chips / Status Badges
Used to categorize ride types. They should use a light tint of the category color (e.g., 10% opacity) with a solid 1px border of the full-strength accent color. Text inside chips should be `label-sm` in the dark version of that accent color.

### Input Fields
Inputs are defined by a 1px `#EEEEEE` bottom-border only in their resting state. On focus, the border becomes 2px solid `#000000`. Labels sit above the input in `label-md` weight.

### Cards & Data Widgets
Cards are containers with no background (transparent) and a 1px `#EEEEEE` top-border, creating a "list-based" dashboard look. Content within cards should follow the 8px spacing unit for internal padding.

### Lists & Tables
Rows should have a minimum height of 56px. Use `data-mono` for all numeric values. Hover states for table rows should use a `#F6F6F6` background fill to provide a subtle "tracking" guide for the user's eyes.