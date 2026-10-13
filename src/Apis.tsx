import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Code2 } from "lucide-react";
import { newEndpoint, uid, type Design, type Endpoint } from "./model";
import { AddButton, DeleteButton, IconButton, type EditDesign } from "./ui";
import { JsonEditor } from "./JsonEditor";

export function Apis({ design, edit }: { design: Design; edit: EditDesign }) {
  const [focus, setFocus] = useState("");
  const patch = (id: string, recipe: (e: Endpoint) => void, deletion = false) =>
    edit((d) => recipe(d.endpoints.find((e) => e.id === id)!), deletion);
  function add() {
    const endpoint = newEndpoint();
    setFocus(endpoint.id);
    edit((d) => {
      d.endpoints.push(endpoint);
    });
  }
  return (
    <div className="apis-content">
      {design.endpoints.length === 0 && (
        <div className="section-empty">
          <Code2 size={25} />
          <h3>Give your system an interface</h3>
          <p>Describe endpoints, request bodies, and responses as you talk.</p>
        </div>
      )}
      {design.endpoints.map((endpoint, index) => (
        <article className="endpoint-card" key={endpoint.id}>
          <div className="endpoint-header">
            <IconButton
              label={
                endpoint.collapsed ? "Expand endpoint" : "Collapse endpoint"
              }
              onClick={() =>
                patch(endpoint.id, (e) => {
                  e.collapsed = !e.collapsed;
                })
              }
            >
              {endpoint.collapsed ? (
                <ChevronRight size={17} />
              ) : (
                <ChevronDown size={17} />
              )}
            </IconButton>
            <select
              aria-label={`HTTP method ${index + 1}`}
              className={`method-select method-${endpoint.method.toLowerCase()}`}
              value={endpoint.method}
              onChange={(e) =>
                patch(endpoint.id, (x) => {
                  x.method = e.target.value;
                })
              }
            >
              {[
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "HEAD",
                "OPTIONS",
                ...(![
                  "GET",
                  "POST",
                  "PUT",
                  "PATCH",
                  "DELETE",
                  "HEAD",
                  "OPTIONS",
                ].includes(endpoint.method)
                  ? [endpoint.method]
                  : []),
              ].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input
              className="endpoint-path"
              aria-label={`Endpoint path ${index + 1}`}
              placeholder="/ride-request"
              value={endpoint.path}
              autoFocus={focus === endpoint.id}
              onChange={(e) =>
                patch(endpoint.id, (x) => {
                  x.path = e.target.value;
                })
              }
            />
            <input
              className="endpoint-title"
              aria-label={`Endpoint title ${index + 1}`}
              placeholder="Endpoint title"
              value={endpoint.title}
              onChange={(e) =>
                patch(endpoint.id, (x) => {
                  x.title = e.target.value;
                })
              }
            />
            <IconButton
              label="Duplicate endpoint"
              onClick={() => {
                const copy = structuredClone(endpoint);
                copy.id = uid();
                copy.responses.forEach((r) => {
                  r.id = uid();
                });
                copy.collapsed = false;
                setFocus(copy.id);
                edit((d) => {
                  d.endpoints.splice(index + 1, 0, copy);
                });
              }}
            >
              <Copy size={15} />
            </IconButton>
            <DeleteButton
              label="Delete endpoint"
              onClick={() =>
                edit((d) => {
                  d.endpoints.splice(index, 1);
                }, true)
              }
            />
          </div>
          {!endpoint.collapsed && (
            <div className="endpoint-body">
              <textarea
                className="description-input"
                rows={1}
                aria-label={`Endpoint description ${index + 1}`}
                placeholder="What does this endpoint do? (optional)"
                value={endpoint.description}
                onChange={(e) =>
                  patch(endpoint.id, (x) => {
                    x.description = e.target.value;
                  })
                }
              />
              <details
                className="parameter-details"
                open={endpoint.parameters ? true : undefined}
              >
                <summary>Query parameters & headers</summary>
                <textarea
                  aria-label={`Parameters and headers ${index + 1}`}
                  placeholder="e.g. Authorization: Bearer token"
                  value={endpoint.parameters}
                  onChange={(e) =>
                    patch(endpoint.id, (x) => {
                      x.parameters = e.target.value;
                    })
                  }
                />
              </details>
              <div className="api-editors">
                <div>
                  <JsonEditor
                    label={`Request body ${index + 1}`}
                    value={endpoint.request}
                    onChange={(value) =>
                      patch(endpoint.id, (e) => {
                        e.request = value;
                      })
                    }
                  />
                </div>
                <div className="response-list">
                  {endpoint.responses.map((response, ri) => (
                    <div className="response-card" key={response.id}>
                      <div className="response-heading">
                        <span className="tiny-label">RESPONSE</span>
                        <input
                          aria-label={`Response status ${index + 1}.${ri + 1}`}
                          placeholder="200"
                          autoFocus={focus === response.id}
                          value={response.status}
                          onChange={(e) =>
                            patch(endpoint.id, (x) => {
                              x.responses[ri].status = e.target.value;
                            })
                          }
                        />
                        <input
                          className="response-description"
                          aria-label={`Response description ${index + 1}.${ri + 1}`}
                          placeholder="e.g. Ride requested"
                          value={response.description}
                          onChange={(e) =>
                            patch(endpoint.id, (x) => {
                              x.responses[ri].description = e.target.value;
                            })
                          }
                        />
                        <DeleteButton
                          label="Delete response"
                          onClick={() =>
                            patch(
                              endpoint.id,
                              (e) => {
                                e.responses.splice(ri, 1);
                              },
                              true,
                            )
                          }
                        />
                      </div>
                      <JsonEditor
                        label={`Response body ${index + 1}.${ri + 1}`}
                        value={response.body}
                        onChange={(value) =>
                          patch(endpoint.id, (x) => {
                            x.responses[ri].body = value;
                          })
                        }
                      />
                    </div>
                  ))}
                  <AddButton
                    onClick={() => {
                      const response = {
                        id: uid(),
                        status: "",
                        description: "",
                        body: "",
                      };
                      setFocus(response.id);
                      patch(endpoint.id, (e) => {
                        e.responses.push(response);
                      });
                    }}
                  >
                    Add response
                  </AddButton>
                </div>
              </div>
            </div>
          )}
        </article>
      ))}
      <AddButton onClick={add}>Add endpoint</AddButton>
    </div>
  );
}
