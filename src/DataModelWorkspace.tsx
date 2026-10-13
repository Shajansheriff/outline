import { useRef, useState } from "react";
import {
  Braces,
  Code2,
  Database,
  GitBranch,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Design } from "./model";
import type { EditDesign } from "./ui";
import { EntityCards } from "./Models";
import { CodeEditor, type CodeEditorHandle } from "./CodeEditor";
import { ModelDiagram } from "./ModelDiagram";
import { parseSchema, serializeSchema } from "./schema";

const example = `Table riders {
  id uuid [pk]
  name text
}

Table rides {
  id uuid [pk]
  rider_id uuid [ref: > riders.id]
  status text
  created_at timestamp
}`;
const snippets = {
  SELECT:
    "-- Find the records we need\nSELECT *\nFROM table_name\nWHERE condition\nLIMIT 20;",
  JOIN: "-- Combine related entities\nSELECT a.id, b.*\nFROM table_a a\nJOIN table_b b ON b.a_id = a.id\nWHERE condition;",
  Transaction:
    "-- Keep the operation atomic\nBEGIN;\n\nUPDATE table_name\nSET column_name = value\nWHERE id = :id;\n\nCOMMIT;",
};
export function Models({ design, edit }: { design: Design; edit: EditDesign }) {
  const [mode, setMode] = useState<"schema" | "cards">("schema");
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const schemaEditor = useRef<CodeEditorHandle>(null),
    sqlEditor = useRef<CodeEditorHandle>(null);
  const text = design.schemaDraft ?? serializeSchema(design);
  const dirty =
    design.schemaDraft != null && design.schemaDraft !== design.schemaApplied;
  function updateText(value: string) {
    setErrors([]);
    edit((d) => {
      d.schemaDraft = value;
    });
  }
  function generate() {
    const result = parseSchema(text, design);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const removed =
      design.entities.some(
        (e) =>
          !result.model.entities.some((n) => n.id === e.id) ||
          e.fields.some(
            (f) =>
              !result.model.entities
                .find((n) => n.id === e.id)
                ?.fields.some((n) => n.id === f.id),
          ),
      ) ||
      design.relationships.some(
        (r) => !result.model.relationships.some((n) => n.id === r.id),
      );
    edit((d) => {
      d.entities = result.model.entities;
      d.relationships = result.model.relationships;
      d.schemaDraft = text;
      d.schemaApplied = text;
    }, removed);
    setErrors([]);
  }
  const cardEdit: EditDesign = (recipe, deletion) => {
    edit((d) => {
      recipe(d);
      d.schemaDraft = null;
      d.schemaApplied = null;
    }, deletion);
  };
  function appendSchema(chunk: string) {
    updateText(`${text.trimEnd()}${text.trim() ? "\n\n" : ""}${chunk}`);
    requestAnimationFrame(() => schemaEditor.current?.focusEnd());
  }
  function insertTable() {
    let number = 1;
    while (new RegExp(`\\bentity_${number}\\b`).test(text)) number++;
    appendSchema(`Table entity_${number} {\n  id uuid [pk]\n  \n}`);
  }
  function insertReference() {
    const parsed = parseSchema(text, design);
    const entities = parsed.ok ? parsed.model.entities : design.entities;
    appendSchema(
      entities.length >= 2
        ? `Ref: ${JSON.stringify(entities[0].name)} < ${JSON.stringify(entities[1].name)}`
        : "Ref: table_a.id < table_b.a_id",
    );
  }
  return (
    <div className="data-model-workspace">
      <div className="model-mode-bar">
        <div
          className="model-tabs"
          role="group"
          aria-label="Data modeling view"
        >
          <button
            aria-pressed={mode === "schema"}
            onClick={() => setMode("schema")}
          >
            <Braces size={14} />
            Schema + diagram
          </button>
          <button
            aria-pressed={mode === "cards"}
            onClick={() => setMode("cards")}
          >
            <Database size={14} />
            Table editor
          </button>
        </div>
        <span className="model-view-hint">
          Describe your schema. See the relationships.
        </span>
      </div>
      {mode === "schema" ? (
        <>
          <div className="schema-workbench">
            <div className="schema-pane">
              <div className="model-pane-header">
                <span>
                  <Code2 size={15} />
                  Schema definition
                </span>
                <div>
                  <button className="toolbar-button" onClick={insertTable}>
                    <Plus size={13} />
                    Table
                  </button>
                  <button className="toolbar-button" onClick={insertReference}>
                    <GitBranch size={13} />
                    Reference
                  </button>
                </div>
              </div>
              <CodeEditor
                ref={schemaEditor}
                label="Schema definition"
                value={text}
                onChange={updateText}
                onGenerate={generate}
                placeholder={example}
              />
              <div className="schema-actions">
                <span className={dirty ? "schema-pending" : ""}>
                  {dirty
                    ? "Draft saved · diagram not updated yet"
                    : design.entities.length
                      ? "Diagram is up to date"
                      : "Start typing or insert a table"}
                </span>
                <button
                  className="generate-button"
                  onClick={generate}
                  disabled={!text.trim() && !design.entities.length}
                >
                  <Sparkles size={14} />
                  Generate diagram<kbd>⌘ / Ctrl ↵</kbd>
                </button>
              </div>
              {errors.length > 0 && (
                <div className="schema-errors" role="alert">
                  <strong>Keep going — your last diagram is unchanged.</strong>
                  {errors.map((error, i) => (
                    <div key={i}>
                      Line {error.line}: {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ModelDiagram
              entities={design.entities}
              relationships={design.relationships}
            />
          </div>
          <details className="schema-help">
            <summary>Schema syntax & examples</summary>
            <div className="schema-help-content">
              <pre>{example}</pre>
              <div>
                <p>
                  One field per line. Use <code>[pk]</code> for a primary key
                  and <code>[ref: &gt; riders.id]</code> to connect a foreign
                  key.
                </p>
                <p>Or write a standalone reference:</p>
                <code>Ref: riders.id &lt; rides.rider_id</code>
                <p>
                  <code>&lt;</code> one-to-many · <code>&gt;</code> many-to-one
                  <br />
                  <code>-</code> one-to-one · <code>&lt;&gt;</code> many-to-many
                </p>
                <p>
                  Add <code>[note: "description"]</code> to a field or
                  reference, <code>Note: "..."</code> inside a table, and{" "}
                  <code>// comments</code> anywhere outside quoted text. Quote
                  names containing spaces.
                </p>
                <p>
                  <kbd>Tab</kbd> indents. <kbd>Esc</kbd> then <kbd>Tab</kbd>{" "}
                  leaves the editor. <kbd>⌘ / Ctrl Enter</kbd> generates the
                  diagram.
                </p>
                <span className="helper">
                  This is a compact schema notation, not a SQL DDL parser. Write
                  SQL below.
                </span>
              </div>
            </div>
          </details>
        </>
      ) : (
        <>
          {dirty && (
            <div className="schema-draft-banner">
              <span>
                You have an unapplied schema draft. Generate it before editing
                tables, or return to the last generated schema.
              </span>
              <button
                className="toolbar-button"
                onClick={() => setMode("schema")}
              >
                Review draft
              </button>
              <button
                className="toolbar-button"
                onClick={() => {
                  edit((d) => {
                    d.schemaDraft = d.schemaApplied;
                  });
                  setErrors([]);
                }}
              >
                <RotateCcw size={13} />
                Discard draft
              </button>
            </div>
          )}
          <fieldset
            className="model-card-fieldset"
            disabled={dirty}
            aria-label="Entity tables"
          >
            <EntityCards design={design} edit={cardEdit} />
          </fieldset>
        </>
      )}
      <div className="sql-scratchpad">
        <div className="sql-heading">
          <div>
            <h3>
              <Code2 size={17} />
              SQL scratchpad
            </h3>
            <p>
              Sketch the query, explain a join, or walk through a transaction.
            </p>
          </div>
          <span>Notes only · never executed</span>
        </div>
        <div className="sql-editor-frame">
          <div className="model-pane-header">
            <span>SQL / PSEUDOCODE</span>
            <div>
              {(Object.keys(snippets) as (keyof typeof snippets)[]).map(
                (name) => (
                  <button
                    className="toolbar-button"
                    key={name}
                    onClick={() => {
                      edit((d) => {
                        const current = d.sqlNotes ?? "";
                        d.sqlNotes = `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${snippets[name]}\n`;
                      });
                      requestAnimationFrame(() =>
                        sqlEditor.current?.focusEnd(),
                      );
                    }}
                  >
                    <Plus size={12} />
                    {name}
                  </button>
                ),
              )}
            </div>
          </div>
          <CodeEditor
            ref={sqlEditor}
            language="sql"
            label="SQL scratchpad"
            value={design.sqlNotes ?? ""}
            onChange={(value) =>
              edit((d) => {
                d.sqlNotes = value;
              })
            }
            placeholder={
              "-- Write rough SQL or describe the approach here.\n-- Incomplete statements are welcome."
            }
          />
          <div className="model-pane-footer">
            Freeform notes · saved with this design
            <span>SQL highlighting · Tab to indent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
