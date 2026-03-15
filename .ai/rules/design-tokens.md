# Design Tokens

- All UI must use the Tailwind theme tokens generated from Figma in `src/styles/global.css` (the `@theme {}` block)
- Before writing any component, read that file and use only the defined `--color-*`, `--text-*`, `--font-*`, `--font-weight-*`, and `--shadow-*` tokens via their Tailwind utility classes (e.g. `text-purple`, `text-h2`, `font-h2`, `font-weight-h2`)
- Never hardcode colors, font sizes, or font weights
