/**
 * Generates Tailwind v4 CSS theme variables from Figma published styles.
 *
 * Usage:
 *   npx tsx scripts/generate-tailwind-config.ts
 *
 * Requires in .env:
 *   FIGMA_FILE_KEY=<your-figma-file-key>
 *   FIGMA_ACCESS_TOKEN=<your-figma-personal-access-token>
 *
 * What gets mapped to @theme:
 *   FILL  styles  → --color-*
 *   TEXT  styles  → --font-*, --text-* (+ --line-height, --letter-spacing variants)
 *   EFFECT styles → --shadow-*, --blur-*
 *   GRID  styles  → skipped (no Tailwind equivalent)
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// .env loader
// ---------------------------------------------------------------------------

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(resolve(ROOT, ".env"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      env[key] = value;
    }
  } catch {
    // Fall back to process.env only
  }
  return env;
}

// ---------------------------------------------------------------------------
// Figma API types
// ---------------------------------------------------------------------------

interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
}

interface FigmaTypeStyle {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  italic?: boolean;
  lineHeightPx?: number;
  lineHeightUnit?: "PIXELS" | "FONT_SIZE_%" | "INTRINSIC_%";
  letterSpacing?: number;
}

interface FigmaEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}

interface FigmaNode {
  id: string;
  type: string;
  fills?: FigmaPaint[];
  style?: FigmaTypeStyle;
  effects?: FigmaEffect[];
}

interface FigmaStyleMeta {
  key: string;
  node_id: string;
  style_type: "FILL" | "TEXT" | "EFFECT" | "GRID";
  name: string;
  description: string;
}

interface FigmaStylesResponse {
  meta: { styles: FigmaStyleMeta[] };
}

interface FigmaNodesResponse {
  nodes: Record<string, { document: FigmaNode } | null>;
}

// ---------------------------------------------------------------------------
// Figma API helpers
// ---------------------------------------------------------------------------

async function figmaGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { "X-Figma-Token": token },
  });
  if (!res.ok) {
    throw new Error(
      `Figma API error ${res.status} for ${path}: ${await res.text()}`,
    );
  }
  return res.json() as Promise<T>;
}

async function fetchStyles(
  fileKey: string,
  token: string,
): Promise<FigmaStyleMeta[]> {
  const data = await figmaGet<FigmaStylesResponse>(
    `/files/${fileKey}/styles`,
    token,
  );
  return data.meta.styles;
}

async function fetchNodes(
  fileKey: string,
  token: string,
  nodeIds: string[],
): Promise<Record<string, FigmaNode | null>> {
  // Batch into groups of 100 to stay within URL length limits
  const batches = chunk(nodeIds, 100);
  const result: Record<string, FigmaNode | null> = {};

  for (const batch of batches) {
    const ids = batch.map(encodeURIComponent).join(",");
    const data = await figmaGet<FigmaNodesResponse>(
      `/files/${fileKey}/nodes?ids=${ids}`,
      token,
    );
    for (const [id, wrapper] of Object.entries(data.nodes)) {
      result[id] = wrapper?.document ?? null;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** "Primary / 500" → "primary-500" */
function toVarName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*[/\\]\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function colorToCSS(color: FigmaColor, opacity = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = +(color.a * opacity).toFixed(3);

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

function shadowToCSS(effect: FigmaEffect): string {
  const color = effect.color ? colorToCSS(effect.color) : "rgba(0,0,0,0.25)";
  const inset = effect.type === "INNER_SHADOW" ? "inset " : "";
  const x = effect.offset?.x ?? 0;
  const y = effect.offset?.y ?? 0;
  const blur = effect.radius ?? 0;
  const spread = effect.spread ?? 0;
  return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

// ---------------------------------------------------------------------------
// Style mapping
// ---------------------------------------------------------------------------

interface ThemeVars {
  colors: Map<string, string>;
  fonts: Map<string, string>;
  fontSizes: Map<string, string>;
  fontSizeLineHeights: Map<string, string>;
  fontSizeLetterSpacings: Map<string, string>;
  fontWeights: Map<string, string>;
  shadows: Map<string, string>;
  blurs: Map<string, string>;
}

function processStyles(
  styles: FigmaStyleMeta[],
  nodes: Record<string, FigmaNode | null>,
): ThemeVars {
  const vars: ThemeVars = {
    colors: new Map(),
    fonts: new Map(),
    fontSizes: new Map(),
    fontSizeLineHeights: new Map(),
    fontSizeLetterSpacings: new Map(),
    fontWeights: new Map(),
    shadows: new Map(),
    blurs: new Map(),
  };

  for (const style of styles) {
    const node = nodes[style.node_id];
    if (!node) {
      console.warn(
        `  ⚠ No node data for style "${style.name}" (${style.node_id})`,
      );
      continue;
    }

    const name = toVarName(style.name);

    switch (style.style_type) {
      case "FILL": {
        const fill = node.fills?.find(
          (f) => f.type === "SOLID" && f.visible !== false && f.color,
        );
        if (fill?.color) {
          vars.colors.set(name, colorToCSS(fill.color, fill.opacity));
        } else {
          console.warn(`  ⚠ Skipping non-solid fill "${style.name}"`);
        }
        break;
      }

      case "TEXT": {
        const s = node.style;
        if (!s) break;

        if (s.fontFamily) {
          vars.fonts.set(name, `"${s.fontFamily}"`);
        }

        if (s.fontSize) {
          vars.fontSizes.set(name, `${+(s.fontSize / 16).toFixed(4)}rem`);

          // Paired line-height: prefer a unitless ratio when PIXELS unit
          if (s.lineHeightPx && s.lineHeightUnit !== "INTRINSIC_%") {
            const ratio = +(s.lineHeightPx / s.fontSize).toFixed(4);
            vars.fontSizeLineHeights.set(name, String(ratio));
          }

          // letter-spacing as em (relative to font-size) per CSS convention
          if (s.letterSpacing) {
            const em = +(s.letterSpacing / s.fontSize).toFixed(4);
            vars.fontSizeLetterSpacings.set(name, `${em}em`);
          }
        }

        if (s.fontWeight) {
          vars.fontWeights.set(name, String(s.fontWeight));
        }
        break;
      }

      case "EFFECT": {
        const effects = (node.effects ?? []).filter((e) => e.visible !== false);
        const shadows = effects.filter(
          (e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW",
        );
        const blurs = effects.filter(
          (e) => e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR",
        );

        if (shadows.length > 0) {
          vars.shadows.set(name, shadows.map(shadowToCSS).join(", "));
        }
        if (blurs.length > 0) {
          const blur = blurs[0]!;
          vars.blurs.set(name, `blur(${blur.radius ?? 0}px)`);
        }
        break;
      }

      case "GRID":
        // No direct Tailwind equivalent — skipped
        break;
    }
  }

  return vars;
}

// ---------------------------------------------------------------------------
// CSS generation
// ---------------------------------------------------------------------------

function buildThemeBlock(vars: ThemeVars): string {
  const lines: string[] = [];

  function section(
    comment: string,
    entries: [string, string][],
    prefix: string,
  ) {
    if (entries.length === 0) return;
    lines.push(`  /* ${comment} */`);
    for (const [name, value] of entries) {
      lines.push(`  --${prefix}-${name}: ${value};`);
    }
    lines.push("");
  }

  section("Colors", [...vars.colors], "color");
  section("Font families", [...vars.fonts], "font");

  // Font sizes with optional paired --text-*--line-height / --text-*--letter-spacing
  if (vars.fontSizes.size > 0) {
    lines.push("  /* Font sizes */");
    for (const [name, size] of vars.fontSizes) {
      lines.push(`  --text-${name}: ${size};`);
      const lh = vars.fontSizeLineHeights.get(name);
      if (lh) lines.push(`  --text-${name}--line-height: ${lh};`);
      const ls = vars.fontSizeLetterSpacings.get(name);
      if (ls) lines.push(`  --text-${name}--letter-spacing: ${ls};`);
    }
    lines.push("");
  }

  section("Font weights", [...vars.fontWeights], "font-weight");
  section("Shadows", [...vars.shadows], "shadow");
  section("Blurs", [...vars.blurs], "blur");

  // Drop trailing blank line
  while (lines.at(-1) === "") lines.pop();

  if (lines.length === 0) return "";
  return `@theme {\n${lines.join("\n")}\n}\n`;
}

const GENERATED_MARKER = "/* Generated by generate-tailwind-config */";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function updateGlobalCSS(cssPath: string, themeBlock: string): void {
  let css = readFileSync(cssPath, "utf-8");

  // Remove any previously generated block
  css = css.replace(
    new RegExp(
      `\\n?${escapeRegex(GENERATED_MARKER)}\\n@theme \\{[\\s\\S]*?\\}\\n?`,
      "g",
    ),
    "",
  );

  const newCSS = css.trimEnd() + "\n\n" + GENERATED_MARKER + "\n" + themeBlock;

  writeFileSync(cssPath, newCSS, "utf-8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const env = loadEnv();
  const fileKey = env["FIGMA_FILE_KEY"] ?? process.env["FIGMA_FILE_KEY"];
  const token = env["FIGMA_ACCESS_TOKEN"] ?? process.env["FIGMA_ACCESS_TOKEN"];

  if (!fileKey || !token) {
    console.error(
      "Missing FIGMA_FILE_KEY or FIGMA_ACCESS_TOKEN. Add them to .env or the environment.",
    );
    process.exit(1);
  }

  console.log(`Fetching styles for file: ${fileKey}`);
  const styles = await fetchStyles(fileKey, token);
  console.log(`Found ${styles.length} published style(s)`);

  if (styles.length === 0) {
    console.log("Nothing to generate.");
    return;
  }

  // Log breakdown by type
  const byType = styles.reduce<Record<string, number>>((acc, s) => {
    acc[s.style_type] = (acc[s.style_type] ?? 0) + 1;
    return acc;
  }, {});
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nFetching node values...");
  const nodeIds = styles.map((s) => s.node_id);
  const nodes = await fetchNodes(fileKey, token, nodeIds);

  const vars = processStyles(styles, nodes);
  const themeBlock = buildThemeBlock(vars);

  if (!themeBlock) {
    console.log("\nNo mappable styles found — global.css unchanged.");
    return;
  }

  const cssPath = resolve(ROOT, "src/styles/global.css");
  updateGlobalCSS(cssPath, themeBlock);

  const total =
    vars.colors.size +
    vars.fonts.size +
    vars.fontSizes.size +
    vars.fontWeights.size +
    vars.shadows.size +
    vars.blurs.size;

  console.log(`\nWrote ${total} variable(s) to src/styles/global.css:`);
  if (vars.colors.size) console.log(`  --color-*      : ${vars.colors.size}`);
  if (vars.fonts.size) console.log(`  --font-*       : ${vars.fonts.size}`);
  if (vars.fontSizes.size)
    console.log(`  --text-*       : ${vars.fontSizes.size}`);
  if (vars.fontWeights.size)
    console.log(`  --font-weight-*: ${vars.fontWeights.size}`);
  if (vars.shadows.size) console.log(`  --shadow-*     : ${vars.shadows.size}`);
  if (vars.blurs.size) console.log(`  --blur-*       : ${vars.blurs.size}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
