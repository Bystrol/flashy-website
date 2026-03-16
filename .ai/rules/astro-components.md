# Astro Component Architecture

- Use `.astro` components for static content and layout; use React only when interactivity is required
- Use nanostores for shared state between islands — no prop drilling
- Use View Transitions API for page navigation
- Prefer `client:visible` for hydration; use `client:idle`, `client:media`, `client:load`, or `client:only` when a specific reason demands it
- Never use `set:html` — it bypasses Astro's XSS escaping. Use static markup or proper component composition instead.
