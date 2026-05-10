# MD Render

A Tauri desktop app that renders `.md` and `.mdx` files locally — no server, no cloud, no account. Drop in a file and see a live-rendered document with syntax highlighting, diagrams, sortable tables, diffs, and more.

---

## Why

Markdown has become the default language of AI agents. Every plan, every spec, every structured response comes back as `.md`. That's fine — until the output grows beyond what flat text can express.

Agents are increasingly producing content that doesn't fit neatly in a paragraph: comparison tables, step-by-step timelines, before/after diffs, architecture diagrams, interactive sliders for configuration options, annotated code walkthroughs. Markdown lets you *write* these things, but renders them as walls of code fences and raw JSX that the reader has to mentally parse.

The format has become a bottleneck. Richer outputs are possible — HTML and MDX can carry interactive, visually structured content — but the tooling assumes you have a build pipeline and a browser tab open to localhost.

MD Render closes that gap. Drop any `.md` or `.mdx` file and it renders immediately, locally, with no server and no account. The built-in component library covers the things agents and humans most commonly need: diagrams, diffs, timelines, sortable tables, tabbed code blocks, callouts. You can also pull in any React component from npm — no install, no bundler — by listing it in the file's frontmatter.

The goal is simple: make rich Markdown as frictionless to read as plain Markdown.

---

## Download

Grab the latest release from the [Releases](../../releases) page:

| Platform | File |
|----------|------|
| macOS (Apple Silicon + Intel) | `MD.Render_x.y.z_universal.dmg` |
| Linux | `md-render_x.y.z_amd64.AppImage` |
| Windows | `MD.Render_x.y.z_x64-setup.exe` |

> **macOS note:** the app is unsigned. On first launch right-click → **Open**, or run:
> ```sh
> xattr -cr /Applications/MD\ Render.app
> ```

---

## Features

- **Instant rendering** — drop any `.md` or `.mdx` file and it renders immediately
- **Rich component library** — 9 custom MDX components (diagrams, tabs, diffs, timelines…)
- **Syntax highlighting** — powered by [Shiki](https://shiki.style) (Tokyo Night / GitHub Light)
- **Sidebar TOC** — auto-generated table of contents with active-section tracking
- **Light & dark themes** — toggle with `⌘,` or the sun/moon icon
- **Adjustable typography** — font, size, line height, content width, code font
- **Native file picker** — `⌘O` opens a standard macOS/Linux/Windows file dialog
- **Zero dependencies at runtime** — ships as a self-contained native app

---

## Keyboard Shortcuts

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| Open file | `⌘O` | `Ctrl+O` |
| Settings panel | `⌘,` | `Ctrl+,` |
| Close settings | `Esc` | `Esc` |

---

## MDX Component Library

MD Render ships with nine built-in components. No imports needed — just use them directly in any `.mdx` file.

### `<Callout>`

Highlighted note box. Four types: `info` (default), `warn`, `tip`, `danger`.

```mdx
<Callout type="warn">
  Changing this value requires a rolling restart.
</Callout>
```

---

### `<Diagram>`

Renders a [Mermaid](https://mermaid.js.org) diagram inline. Pass the diagram source as a template literal to prevent MDX from parsing it as Markdown.

```mdx
<Diagram type="mermaid">{`
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Data Service]
    D --> E[(Postgres)]
`}</Diagram>
```

**Supports:** flowcharts, sequence diagrams, ER diagrams, state machines, Gantt charts — anything Mermaid supports.

---

### `<Tabs>`

Tab switcher. One `<div>` per panel, in the same order as `labels`.

```mdx
<Tabs labels={["TypeScript", "Python", "Go"]}>
  <div>

  ```typescript
  const client = new ApiClient({ baseUrl: process.env.API_URL })
  ```

  </div>
  <div>

  ```python
  client = ApiClient(base_url=os.environ["API_URL"])
  ```

  </div>
  <div>

  ```go
  client := NewApiClient(os.Getenv("API_URL"))
  ```

  </div>
</Tabs>
```

---

### `<DataTable>`

Sortable table from structured data. Click column headers to sort.

```mdx
<DataTable
  columns={["Service", "Owner", "SLA", "Status"]}
  data={[
    ["gateway",   "platform", "99.9%", "✓ healthy"],
    ["auth",      "identity", "99.9%", "✓ healthy"],
    ["ingest",    "data",     "99.5%", "⚠ degraded"]
  ]}
  sortable
/>
```

**Props:** `columns` `string[]`, `data` `string[][]`, `sortable` `boolean`

---

### `<CodeAnnotated>`

Code block with per-line margin annotations. Useful for PR walkthroughs.

```mdx
<CodeAnnotated lang="typescript" annotations={[
  { line: 1, comment: "entry point" },
  { line: 4, comment: "rate-limited: 10 rps per tenant" }
]}>
{`export async function processEvent(event: IngestEvent) {
  await validateSchema(event)

  const result = await callUpstream(event.payload)
  return result
}`}
</CodeAnnotated>
```

**Props:** `lang` string, `annotations` `{ line: number; comment: string }[]`

---

### `<DiffView>`

Side-by-side before/after diff with syntax highlighting.

```mdx
<DiffView
  lang="typescript"
  before={`import jwt from 'jsonwebtoken'
export const verify = (t: string) => jwt.verify(t, SECRET)`}
  after={`import { jwtVerify } from 'jose'
const key = new TextEncoder().encode(SECRET)
export const verify = (t: string) => jwtVerify(t, key)`}
/>
```

**Props:** `before` string, `after` string, `lang` string

---

### `<Timeline>`

Vertical timeline for incidents, changelogs, or milestones.

```mdx
<Timeline events={[
  { date: "2025-05-01 14:32", title: "Incident begins",    desc: "Elevated error rates on gateway." },
  { date: "2025-05-01 14:45", title: "Root cause found",   desc: "Bad deploy of auth-service v2.4.1." },
  { date: "2025-05-01 15:02", title: "Rollback complete",  desc: "Error rates back to baseline." }
]} />
```

**Props:** `events` `{ date: string; title: string; desc?: string }[]`

---

### `<Slider>`

Interactive range slider with live value display. Good for configuration docs.

```mdx
<Slider label="Temperature"    min={0}   max={2}    defaultValue={1}    step={0.1} />
<Slider label="Max tokens"     min={256} max={8192} defaultValue={2048} unit=" tok" />
```

**Props:** `label`, `min`, `max`, `defaultValue`, `step`, `unit`

---

### `<ExportButton>`

Copy-to-clipboard button. Use at the end of specs or plans.

```mdx
<ExportButton format="md"   label="Copy as Markdown" data={`# My Plan\n\n- Step 1`} />
<ExportButton format="json" data={{ version: "1.0", timeout: 30 }} />
```

**Props:** `format` `"json" | "md" | "prompt"`, `data` any, `label` string

---

### Unknown components

Any `<ComponentName>` that isn't registered renders as a labeled placeholder — it never crashes the document.

---

## Bring Your Own Components

MD Render can load any React component from npm — no install, no bundler, no build step. Add a `components` map to the file's YAML frontmatter and MD Render fetches the packages from [esm.sh](https://esm.sh) at render time.

```mdx
---
components:
  Button: "@radix-ui/themes"
  BarChart: recharts
  LineChart: recharts
  Alert: "@mui/material"
---

# Sales Dashboard

<Alert severity="info">Figures are updated daily at 00:00 UTC.</Alert>

<BarChart width={600} height={300} data={[
  { name: "Jan", revenue: 4000 },
  { name: "Feb", revenue: 3000 },
  { name: "Mar", revenue: 5200 },
]} />

<Button variant="solid" size="3">Download CSV</Button>
```

**How it works:**

Each `ComponentName: "package"` entry tells MD Render to `import("https://esm.sh/package")` and look for a named export called `ComponentName` (falling back to `default`). The import happens once, cached for the session.

A yellow banner at the top of the rendered document lists every package that was loaded, so you always know what third-party code is running.

**Tips:**

- Works with any package that ships ES modules: Recharts, Radix UI, MUI, Tremor, Ant Design, custom chart libraries, etc.
- Scoped packages work: `Alert: "@mui/material"` imports `Alert` from `https://esm.sh/@mui/material`
- You can map multiple components from the same package: list them separately with the same package name
- Built-in components (`Callout`, `Diagram`, `Tabs`, etc.) always take precedence — you can't accidentally override them
- Packages that require a DOM environment or native Node modules won't work; pure React UI libraries do

---

## Settings

Open with `⌘,` or the gear icon. All settings persist across sessions.

| Setting | Options |
|---------|---------|
| Theme | Dark (Tokyo Night) · Light |
| Font size | 12 – 22 px |
| Prose font | IBM Plex Sans · System · Georgia · Inter |
| Code font | IBM Plex Mono · Menlo · Fira Code · JetBrains Mono |
| Line height | Compact · Normal · Relaxed |
| Content width | Narrow · Normal · Wide · Full |

---

## Development

### Prerequisites

- Node.js ≥ 18
- Rust (install via [rustup](https://rustup.rs))
- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev`

### Run in dev mode

```sh
git clone https://github.com/sunilhari/md
cd md
npm install
npm run tauri:dev
```

The first run compiles ~350 Rust crates (~5 min). Subsequent starts take ~5 seconds.

### Build a distributable

```sh
npm run tauri:build
```

Output:
- **macOS:** `src-tauri/target/release/bundle/macos/MD Render.app` + `.dmg`
- **Linux:** `src-tauri/target/release/bundle/appimage/*.AppImage`
- **Windows:** `src-tauri/target/release/bundle/nsis/*.exe`

### Create a release

1. Bump the version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit and tag:
   ```sh
   git add .
   git commit -m "chore: release v1.2.3"
   git tag v1.2.3
   git push && git push --tags
   ```
3. GitHub Actions builds all three platforms and creates a draft release automatically.
4. Review the draft in the Releases tab and publish.

---

## Writing MDX files

MD Render auto-renders any `.md` or `.mdx` file. Here's a minimal template:

```mdx
# Document Title

<Callout type="info">
  What this document is and who it's for.
</Callout>

## Overview

Regular Markdown works as usual — **bold**, _italic_, `code`, tables, lists.

## Architecture

<Diagram type="mermaid">{`
graph TD
    A[Your System] --> B[Something]
`}</Diagram>

## Options

<Tabs labels={["Option A", "Option B"]}>
  <div>Content for option A.</div>
  <div>Content for option B.</div>
</Tabs>
```

For the full component reference see [`MDX_SKILL.md`](MDX_SKILL.md).

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri v2](https://tauri.app) (Rust + WebView) |
| Frontend | React 18 + TypeScript + Vite 5 |
| MDX compilation | [@mdx-js/mdx](https://mdxjs.com) (runtime evaluation) |
| Syntax highlighting | [Shiki](https://shiki.style) |
| Diagrams | [Mermaid](https://mermaid.js.org) |
| Markdown fallback | [react-markdown](https://github.com/remarkjs/react-markdown) |

---

## License

MIT
