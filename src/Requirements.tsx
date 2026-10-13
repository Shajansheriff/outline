import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { newRequirement, type Design } from "./model";
import { AddButton, DeleteButton, IconButton, type EditDesign } from "./ui";

export function Requirements({
  design,
  edit,
}: {
  design: Design;
  edit: EditDesign;
}) {
  const [focus, setFocus] = useState("");
  const inputs = useRef(new Map<string, HTMLInputElement>());
  function add(group: "functional" | "nonFunctional", after?: number) {
    const item = newRequirement();
    setFocus(item.id);
    edit((d) => {
      d.requirements[group].splice(
        after === undefined ? d.requirements[group].length : after + 1,
        0,
        item,
      );
    });
  }
  return (
    <div className="requirements-grid">
      {(["functional", "nonFunctional"] as const).map((group) => {
        const rows = design.requirements[group],
          count = rows.filter((r) => r.checked).length;
        return (
          <div className="requirement-group" key={group}>
            <div className="group-heading">
              <h3>
                {group === "functional" ? "Functional" : "Non-functional"}
              </h3>
              <span className="count">
                {count} / {rows.length} covered
              </span>
            </div>
            <p className="helper">
              {group === "functional"
                ? "What should the system do?"
                : "How well should it do it?"}
            </p>
            {rows.length === 0 && (
              <div className="empty-list">
                {group === "functional"
                  ? "Capture the user’s needs, one at a time."
                  : "Think scale, latency, availability…"}
              </div>
            )}
            <div className="requirement-list">
              {rows.map((row, i) => (
                <div
                  className={`requirement-row ${row.checked ? "covered" : ""}`}
                  key={row.id}
                >
                  <label className="check-control">
                    <input
                      type="checkbox"
                      checked={row.checked}
                      aria-label={`Covered: ${row.text || "requirement"}`}
                      onChange={(e) =>
                        edit((d) => {
                          d.requirements[group][i].checked = e.target.checked;
                        })
                      }
                    />
                    <span>
                      <Check size={12} />
                    </span>
                  </label>
                  <input
                    aria-label={`${group === "functional" ? "Functional" : "Non-functional"} requirement ${i + 1}`}
                    placeholder={
                      group === "functional"
                        ? "e.g. Request a ride"
                        : "e.g. Match a driver in under 2 seconds"
                    }
                    value={row.text}
                    autoFocus={focus === row.id}
                    ref={(el) => {
                      if (el) inputs.current.set(row.id, el);
                      else inputs.current.delete(row.id);
                    }}
                    onChange={(e) =>
                      edit((d) => {
                        d.requirements[group][i].text = e.target.value;
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        add(group, i);
                      }
                      if (e.key === "ArrowUp" && e.altKey) {
                        e.preventDefault();
                        inputs.current.get(rows[i - 1]?.id)?.focus();
                      }
                      if (e.key === "ArrowDown" && e.altKey) {
                        e.preventDefault();
                        inputs.current.get(rows[i + 1]?.id)?.focus();
                      }
                    }}
                  />
                  <div className="row-actions">
                    <IconButton
                      label="Move requirement up"
                      disabled={i === 0}
                      onClick={() =>
                        edit((d) => {
                          const list = d.requirements[group];
                          [list[i - 1], list[i]] = [list[i], list[i - 1]];
                        })
                      }
                    >
                      <ArrowUp size={13} />
                    </IconButton>
                    <IconButton
                      label="Move requirement down"
                      disabled={i === rows.length - 1}
                      onClick={() =>
                        edit((d) => {
                          const list = d.requirements[group];
                          [list[i + 1], list[i]] = [list[i], list[i + 1]];
                        })
                      }
                    >
                      <ArrowDown size={13} />
                    </IconButton>
                    <DeleteButton
                      label="Delete requirement"
                      onClick={() =>
                        edit((d) => {
                          d.requirements[group].splice(i, 1);
                        }, true)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <AddButton onClick={() => add(group)}>
              Add {group === "functional" ? "functional" : "non-functional"}{" "}
              requirement
            </AddButton>
            <div className="input-hint">
              <kbd>Enter</kbd> to add another · Check off as you discuss
            </div>
          </div>
        );
      })}
    </div>
  );
}
