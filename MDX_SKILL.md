# MDX Skill — Component Reference

This renderer accepts `.md` and `.mdx` files. In MDX files you can embed JSX components
inline in prose. The renderer provides the components below — no imports needed in the file.

## How to trigger a render

**Browser:** run `npm run dev` in the `mdx-browser` directory, open `http://localhost:5173`,
and drag-drop any `.mdx` file.

**Terminal (auto):** after running `bash cli/install-hook.sh` once, Claude Code automatically
renders any `.mdx` file it writes via the PostToolUse hook — no manual step needed.

**Terminal (manual):** `node cli/mdx-term.mjs <file.mdx>`

**Terminal (watch mode):** `node cli/mdx-term.mjs watch <file.mdx>` — re-renders on each save.

---

## When to use MDX instead of plain Markdown

Use MDX when output includes any of:

| Signal in your content | Component to use |
|---|---|
| Architecture, data flow, state machines, sequences | `<Diagram>` |
| Multiple options / alternatives / versions | `<Tabs>` |
| Important caveat, gotcha, or note the reader must see | `<Callout>` |
| Tabular comparison data, metrics, ticket lists | `<DataTable sortable>` |
| Code section that needs explanation per line | `<CodeAnnotated>` |
| Output the user will copy back into a prompt | `<ExportButton>` |
| A tunable numeric parameter | `<Slider>` |
| A sequence of dated events (incidents, milestones) | `<Timeline>` |
| Before/after code change | `<DiffView>` |

If none of these apply, plain Markdown is fine.

---

## File structure conventions

1. **Open with a summary** — start every MDX document with a `<Callout type="info">` that
   states what the document is and who it is for in 1–3 sentences.
2. **Use `##` headings for major sections** — these auto-generate the sidebar TOC.
   Use `###` for sub-sections. Avoid skipping levels.
3. **Place components inline** — put a `<Diagram>` immediately after the paragraph that
   introduces the architecture, not in an appendix.
4. **Close specs with an ExportButton** — if the document is a plan or spec, end it with
   `<ExportButton format="md" data={...} label="Copy plan" />`.

---

## Component reference

### `<Callout>`

Highlighted box for notes the reader must not miss.

```mdx
<Callout type="info">
  This is the simplest safe approach for most deployments.
</Callout>

<Callout type="warn">
  Changing this value requires a rolling restart — coordinate with on-call.
</Callout>

<Callout type="tip">
  Run `make dev` to get a hot-reloading dev server.
</Callout>

<Callout type="danger">
  Do not run this migration on prod without a backup.
</Callout>
```

**Props:** `type` — `"info"` (default) | `"warn"` | `"tip"` | `"danger"`

---

### `<Diagram>`

Renders a Mermaid diagram to SVG inline.

```mdx
<Diagram type="mermaid">{`
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Data Service]
    D --> E[(Postgres)]
`}</Diagram>
```

Sequence diagram:

```mdx
<Diagram type="mermaid">{`
sequenceDiagram
    Client->>Gateway: POST /api/ingest
    Gateway->>Auth: validate token
    Auth-->>Gateway: 200 OK
    Gateway->>Worker: enqueue job
    Worker-->>Client: 202 Accepted
`}</Diagram>
```

**Props:** `type` — `"mermaid"` (default, only supported value).
Children: the raw Mermaid syntax as text.

---

### `<Tabs>`

Tabbed content switcher. Use for alternatives, options, or multi-language examples.

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

**Props:** `labels` — string array (one label per tab panel).
Children: one `<div>` per tab, in the same order as `labels`.

---

### `<DataTable>`

Sortable table from structured data. Use instead of Markdown tables when the data has
more than 4 columns or the user might want to sort.

```mdx
<DataTable
  columns={["Service", "Owner", "SLA", "Status"]}
  data={[
    ["gateway",   "platform", "99.9%", "✓ healthy"],
    ["auth",      "identity", "99.9%", "✓ healthy"],
    ["ingest",    "data",     "99.5%", "⚠ degraded"],
    ["reporting", "bi",       "99.0%", "✓ healthy"]
  ]}
  sortable={true}
/>
```

**Props:**
- `columns` — `string[]` — column header labels
- `data` — `string[][]` — rows, each row is an array of cell strings
- `sortable` — `boolean` (default `false`) — enables click-to-sort on headers

---

### `<CodeAnnotated>`

Code block with per-line margin annotations. Use for PR explanations or design
walkthroughs where specific lines need callout text.

```mdx
<CodeAnnotated lang="typescript" annotations={[
  { line: 1, comment: "entry point — called once at startup" },
  { line: 4, comment: "rate-limited to 10 rps per tenant" },
  { line: 7, comment: "idempotency key prevents double-billing" }
]}>
{`export async function processEvent(event: IngestEvent) {
  await validateSchema(event)

  const result = await callUpstream(event.payload)

  await db.events.upsert({
    where: { idempotencyKey: event.id },
    data: { ...result, processedAt: new Date() }
  })
}`}
</CodeAnnotated>
```

**Props:**
- `lang` — language string for syntax highlighting (e.g. `"typescript"`, `"python"`)
- `annotations` — `Array<{ line: number; comment: string }>` — 1-based line numbers

Children: the raw code string (use a template literal inside `{}`).

---

### `<ExportButton>`

Copy-to-clipboard button. Use at the end of specs or plans so the user can paste
the content back into Claude.

```mdx
<ExportButton
  format="md"
  label="Copy this plan"
  data={`# Sprint Plan\n\n- [ ] Task A\n- [ ] Task B`}
/>

<ExportButton format="json" data={{ version: "1.2", config: { timeout: 30 } }} />
```

**Props:**
- `format` — `"json"` | `"md"` | `"prompt"` (default `"json"`)
  - `json` — pretty-prints `data` as JSON
  - `md` — copies `data` as-is if string, else JSON
  - `prompt` — wraps `data` in a fenced code block for pasting into a chat
- `data` — any serializable value
- `label` — button label (default: `"Copy JSON"` / `"Copy MD"` / `"Copy PROMPT"`)

---

### `<Slider>`

Interactive range slider with a live value display. Use for tunable parameters
in configuration documents or prompt-engineering guides.

```mdx
<Slider label="Max output tokens"  min={256}  max={8192} defaultValue={2048} unit=" tok" />
<Slider label="Temperature"        min={0}    max={2}    defaultValue={1}    step={0.1}  />
<Slider label="Top-p"              min={0}    max={1}    defaultValue={0.95} step={0.05} />
```

**Props:** `label`, `min`, `max`, `defaultValue`, `unit` (string appended to value), `step`

---

### `<Timeline>`

Vertical timeline. Use for incident post-mortems, project milestones, or changelog entries.

```mdx
<Timeline events={[
  {
    date: "2025-05-01",
    title: "Incident begins",
    desc: "Elevated error rates detected on the gateway. PagerDuty fires at 14:32 UTC."
  },
  {
    date: "2025-05-01 14:45",
    title: "Root cause identified",
    desc: "Bad deploy of auth-service v2.4.1 — JWT validation broke for tokens issued before 2024."
  },
  {
    date: "2025-05-01 15:02",
    title: "Rollback complete",
    desc: "auth-service rolled back to v2.4.0. Error rates return to baseline."
  }
]} />
```

**Props:** `events` — `Array<{ date: string; title: string; desc?: string }>`

---

### `<DiffView>`

Side-by-side before/after diff with syntax highlighting. Use for PR explanations
or config change reviews.

```mdx
<DiffView
  lang="typescript"
  before={`function greet(name: string) {
  return "Hello " + name
}`}
  after={`function greet(name: string): string {
  return \`Hello, \${name}!\`
}`}
/>
```

**Props:**
- `before` — the original code string
- `after` — the modified code string
- `lang` — language for syntax highlighting (same values as code blocks)

---

## Decision guide

```
Need to explain a concept?          → prose + maybe a <Callout>
Architecture or flow exists?        → <Diagram type="mermaid">
Comparing ≥3 options?               → <Tabs>
Comparing structured data (table)?  → <DataTable sortable>
Explaining specific code lines?     → <CodeAnnotated>
Before/after code change?           → <DiffView>
Dated sequence of events?           → <Timeline>
User needs to copy the output?      → <ExportButton>
A numeric value the user can tune?  → <Slider>
```

---

## Example: implementation plan

```mdx
# Auth Service Refactor

<Callout type="info">
  This document covers the plan to replace the legacy JWT library with jose.
  Audience: platform engineers and the identity team.
</Callout>

## Current architecture

<Diagram type="mermaid">{`
graph LR
    A[API Gateway] -->|Bearer token| B[auth-service]
    B -->|jsonwebtoken| C[(Redis sessions)]
`}</Diagram>

## Migration options

<Tabs labels={["Option A — drop-in swap", "Option B — proxy layer"]}>
  <div>

  Replace `jsonwebtoken` with `jose` directly. Fast but requires updating
  every call site.

  <Callout type="warn">
    Requires a coordinated deploy — old and new tokens are not cross-compatible.
  </Callout>

  </div>
  <div>

  Run both libraries behind a proxy that tries `jose` first and falls back to
  `jsonwebtoken`. Slower but zero-downtime.

  </div>
</Tabs>

## Key code change

<DiffView
  lang="typescript"
  before={`import jwt from 'jsonwebtoken'
export const verify = (token: string) => jwt.verify(token, SECRET)`}
  after={`import { jwtVerify } from 'jose'
const key = new TextEncoder().encode(SECRET)
export const verify = (token: string) => jwtVerify(token, key)`}
/>

## Rollout timeline

<Timeline events={[
  { date: "Week 1", title: "Implement + unit tests" },
  { date: "Week 2", title: "Staging deploy + load test" },
  { date: "Week 3", title: "Production deploy (off-peak)" }
]} />

<ExportButton format="md" label="Copy this plan" data="..." />
```
