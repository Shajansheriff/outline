import { useState } from "react";
import { ArrowRight, Copy, Database, Link2 } from "lucide-react";
import {
  newField,
  removeEntity,
  removeField,
  uid,
  type Design,
  type Entity,
  type Relationship,
} from "./model";
import { AddButton, DeleteButton, IconButton, type EditDesign } from "./ui";

export function EntityCards({
  design,
  edit,
}: {
  design: Design;
  edit: EditDesign;
}) {
  const [focus, setFocus] = useState("");
  const patch = (id: string, recipe: (e: Entity) => void) =>
    edit((d) => recipe(d.entities.find((e) => e.id === id)!));
  function addEntity() {
    const entity: Entity = { id: uid(), name: "", notes: "", fields: [] };
    setFocus(entity.id);
    edit((d) => {
      d.entities.push(entity);
    });
  }
  function addField(entityId: string, after?: number) {
    const field = newField();
    setFocus(field.id);
    patch(entityId, (e) => {
      e.fields.splice(
        after === undefined ? e.fields.length : after + 1,
        0,
        field,
      );
    });
  }
  const relationshipPatch = (id: string, recipe: (r: Relationship) => void) =>
    edit((d) => recipe(d.relationships.find((r) => r.id === id)!));
  return (
    <div className="models-content">
      {design.entities.length === 0 && (
        <div className="section-empty">
          <Database size={25} />
          <h3>Start with the things that matter</h3>
          <p>
            Add entities, sketch their fields, then describe how they relate.
          </p>
        </div>
      )}
      <div className="entities-grid">
        {design.entities.map((entity, ei) => (
          <article className="entity-card" key={entity.id}>
            <div className="entity-header">
              <Database size={17} />
              <input
                aria-label={`Entity name ${ei + 1}`}
                placeholder="Entity name"
                value={entity.name}
                autoFocus={focus === entity.id}
                onChange={(e) =>
                  patch(entity.id, (x) => {
                    x.name = e.target.value;
                  })
                }
              />
              <IconButton
                label="Duplicate entity"
                onClick={() => {
                  const copy = structuredClone(entity);
                  copy.id = uid();
                  copy.fields.forEach((f) => {
                    f.id = uid();
                  });
                  copy.name = `${copy.name || "Entity"} copy`;
                  setFocus(copy.id);
                  edit((d) => {
                    d.entities.splice(ei + 1, 0, copy);
                  });
                }}
              >
                <Copy size={14} />
              </IconButton>
              <DeleteButton
                label="Delete entity"
                onClick={() => edit((d) => removeEntity(d, entity.id), true)}
              />
            </div>
            <input
              className="entity-notes"
              aria-label={`Entity notes ${ei + 1}`}
              placeholder="SQL table, document, or a quick note…"
              value={entity.notes}
              onChange={(e) =>
                patch(entity.id, (x) => {
                  x.notes = e.target.value;
                })
              }
            />
            <div className="field-table">
              <div className="field-row field-head">
                <span>FIELD</span>
                <span>TYPE</span>
                <span>PK</span>
                <span>FK</span>
                <span>NOTES</span>
                <span />
              </div>
              {entity.fields.map((field, fi) => (
                <div className="field-row" key={field.id}>
                  <input
                    aria-label={`Field name ${ei + 1}.${fi + 1}`}
                    placeholder="id"
                    value={field.name}
                    autoFocus={focus === field.id}
                    onChange={(e) =>
                      patch(entity.id, (x) => {
                        x.fields[fi].name = e.target.value;
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addField(entity.id, fi);
                      }
                    }}
                  />
                  <input
                    aria-label={`Field type ${ei + 1}.${fi + 1}`}
                    placeholder="uuid"
                    value={field.type}
                    onChange={(e) =>
                      patch(entity.id, (x) => {
                        x.fields[fi].type = e.target.value;
                      })
                    }
                  />
                  <input
                    type="checkbox"
                    aria-label={`Primary key ${ei + 1}.${fi + 1}`}
                    checked={field.pk}
                    onChange={(e) =>
                      patch(entity.id, (x) => {
                        x.fields[fi].pk = e.target.checked;
                      })
                    }
                  />
                  <input
                    type="checkbox"
                    aria-label={`Foreign key ${ei + 1}.${fi + 1}`}
                    checked={field.fk}
                    onChange={(e) =>
                      patch(entity.id, (x) => {
                        x.fields[fi].fk = e.target.checked;
                      })
                    }
                  />
                  <input
                    aria-label={`Field notes ${ei + 1}.${fi + 1}`}
                    placeholder="optional"
                    value={field.notes}
                    onChange={(e) =>
                      patch(entity.id, (x) => {
                        x.fields[fi].notes = e.target.value;
                      })
                    }
                  />
                  <DeleteButton
                    label="Delete field"
                    onClick={() =>
                      edit((d) => removeField(d, entity.id, field.id), true)
                    }
                  />
                </div>
              ))}
            </div>
            <AddButton onClick={() => addField(entity.id)}>Add field</AddButton>
          </article>
        ))}
      </div>
      <AddButton onClick={addEntity}>Add entity</AddButton>
      <div className="relationships">
        <div className="group-heading">
          <h3>
            <Link2 size={16} />
            Relationships
          </h3>
          <span className="count">
            {design.relationships.length} connections
          </span>
        </div>
        {design.relationships.map((r, index) => (
          <div className="relationship-row" key={r.id}>
            <div className="relationship-end">
              <select
                aria-label={`Relationship source ${index + 1}`}
                value={r.source}
                onChange={(e) =>
                  relationshipPatch(r.id, (x) => {
                    x.source = e.target.value;
                    x.sourceField = "";
                  })
                }
              >
                {design.entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name || "Untitled entity"}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Source field ${index + 1}`}
                value={r.sourceField}
                onChange={(e) =>
                  relationshipPatch(r.id, (x) => {
                    x.sourceField = e.target.value;
                  })
                }
              >
                <option value="">Entity level</option>
                {design.entities
                  .find((e) => e.id === r.source)
                  ?.fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name || "Untitled field"}
                    </option>
                  ))}
              </select>
            </div>
            <ArrowRight size={17} />
            <div className="relationship-end">
              <select
                aria-label={`Relationship target ${index + 1}`}
                value={r.target}
                onChange={(e) =>
                  relationshipPatch(r.id, (x) => {
                    x.target = e.target.value;
                    x.targetField = "";
                  })
                }
              >
                {design.entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name || "Untitled entity"}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Target field ${index + 1}`}
                value={r.targetField}
                onChange={(e) =>
                  relationshipPatch(r.id, (x) => {
                    x.targetField = e.target.value;
                  })
                }
              >
                <option value="">Entity level</option>
                {design.entities
                  .find((e) => e.id === r.target)
                  ?.fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name || "Untitled field"}
                    </option>
                  ))}
              </select>
            </div>
            <select
              aria-label={`Cardinality ${index + 1}`}
              value={r.cardinality}
              onChange={(e) =>
                relationshipPatch(r.id, (x) => {
                  x.cardinality = e.target.value as Relationship["cardinality"];
                })
              }
            >
              {["1:1", "1:N", "N:1", "N:N"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              aria-label={`Relationship label ${index + 1}`}
              placeholder="e.g. requests"
              value={r.label}
              onChange={(e) =>
                relationshipPatch(r.id, (x) => {
                  x.label = e.target.value;
                })
              }
            />
            <DeleteButton
              label="Delete relationship"
              onClick={() =>
                edit((d) => {
                  d.relationships.splice(index, 1);
                }, true)
              }
            />
          </div>
        ))}
        {design.entities.length < 2 ? (
          <p className="helper">
            Add at least two entities to describe a relationship.
          </p>
        ) : (
          <AddButton
            onClick={() =>
              edit((d) => {
                d.relationships.push({
                  id: uid(),
                  source: d.entities[0].id,
                  target: d.entities[1].id,
                  sourceField: "",
                  targetField: "",
                  cardinality: "1:N",
                  label: "",
                });
              })
            }
          >
            Add relationship
          </AddButton>
        )}
      </div>
    </div>
  );
}
