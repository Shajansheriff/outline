# Outline

A focused, browser-only workspace for system design interviews. Start with a title and subtitle, then follow an interview delivery framework: Scope → Entities / Data Models → API → optional Data Flow → High Level Design → Discussion.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Keep that origin consistent: browser storage belongs to the host and port. There is no backend, account, or cloud sync. Fonts and editor assets are bundled locally.

```sh
npm run build       # TypeScript check and production build to dist/
npm run preview     # Serve the production build
npm test            # Document/import/export and IndexedDB tests
npm run test:e2e    # Browser acceptance tests (uses installed Google Chrome)
```

For a machine without Chrome, install Playwright Chromium with `npx playwright install chromium` and remove `channel: 'chrome'` from `playwright.config.ts`.

## Interview workflow

- **Title and subtitle:** capture the question and its product context. Core stages start empty and ready to use. Capacity planning and Data Flow are optional toggles above the document.
- **Scope:** functional and non-functional checklists. Check a requirement when covered; it remains readable. Enter adds the next row, Alt+Up/Down moves focus, and arrow buttons reorder items. A scope scratchpad captures assumptions and exclusions; optional capacity notes support rough calculations and scalability discussion.
- **Data models:** start in **Schema + diagram** to type table blocks and references, then generate an ER diagram with **Cmd/Ctrl+Enter**. The diagram connects specific fields and shows keys, types, and relationship cardinality. Incomplete drafts are saved without changing the last generated model. **Table editor** retains the original entity-card workflow; switching to it with an unapplied draft requires generating or discarding that draft first. Card edits regenerate the schema text. The **SQL scratchpad** saves rough SQL or pseudocode, supports syntax highlighting and SELECT/JOIN/transaction starters, and never executes statements.
- **API design:** method/path/title cards, notes for parameters and headers, request JSON, and multiple status/JSON responses. Drafts do not need valid JSON. Format becomes available when a body is valid. Endpoints can be collapsed or duplicated.
- **Data Flow (optional):** outline ordered processing steps with details and output labels. Enter in a step title adds the next step; arrows reorder steps. A compact flow overview updates as you type.
- **High Level Design:** click SVG components in the palette, rename inline, and drag between connection handles. Select a node and enable **Add connected component** to build a chain quickly. Selector-based connections are also available. Click a line to edit its label; asynchronous lines are dashed. Auto-layout runs only when requested. Insertable patterns add ordinary editable monolith, services, or queue/worker components.

- **Discussion / Scratchpad:** save trade-offs, bottlenecks, failure cases, and follow-up questions.

Sections can be collapsed, reordered, or removed. Removing a section retains its content so it can be added again. Destructive item actions show an Undo toast; the next content edit or design switch dismisses that undo opportunity. The quick guide is available in the sidebar.

## Saving and backups

Older documents gain the new ordered stages on their first load, preserving existing content and collapsed states. Subsequent section customization is retained. Hiding optional stages retains their notes and steps.

Designs autosave to IndexedDB with a versioned document format and a serialized write queue. The save indicator reports pending, successful, or failed writes. Failed drafts remain in memory, and Retry attempts pending writes again.

Export **JSON backup** for a complete copy, including unfinished bodies, checklist state, node positions, and viewport. Import validates the document before adding it as a new design. **Markdown document** exports readable notes, field tables, relationships, and architecture connections.

Data belongs to the current browser profile. Export JSON to back up your work or move between devices. This version is a locally served web app; it does not install an offline service worker.

## Quick schema syntax

```text
Table riders {
  id uuid [pk]
  name text
}

Table rides {
  id uuid [pk]
  rider_id uuid [ref: > riders.id]
  created_at timestamp
}
```

Use one field per line. Instead of an inline reference, write `Ref: riders.id < rides.rider_id`. Operators are `<` (one-to-many), `>` (many-to-one), `-` (one-to-one), and `<>` (many-to-many). References can connect whole entities or specific fields, including self references. Types are freeform. Add `[fk]`, `[note: "..."]`, table-level `Note: "..."`, or `// comments`. Quote identifiers containing spaces with double quotes.

This is a compact, DBML-style subset, not a SQL DDL parser. Full SQL and incomplete SQL belong in the scratchpad. Generate applies the entire valid schema together; invalid references and incomplete blocks show line-numbered errors. Dragging diagram nodes adjusts the current view; regenerating the schema or reopening the section arranges them again. Existing design files receive empty schema-draft and SQL defaults when loaded. Backups include both pending schema drafts and SQL notes.

## Implementation

React and TypeScript with Vite; CodeMirror for JSON examples; React Flow and Dagre for architecture; Zod for file validation; IndexedDB through `idb` for persistence. All editing happens on the client. Expensive editors are loaded when their sections are opened.

## Guided HLD example

In High Level Design, choose **Open sample HLD**. This creates a separate editable ride-booking design with 22 components and 25 labeled connections. Your current design stays in the sidebar.

Use the six walkthrough buttons to isolate request handling, Kafka pub/sub, background jobs, payment webhooks, notifications, and driver location updates. **All components** restores the full view. Expand the canvas and zoom/pan to inspect labels. Each walkthrough explains inputs, outputs, and interactions; these notes are also saved in Discussion and included in exports.

The example includes SQL, NoSQL, Redis, Kafka, a job queue, scheduler, workers, object storage, payment callbacks, and notification delivery. Boxes represent responsibilities. Solid arrows represent direct calls; dashed arrows represent decoupled delivery. HTTP webhooks are decoupled from the original operation but still use request/response for delivery. This is a reference palette, not a requirement to include every component in an interview.

In the HLD component palette, **Sticky note** adds an editable title and multiline annotation. Drag its header to position it beside a component. Notes support optional labeled connections, autosave, JSON/Markdown export, and deletion undo. Auto-layout preserves note positions.

Drag a component or sticky note from the HLD palette onto the canvas to place it at the drop location, including when zoomed or panned. Click-to-add remains available. Select a connection or its label to choose a line color (slate, blue, green, orange, red, or purple); **Auto** restores the synchronous/asynchronous default. Line and arrowhead colors persist in JSON backups.
