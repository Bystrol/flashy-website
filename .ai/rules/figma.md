# Figma MCP Implementation Rule

Use this rule for **any UI work** driven by Figma links or requiring design-system consistency.

## Required Figma MCP Flow (DO NOT SKIP)

1. **Run `get_design_context` first** for the _exact node(s)/variant(s)_ being implemented.
2. If the response is **too large/truncated**:
   - Run `get_metadata` to get a high-level node map
   - Re-run `get_design_context` for **only the required node(s)**
3. **Run `get_screenshot`** for the same node variant for visual validation.
4. **Only after** you have both `get_design_context` + `get_screenshot`:
   - Download any required assets (SVG/images) via the MCP assets endpoint
   - Start implementation
5. Implement with repo conventions + design tokens.
6. **Validate 1:1** against the Figma screenshot (layout, spacing, typography, behavior) before marking complete.

## Link-based prompting (how to pass Figma)

- The server is **link-based**: provide the **Figma frame/layer URL** pointing to the **exact node/variant**.
- The client extracts the node ID from the link; it **cannot browse** the URL. Ensure the link is correct.

---

# Implementation Rules (Figma → Repo)

## Treat MCP Output Correctly

- The MCP output (often **React + Tailwind**) is a **representation of design/behavior**, not the final code style.
- Translate it into this repo's conventions:
  - **Astro components** (`.astro`) for static content; **React** (`.tsx`) only for interactivity
  - `client:visible` hydration by default; `client:load` only for above-the-fold critical interactivity
  - Design tokens from `src/styles/global.css`
  - Import aliases: `@assets/*`, `@components/*`, `@layouts/*`, etc.

## Reuse Existing Components

- Check `src/components/` for existing section components before creating new ones.
- Look for reusable patterns already in the codebase (badges, cards, gradients).
- Only create new components after confirming nothing existing can be reused or extended.

---

# Tokens, Color, Typography

## Color System (STRICT)

1. **Never** use arbitrary color values (no hex, no `text-[#...]`, no random Tailwind colors).
2. **Always** use CSS variables from `src/styles/global.css` `@theme {}` block.
3. Map Figma tokens to CSS vars, e.g.:
   - `Purple` → `--color-purple` → `text-purple`
   - `White/White 80` → `--color-white-white-80` → `text-white-white-80`

## Typography

- Source of truth: `@theme {}` block in `src/styles/global.css` (generated from Figma).
- Use token-based utility classes:
  - Font size: `text-h1`, `text-body`, `text-tagline`, `text-caption`, etc.
  - Font weight: `font-weight-h1`, `font-weight-body`, `font-weight-tagline`, etc.
  - Line height: `leading-[--text-h1--line-height]`
  - Letter spacing: `tracking-[--text-h1--letter-spacing]`
- **Never** hardcode font sizes or weights — always use the generated tokens.

## Spacing & Layout

- Use Tailwind's spacing scale consistently.
- If the Figma design uses a value not in the scale, use an arbitrary value `[...]` sparingly.
- Prefer tokens when Figma spacing conflicts with the scale.

## Responsive Design

- Maintain hierarchy and spacing at breakpoints.
- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`, `xl:`) — avoid one-off breakpoints.

---

# Asset Handling (MCP)

- Use the Figma MCP **assets endpoint** for images/SVGs.
- If the server returns a **localhost source**, use it **directly**.
- Save assets to `src/assets/` and import via `@assets/*` alias.
- Import pattern in `.astro`:
  ```astro
  ---
  import icon from "@assets/icon.svg";
  ---
  <img src={icon.src} alt="" />
  ```
- **Do not** add/import new icon packages.
- **Do not** use placeholders if MCP provides an asset source.

---

# Validation Checklist (must pass)

- Visual parity with `get_screenshot`:
  - spacing, typography, colors, borders/radius, shadows
- Behavior parity:
  - hover/focus/active states
  - keyboard navigation
  - scroll behavior
- Tokens compliance:
  - no arbitrary colors
  - typography tokens used (not hardcoded values)
  - spacing system used
- Component architecture:
  - `.astro` for static content, `.tsx` only for interactivity
  - `client:visible` hydration used appropriately
  - never use `set:html`

---

# Key Files

- `src/styles/global.css` — Tailwind entry point + `@theme {}` generated design tokens
- `src/components/*.astro` — Astro section components
- `src/components/*.tsx` — React island components (interactivity only)
- `src/assets/` — Images and SVGs (imported via `@assets/*`)
- `scripts/generate-tailwind-config.ts` — Figma → Tailwind token syncer
- `.ai/rules/astro-components.md` — Astro component architecture rules
- `.ai/rules/design-tokens.md` — Design token usage rules
