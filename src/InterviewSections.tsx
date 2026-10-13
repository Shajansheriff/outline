import { useRef } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { Requirements } from "./Requirements";
import { DeleteButton, IconButton } from "./ui";
import { uid, type Design } from "./model";

type Props = {
  design: Design;
  edit: (recipe: (d: Design) => void, deletion?: boolean) => void;
};

function Notes({
  title,
  hint,
  value,
  onChange,
  mono = false,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="interview-notes">
      <h3>{title}</h3>
      <p>{hint}</p>
      <textarea
        className={mono ? "notes-mono" : ""}
        aria-label={title}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        rows={6}
      />
    </div>
  );
}
export function Scope({ design, edit }: Props) {
  return (
    <>
      <p className="stage-hint">
        Agree on what to build and the qualities that matter. Check each
        requirement as you cover it.
      </p>
      <Requirements design={design} edit={edit} />
      {design.capacity?.enabled && (
        <Notes
          title="Capacity planning"
          mono
          hint="Assumptions → rough estimates → design implications. E.g. daily users, peak requests/sec, storage, bandwidth."
          value={design.capacity.notes}
          onChange={(value) =>
            edit((d) => {
              d.capacity.notes = value;
            })
          }
        />
      )}
      <Notes
        title="Scope scratchpad"
        hint="Clarifications, assumptions, and what is out of scope…"
        value={design.scopeNotes ?? ""}
        onChange={(value) =>
          edit((d) => {
            d.scopeNotes = value;
          })
        }
      />
    </>
  );
}
export function Discussion({ design, edit }: Props) {
  return (
    <Notes
      title="Discussion notes"
      hint="Trade-offs, bottlenecks, failure cases, follow-up questions, and ideas to revisit…"
      value={design.discussionNotes ?? ""}
      onChange={(value) =>
        edit((d) => {
          d.discussionNotes = value;
        })
      }
    />
  );
}
export function DataFlow({ design, edit }: Props) {
  const focusId = useRef("");
  const steps = design.dataFlow ?? [];
  function add(after = steps.length - 1) {
    const id = uid();
    focusId.current = id;
    edit((d) => {
      d.dataFlow ??= [];
      d.dataFlow.splice(after + 1, 0, {
        id,
        title: "",
        details: "",
        output: "",
      });
    });
  }
  return (
    <div className="data-flow-editor">
      <p className="stage-hint">
        Trace the journey from input to output. Enter adds the next step; use
        High Level Design for components and branching connections.
      </p>
      {steps.length > 0 && (
        <ol className="flow-overview" aria-label="Data flow overview">
          {steps.map((step, i) => (
            <li key={step.id}>
              <a href={`#flow-step-${step.id}`}>
                <span>{i + 1}</span>
                {step.title || "Untitled step"}
              </a>
              {i < steps.length - 1 && <ArrowDown size={16} />}
            </li>
          ))}
        </ol>
      )}
      {steps.map((step, i) => (
        <div className="flow-step" key={step.id} id={`flow-step-${step.id}`}>
          <div className="flow-step-heading">
            <span className="step-number">{i + 1}</span>
            <input
              aria-label={`Flow step ${i + 1} title`}
              placeholder="E.g. Receive ride request"
              value={step.title}
              ref={(el) => {
                if (el && focusId.current === step.id) {
                  el.focus();
                  focusId.current = "";
                }
              }}
              onChange={(e) =>
                edit((d) => {
                  d.dataFlow[i].title = e.target.value;
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(i);
                }
              }}
            />
            <IconButton
              label={`Move flow step ${i + 1} up`}
              disabled={i === 0}
              onClick={() =>
                edit((d) => {
                  [d.dataFlow[i - 1], d.dataFlow[i]] = [
                    d.dataFlow[i],
                    d.dataFlow[i - 1],
                  ];
                })
              }
            >
              <ArrowUp size={14} />
            </IconButton>
            <IconButton
              label={`Move flow step ${i + 1} down`}
              disabled={i === steps.length - 1}
              onClick={() =>
                edit((d) => {
                  [d.dataFlow[i + 1], d.dataFlow[i]] = [
                    d.dataFlow[i],
                    d.dataFlow[i + 1],
                  ];
                })
              }
            >
              <ArrowDown size={14} />
            </IconButton>
            <DeleteButton
              label={`Delete flow step ${i + 1}`}
              onClick={() =>
                edit((d) => {
                  d.dataFlow.splice(i, 1);
                }, true)
              }
            />
          </div>
          <textarea
            aria-label={`Flow step ${i + 1} details`}
            rows={2}
            placeholder="Input, transformation, validation, or decision…"
            value={step.details}
            onChange={(e) =>
              edit((d) => {
                d.dataFlow[i].details = e.target.value;
              })
            }
          />
          <label className="flow-output">
            Output →
            <input
              aria-label={`Flow step ${i + 1} output`}
              placeholder="Data passed to the next step"
              value={step.output}
              onChange={(e) =>
                edit((d) => {
                  d.dataFlow[i].output = e.target.value;
                })
              }
            />
          </label>
        </div>
      ))}
      <button className="button button-small" onClick={() => add()}>
        <Plus size={15} />
        Add flow step
      </button>
    </div>
  );
}
