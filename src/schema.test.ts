import { describe, expect, it } from "vitest";
import { parseSchema, serializeSchema } from "./schema";
import { newDesign, parseDesign, toMarkdown } from "./model";

const schema = `Table riders {
  id uuid [pk]
  name varchar(255) [note: "Visible name, not unique"]
}

Table rides {
  id uuid [pk]
  rider_id uuid [ref: > riders.id]
  location jsonb
  tags text[]
}`;
function model(source = schema) {
  const result = parseSchema(source);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.model;
}
describe("schema drafts", () => {
  it("parses field types, key markers, notes and inline foreign keys", () => {
    const result = model();
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].fields[0].pk).toBe(true);
    expect(result.entities[0].fields[1]).toMatchObject({
      type: "varchar(255)",
      notes: "Visible name, not unique",
    });
    expect(result.entities[1].fields[1].fk).toBe(true);
    expect(result.entities[1].fields[3].type).toBe("text[]");
    expect(result.relationships[0]).toMatchObject({
      source: result.entities[1].id,
      target: result.entities[0].id,
      sourceField: result.entities[1].fields[1].id,
      targetField: result.entities[0].fields[0].id,
      cardinality: "N:1",
    });
  });
  it.each([
    ["<", "1:N"],
    [">", "N:1"],
    ["-", "1:1"],
    ["<>", "N:N"],
  ])("supports standalone %s relationships", (operator, cardinality) => {
    const result = model(
      `Table a {\n id uuid [pk]\n}\nTable b {\n id uuid [pk]\n}\nRef: a.id ${operator} b.id [note: "connects"]`,
    );
    expect(result.relationships[0]).toMatchObject({
      cardinality,
      label: "connects",
    });
  });
  it("resolves references defined before their tables and self references", () => {
    expect(
      model(
        "Ref: users.manager_id > users.id\nTable users {\n id uuid [pk]\n manager_id uuid\n}",
      ).relationships,
    ).toHaveLength(1);
  });
  it("round-trips existing models and preserves stable IDs", () => {
    const previous = model();
    const result = parseSchema(serializeSchema(previous), previous);
    expect(result.ok && result.model).toEqual(previous);
  });
  it("supports quoted names, escaped notes, entity references, and comments", () => {
    const result = model(
      'Table "Trip history" {\n "trip id" uuid [pk, note: "uses https://host/a, \\"quoted\\" text"] // a comment\n Note: "Past trips"\n}\nTable drivers {}\nRef: "Trip history" > drivers',
    );
    expect(result.entities[0].notes).toBe("Past trips");
    expect(result.entities[0].fields[0].notes).toBe(
      'uses https://host/a, "quoted" text',
    );
    expect(parseSchema(serializeSchema(result), result)).toEqual({
      ok: true,
      model: result,
    });
  });
  it("returns line-specific errors for incomplete drafts without mutating the previous model", () => {
    const previous = model(),
      snapshot = structuredClone(previous);
    const result = parseSchema("Table unfinished {\n id uuid [pk]", previous);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ line: 1 });
    expect(previous).toEqual(snapshot);
  });
  it.each([
    ["Table a {}\nTable a {}", "more than once"],
    ["Table a {\n id uuid\n id text\n}", "more than once"],
    ["Table a {\n id uuid [unique]\n}", "Unknown field option"],
    ["Table a {\n id uuid [ref: > missing.id]\n}", "undefined table or field"],
    ["CREATE TABLE riders (id uuid);", "Start a table"],
    ["Table a {}\nTable b {}\nRef: a < b\nRef: a < b", "already defined"],
  ])("rejects invalid schema safely: %s", (source, message) => {
    const result = parseSchema(source);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((e) => e.message.includes(message))).toBe(true);
  });
  it("loads older files with empty schema and SQL defaults", () => {
    const { schemaDraft, schemaApplied, sqlNotes, ...legacy } = newDesign();
    expect(parseDesign(JSON.stringify(legacy))).toMatchObject({
      schemaDraft: null,
      schemaApplied: null,
      sqlNotes: "",
    });
  });
  it("preserves incomplete schema/SQL in backups and Markdown", () => {
    const d = newDesign();
    d.sections = [{ kind: "models", collapsed: false }];
    d.schemaDraft = "Table rides {";
    d.sqlNotes = "-- rough query\nSELECT * FROM rides WHERE";
    expect(parseDesign(JSON.stringify(d))).toEqual(d);
    expect(toMarkdown(d)).toContain(
      "```sql\n-- rough query\nSELECT * FROM rides WHERE",
    );
    expect(toMarkdown(d)).toContain("Table rides {");
  });
});
