export interface ParsedFrontmatter {
  /** ComponentName → npm package name, loaded via esm.sh */
  components: Record<string, string>
  /** Source with the frontmatter block stripped */
  stripped: string
}

/**
 * Parses a minimal YAML-style frontmatter block at the start of MDX source.
 * Only recognises the `components:` section (key: value pairs, indented).
 *
 * Example:
 *   ---
 *   components:
 *     Button: "@radix-ui/themes"
 *     BarChart: recharts
 *   ---
 */
export function parseFrontmatter(source: string): ParsedFrontmatter {
  const components: Record<string, string> = {}

  if (!source.trimStart().startsWith('---')) {
    return { components, stripped: source }
  }

  // Find closing ---
  const after3 = source.indexOf('---') + 3
  const end = source.indexOf('\n---', after3)
  if (end === -1) return { components, stripped: source }

  const fm = source.slice(after3, end)
  const stripped = source.slice(end + 4).replace(/^\n/, '')

  let inComponents = false
  for (const raw of fm.split('\n')) {
    const trimmed = raw.trim()
    if (trimmed === 'components:') { inComponents = true; continue }
    if (inComponents) {
      // Stop when a new top-level key appears (not indented)
      if (raw.length > 0 && raw[0] !== ' ' && raw[0] !== '\t') { inComponents = false; continue }
      // Match:  Name: "pkg" | Name: 'pkg' | Name: pkg
      const m = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*):\s*['"]?([^'"]+?)['"]?\s*$/)
      if (m) components[m[1]] = m[2].trim()
    }
  }

  return { components, stripped }
}

/** Strip bare `import X from 'y'` / `import { X } from "y"` lines that would
 *  crash mdx evaluate() in a browser context. */
export function stripImports(source: string): string {
  return source.replace(/^import\s[^'"]*['"][^'"]+['"]\s*;?\s*$/gm, '')
}
