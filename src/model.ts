import { z } from "zod";

export const sectionKinds = [
  "requirements",
  "models",
  "apis",
  "dataFlow",
  "architecture",
  "discussion",
] as const;
export type SectionKind = (typeof sectionKinds)[number];
export const componentKinds = [
  "client",
  "service",
  "gateway",
  "loadBalancer",
  "database",
  "cache",
  "queue",
  "stream",
  "worker",
  "scheduler",
  "storage",
  "custom",
  "note",
] as const;
export type ComponentKind = (typeof componentKinds)[number];
const id = z.string().min(1);
const text = z.string();
const requirementSchema = z.object({ id, text, checked: z.boolean() });
const responseSchema = z.object({
  id,
  status: text,
  description: text,
  body: text,
});
const endpointSchema = z.object({
  id,
  title: text,
  method: text,
  path: text,
  description: text,
  parameters: text,
  request: text,
  responses: z.array(responseSchema),
  collapsed: z.boolean(),
});
const fieldSchema = z.object({
  id,
  name: text,
  type: text,
  pk: z.boolean(),
  fk: z.boolean(),
  notes: text,
});
const entitySchema = z.object({
  id,
  name: text,
  notes: text,
  fields: z.array(fieldSchema),
});
const relationshipSchema = z.object({
  id,
  source: id,
  target: id,
  sourceField: text,
  targetField: text,
  cardinality: z.enum(["1:1", "1:N", "N:1", "N:N"]),
  label: text,
});
const nodeSchema = z.object({
  id,
  kind: z.enum(componentKinds),
  name: text,
  description: text,
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
});
const edgeSchema = z.object({
  id,
  source: id,
  target: id,
  label: text,
  async: z.boolean(),
});
export const designSchema = z.object({
  version: z.literal(1),
  id,
  title: text,
  subtitle: text.default(""),
  hldExample: z.boolean().optional(),
  frameworkRevision: z.literal(1).optional(),
  scopeNotes: text.default(""),
  capacity: z
    .object({ enabled: z.boolean(), notes: text })
    .default({ enabled: false, notes: "" }),
  discussionNotes: text.default(""),
  dataFlow: z
    .array(z.object({ id, title: text, details: text, output: text }))
    .default([]),
  createdAt: text,
  updatedAt: text,
  sections: z.array(
    z.object({ kind: z.enum(sectionKinds), collapsed: z.boolean() }),
  ),
  requirements: z.object({
    functional: z.array(requirementSchema),
    nonFunctional: z.array(requirementSchema),
  }),
  endpoints: z.array(endpointSchema),
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
  schemaDraft: z.string().nullable().default(null),
  schemaApplied: z.string().nullable().default(null),
  sqlNotes: z.string().default(""),
  architecture: z.object({
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema),
    viewport: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
      zoom: z.number().positive(),
    }),
  }),
});
export type Design = z.infer<typeof designSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type Endpoint = z.infer<typeof endpointSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Field = z.infer<typeof fieldSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type DiagramNode = z.infer<typeof nodeSchema>;
export type DiagramEdge = z.infer<typeof edgeSchema>;
export const uid = () => crypto.randomUUID();
export const newRequirement = (): Requirement => ({
  id: uid(),
  text: "",
  checked: false,
});
export const newField = (): Field => ({
  id: uid(),
  name: "",
  type: "",
  pk: false,
  fk: false,
  notes: "",
});
export const newEndpoint = (): Endpoint => ({
  id: uid(),
  title: "",
  method: "POST",
  path: "",
  description: "",
  parameters: "",
  request: "",
  responses: [{ id: uid(), status: "200", description: "", body: "" }],
  collapsed: false,
});
export function newDesign(): Design {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: uid(),
    title: "",
    subtitle: "",
    frameworkRevision: 1,
    scopeNotes: "",
    capacity: { enabled: false, notes: "" },
    discussionNotes: "",
    dataFlow: [],
    createdAt: now,
    updatedAt: now,
    sections: sectionKinds
      .filter((kind) => kind !== "dataFlow")
      .map((kind) => ({ kind, collapsed: false })),
    requirements: { functional: [], nonFunctional: [] },
    endpoints: [],
    entities: [],
    relationships: [],
    schemaDraft: null,
    schemaApplied: null,
    sqlNotes: "",
    architecture: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  };
}
export const displayTitle = (d: Design) => d.title.trim() || "Untitled design";
export function parseDesign(raw: string): Design {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(
      "This file is not valid JSON. Choose an Outline design export.",
    );
  }
  if (
    typeof value === "object" &&
    value &&
    "version" in value &&
    value.version !== 1
  )
    throw new Error("This design uses an unsupported file version.");
  const result = designSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      "This file is missing required design data or contains invalid values.",
    );
  const d = result.data;
  const sections = d.sections.map((s) => s.kind);
  if (new Set(sections).size !== sections.length)
    throw new Error("This file contains duplicate sections.");
  const allIds = [
    d.id,
    ...d.requirements.functional.map((x) => x.id),
    ...d.requirements.nonFunctional.map((x) => x.id),
    ...d.endpoints.flatMap((x) => [x.id, ...x.responses.map((r) => r.id)]),
    ...d.entities.flatMap((x) => [x.id, ...x.fields.map((f) => f.id)]),
    ...d.relationships.map((x) => x.id),
    ...d.dataFlow.map((x) => x.id),
    ...d.architecture.nodes.map((x) => x.id),
    ...d.architecture.edges.map((x) => x.id),
  ];
  if (new Set(allIds).size !== allIds.length)
    throw new Error("This file contains duplicate item identifiers.");
  for (const r of d.relationships) {
    const source = d.entities.find((e) => e.id === r.source),
      target = d.entities.find((e) => e.id === r.target);
    if (
      !source ||
      !target ||
      (r.sourceField && !source.fields.some((f) => f.id === r.sourceField)) ||
      (r.targetField && !target.fields.some((f) => f.id === r.targetField))
    )
      throw new Error(
        "This file contains a relationship to a missing entity or field.",
      );
  }
  if (
    d.architecture.edges.some(
      (e) =>
        !d.architecture.nodes.some((n) => n.id === e.source) ||
        !d.architecture.nodes.some((n) => n.id === e.target),
    )
  )
    throw new Error("This file contains a connection to a missing component.");
  if (!d.frameworkRevision) {
    d.sections = sectionKinds
      .filter((kind) => kind !== "dataFlow" || sections.includes(kind))
      .map(
        (kind) =>
          d.sections.find((s) => s.kind === kind) ?? { kind, collapsed: false },
      );
    d.frameworkRevision = 1;
  }
  return d;
}
export function removeEntity(d: Design, entityId: string) {
  d.entities = d.entities.filter((e) => e.id !== entityId);
  d.relationships = d.relationships.filter(
    (r) => r.source !== entityId && r.target !== entityId,
  );
}
export function removeField(d: Design, entityId: string, fieldId: string) {
  const entity = d.entities.find((e) => e.id === entityId);
  if (entity) entity.fields = entity.fields.filter((f) => f.id !== fieldId);
  d.relationships = d.relationships.filter(
    (r) => r.sourceField !== fieldId && r.targetField !== fieldId,
  );
}
export function removeNode(d: Design, nodeId: string) {
  d.architecture.nodes = d.architecture.nodes.filter((n) => n.id !== nodeId);
  d.architecture.edges = d.architecture.edges.filter(
    (e) => e.source !== nodeId && e.target !== nodeId,
  );
}
const tableText = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const jsonBlock = (s: string) => {
  const longest = Math.max(
    2,
    ...Array.from(s.matchAll(/`+/g), (m) => m[0].length),
  );
  const fence = "`".repeat(longest + 1);
  return `${fence}json\n${s}\n${fence}`;
};
export function toMarkdown(d: Design): string {
  const parts = [`# ${displayTitle(d)}`, d.subtitle];
  for (const section of d.sections) {
    if (section.kind === "requirements") {
      parts.push("## Scope");
      for (const [title, rows] of [
        ["Functional", d.requirements.functional],
        ["Non-functional", d.requirements.nonFunctional],
      ] as const)
        parts.push(
          `### ${title}\n\n${rows.map((r) => `- [${r.checked ? "x" : " "}] ${r.text}`).join("\n")}`,
        );
    }
    if (section.kind === "requirements") {
      if (d.capacity.enabled)
        parts.push("### Capacity planning", d.capacity.notes);
      if (d.scopeNotes) parts.push("### Scope scratchpad", d.scopeNotes);
    }
    if (section.kind === "dataFlow") {
      parts.push(
        "## Data flow",
        ...d.dataFlow.map(
          (step, i) =>
            `${i + 1}. ${step.title}

${step.details}${
              step.output
                ? `

Output → ${step.output}`
                : ""
            }`,
        ),
      );
    }
    if (section.kind === "discussion")
      parts.push("## Discussion / Scratchpad", d.discussionNotes);
    if (section.kind === "apis") {
      parts.push("## API design");
      for (const e of d.endpoints) {
        parts.push(
          `### ${e.method} ${e.path}${e.title ? ` — ${e.title}` : ""}`,
          e.description,
        );
        if (e.parameters) parts.push(`Parameters / headers\n\n${e.parameters}`);
        if (e.request) parts.push("Request body", jsonBlock(e.request));
        for (const r of e.responses)
          parts.push(
            `#### Response ${r.status}${r.description ? ` — ${r.description}` : ""}`,
            jsonBlock(r.body),
          );
      }
    }
    if (section.kind === "models") {
      parts.push("## Data models");
      if (d.schemaDraft !== null)
        parts.push(
          "### Schema definition",
          jsonBlock(d.schemaDraft).replace(/^(\x60+)json/, "$1text"),
        );
      if (d.sqlNotes)
        parts.push(
          "### SQL scratchpad",
          jsonBlock(d.sqlNotes).replace(/^(\x60+)json/, "$1sql"),
        );
      for (const e of d.entities)
        parts.push(
          `### ${e.name || "Untitled entity"}`,
          e.notes,
          `| Field | Type | Key | Notes |\n| --- | --- | --- | --- |\n${e.fields.map((f) => `| ${tableText(f.name)} | ${tableText(f.type)} | ${[f.pk && "PK", f.fk && "FK"].filter(Boolean).join(", ")} | ${tableText(f.notes)} |`).join("\n")}`,
        );
      if (d.relationships.length)
        parts.push(
          "### Relationships",
          d.relationships
            .map((r) => {
              const s = d.entities.find((e) => e.id === r.source)!,
                t = d.entities.find((e) => e.id === r.target)!;
              const sf = s.fields.find((f) => f.id === r.sourceField),
                tf = t.fields.find((f) => f.id === r.targetField);
              return `- ${s.name}${sf ? `.${sf.name}` : ""} → ${t.name}${tf ? `.${tf.name}` : ""} (${r.cardinality})${r.label ? `: ${r.label}` : ""}`;
            })
            .join("\n"),
        );
    }
    if (section.kind === "architecture") {
      parts.push(
        "## High Level Design",
        d.architecture.nodes
          .map(
            (n) =>
              `- ${n.name} (${n.kind})${n.description ? `: ${n.description}` : ""}`,
          )
          .join("\n"),
      );
      if (d.architecture.edges.length)
        parts.push(
          "### Connections",
          d.architecture.edges
            .map(
              (e) =>
                `- ${d.architecture.nodes.find((n) => n.id === e.source)?.name} → ${d.architecture.nodes.find((n) => n.id === e.target)?.name}${e.label ? `: ${e.label}` : ""} (${e.async ? "asynchronous" : "synchronous"})`,
            )
            .join("\n"),
        );
    }
  }
  return parts.filter(Boolean).join("\n\n") + "\n";
}
