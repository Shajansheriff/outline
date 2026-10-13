import { uid, type Entity, type Relationship } from "./model";

type Model = { entities: Entity[]; relationships: Relationship[] };
type Ref = {
  source: string;
  sourceField: string;
  target: string;
  targetField: string;
  cardinality: Relationship["cardinality"];
  label: string;
  line: number;
};
export type SchemaResult =
  | { ok: true; model: Model }
  | { ok: false; errors: { line: number; message: string }[] };
const namePattern = String.raw`(?:"(?:\\.|[^"\\])*"|[A-Za-z_][\w$-]*)`;
const tablePattern = new RegExp(
  `^Table\\s+(${namePattern})\\s*\\{\\s*(\\})?$`,
  "i",
);
const fieldPattern = new RegExp(
  `^(${namePattern})\\s+(.+?)(?:\\s+\\[(.*)\\])?$`,
);
const refPattern = new RegExp(
  `^(${namePattern})(?:\\.(${namePattern}))?\\s*(<>|>|<|-)\\s*(${namePattern})(?:\\.(${namePattern}))?(?:\\s+\\[(.*)\\])?$`,
);
const unquote = (value: string) =>
  value.startsWith('"') ? (JSON.parse(value) as string) : value;
const quoteName = (value: string) =>
  /^[A-Za-z_][\w$-]*$/.test(value) ? value : JSON.stringify(value);
const cardinalities = {
  "<": "1:N",
  ">": "N:1",
  "-": "1:1",
  "<>": "N:N",
} as const;
const operators = { "1:N": "<", "N:1": ">", "1:1": "-", "N:N": "<>" } as const;

function stripComment(line: string): string {
  let quoted = false,
    escaped = false;
  for (let i = 0; i < line.length; i++) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (line[i] === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (line[i] === '"') quoted = !quoted;
    if (!quoted && line.slice(i, i + 2) === "//")
      return line.slice(0, i).trim();
  }
  return line.trim();
}
function attributes(raw = ""): string[] {
  const result: string[] = [];
  let start = 0,
    quoted = false,
    escaped = false;
  for (let i = 0; i < raw.length; i++) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (raw[i] === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (raw[i] === '"') quoted = !quoted;
    if (raw[i] === "," && !quoted) {
      result.push(raw.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quoted) throw new Error("Close the quoted note or identifier.");
  if (raw.trim()) result.push(raw.slice(start).trim());
  return result;
}
function noteValue(raw: string) {
  const value = raw.replace(/^note\s*:\s*/i, "");
  if (!value.startsWith('"'))
    throw new Error(
      'Write notes in double quotes, for example note: "unique identifier".',
    );
  return unquote(value);
}
function parseRef(raw: string, line: number): Ref {
  const match = refPattern.exec(raw);
  if (!match)
    throw new Error("Use Ref: riders.id < rides.rider_id (or >, -, <>).");
  let label = "";
  for (const attr of attributes(match[6])) {
    if (/^note\s*:/i.test(attr)) label = noteValue(attr);
    else
      throw new Error(
        `Unknown relationship option: ${attr}. Use note: "label".`,
      );
  }
  return {
    source: unquote(match[1]),
    sourceField: match[2] ? unquote(match[2]) : "",
    cardinality: cardinalities[match[3] as keyof typeof cardinalities],
    target: unquote(match[4]),
    targetField: match[5] ? unquote(match[5]) : "",
    label,
    line,
  };
}

/** Parse the small, documented schema notation. Never partially applies a draft. */
export function parseSchema(
  source: string,
  previous: Model = { entities: [], relationships: [] },
): SchemaResult {
  const entities: Entity[] = [],
    refs: Ref[] = [],
    errors: { line: number; message: string }[] = [];
  let current: Entity | undefined,
    openedAt = 0;
  const lines = source.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1,
      text = stripComment(raw);
    if (!text) return;
    try {
      if (!current) {
        const table = tablePattern.exec(text);
        if (table) {
          const name = unquote(table[1]);
          if (!name) throw new Error("Give the table a name.");
          if (entities.some((e) => e.name === name))
            throw new Error(`Table "${name}" is defined more than once.`);
          current = {
            id: previous.entities.find((e) => e.name === name)?.id || uid(),
            name,
            notes: "",
            fields: [],
          };
          entities.push(current);
          openedAt = line;
          if (table[2]) current = undefined;
        } else if (/^Ref\s*:/i.test(text))
          refs.push(parseRef(text.replace(/^Ref\s*:\s*/i, ""), line));
        else
          throw new Error(
            "Start a table with Table name { or a relationship with Ref:.",
          );
      } else if (text === "}") current = undefined;
      else if (/^Note\s*:/i.test(text)) current.notes = noteValue(text);
      else {
        const match = fieldPattern.exec(text);
        if (!match)
          throw new Error(
            "Write a field name and type, for example id uuid [pk].",
          );
        const name = unquote(match[1]);
        if (!name) throw new Error("Give the field a name.");
        if (current.fields.some((f) => f.name === name))
          throw new Error(
            `Field "${name}" is defined more than once in ${current.name}.`,
          );
        const previousField = previous.entities
          .find((e) => e.name === current!.name)
          ?.fields.find((f) => f.name === name);
        const field = {
          id: previousField?.id || uid(),
          name,
          type: match[2] === '""' ? "" : match[2],
          pk: false,
          fk: false,
          notes: "",
        };
        for (const attr of attributes(match[3])) {
          if (/^(pk|primary key)$/i.test(attr)) field.pk = true;
          else if (/^fk$/i.test(attr)) field.fk = true;
          else if (/^note\s*:/i.test(attr)) field.notes = noteValue(attr);
          else if (/^ref\s*:/i.test(attr)) {
            refs.push(
              parseRef(
                `${quoteName(current.name)}.${quoteName(name)} ${attr.replace(/^ref\s*:\s*/i, "")}`,
                line,
              ),
            );
          } else
            throw new Error(
              `Unknown field option: ${attr}. Use pk, fk, ref: or note:.`,
            );
        }
        current.fields.push(field);
      }
    } catch (error) {
      errors.push({
        line,
        message:
          error instanceof SyntaxError
            ? "Check the quoted text on this line."
            : (error as Error).message,
      });
    }
  });
  if (current)
    errors.push({
      line: openedAt,
      message: `Close Table ${current.name} with }. Your last generated diagram is unchanged.`,
    });
  const relationships: Relationship[] = [];
  for (const ref of refs) {
    const s = entities.find((e) => e.name === ref.source),
      t = entities.find((e) => e.name === ref.target);
    const sf = s?.fields.find((f) => f.name === ref.sourceField),
      tf = t?.fields.find((f) => f.name === ref.targetField);
    if (!s || !t || (ref.sourceField && !sf) || (ref.targetField && !tf)) {
      errors.push({
        line: ref.line,
        message: `Reference points to an undefined table or field: ${ref.source}${ref.sourceField ? "." + ref.sourceField : ""} → ${ref.target}${ref.targetField ? "." + ref.targetField : ""}.`,
      });
      continue;
    }
    const base = {
      source: s.id,
      target: t.id,
      sourceField: sf?.id || "",
      targetField: tf?.id || "",
      cardinality: ref.cardinality,
      label: ref.label,
    };
    const matches = (r: Relationship) =>
      r.source === base.source &&
      r.target === base.target &&
      r.sourceField === base.sourceField &&
      r.targetField === base.targetField &&
      r.cardinality === base.cardinality;
    if (relationships.some(matches)) {
      errors.push({
        line: ref.line,
        message:
          "This relationship is already defined. Keep either the inline ref or the Ref line.",
      });
      continue;
    }
    relationships.push({
      id: previous.relationships.find(matches)?.id || uid(),
      ...base,
    });
    if (ref.cardinality === "N:1" && sf) sf.fk = true;
    if (ref.cardinality === "1:N" && tf) tf.fk = true;
  }
  return errors.length
    ? { ok: false, errors }
    : { ok: true, model: { entities, relationships } };
}

export function serializeSchema(model: Model): string {
  const blocks = model.entities.map((e) => {
    const fields = e.fields.map((f) => {
      const attrs = [
        f.pk && "pk",
        f.fk && "fk",
        f.notes && `note: ${JSON.stringify(f.notes)}`,
      ].filter(Boolean);
      return `  ${quoteName(f.name)} ${f.type || '""'}${attrs.length ? ` [${attrs.join(", ")}]` : ""}`;
    });
    if (e.notes) fields.push(`  Note: ${JSON.stringify(e.notes)}`);
    return `Table ${quoteName(e.name)} {\n${fields.join("\n")}\n}`;
  });
  for (const r of model.relationships) {
    const source = model.entities.find((e) => e.id === r.source)!,
      target = model.entities.find((e) => e.id === r.target)!;
    const sf = source.fields.find((f) => f.id === r.sourceField),
      tf = target.fields.find((f) => f.id === r.targetField);
    blocks.push(
      `Ref: ${quoteName(source.name)}${sf ? "." + quoteName(sf.name) : ""} ${operators[r.cardinality]} ${quoteName(target.name)}${tf ? "." + quoteName(tf.name) : ""}${r.label ? ` [note: ${JSON.stringify(r.label)}]` : ""}`,
    );
  }
  return blocks.join("\n\n");
}
