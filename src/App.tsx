import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Keyboard,
  Layers,
  LayoutGrid,
  Network,
  Plus,
  RotateCcw,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { Scope, DataFlow, Discussion } from "./InterviewSections";
import {
  displayTitle,
  parseDesign,
  sectionKinds,
  toMarkdown,
  uid,
  type SectionKind,
} from "./model";
import { DeleteButton, IconButton } from "./ui";
import { createHldExample } from "./hldExample";
import { useWorkspace } from "./useWorkspace";

const Architecture = lazy(() =>
  import("./Architecture").then((m) => ({ default: m.Architecture })),
);
const Apis = lazy(() => import("./Apis").then((m) => ({ default: m.Apis })));
const Models = lazy(() =>
  import("./DataModelWorkspace").then((m) => ({ default: m.Models })),
);

const sectionMeta: Record<
  SectionKind,
  {
    title: string;
    short: string;
    description: string;
    icon: LucideIcon;
    color: string;
  }
> = {
  requirements: {
    title: "Scope",
    short: "Scope",
    description: "Define what matters",
    icon: ClipboardList,
    color: "blue",
  },
  apis: {
    title: "API design",
    short: "APIs",
    description: "Shape the interface",
    icon: Braces,
    color: "purple",
  },
  models: {
    title: "Entities / Data Models",
    short: "Data models",
    description: "Make the data concrete",
    icon: Layers,
    color: "orange",
  },
  dataFlow: {
    title: "Data Flow",
    short: "Data Flow",
    description: "Trace how data moves · optional",
    icon: ArrowDown,
    color: "purple",
  },
  discussion: {
    title: "Discussion / Scratchpad",
    short: "Discussion",
    description: "Capture trade-offs and open questions",
    icon: FileText,
    color: "orange",
  },
  architecture: {
    title: "High Level Design",
    short: "High Level Design",
    description: "Connect the system",
    icon: Network,
    color: "green",
  },
};
function download(
  contents: string,
  title: string,
  extension: string,
  type: string,
) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9_-]/gi, "-").slice(0, 80) || "design"}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function App() {
  const workspace = useWorkspace();
  const { design, designs, ready, edit } = workspace;
  const [activeSection, setActiveSection] = useState<SectionKind | null>(null),
    [addOpen, setAddOpen] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [helpOpen, setHelpOpen] = useState(false),
    [notice, setNotice] = useState("");
  const importInput = useRef<HTMLInputElement>(null),
    titleInput = useRef<HTMLInputElement>(null),
    addMenu = useRef<HTMLDivElement>(null),
    exportMenu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const click = (event: PointerEvent) => {
      if (!addMenu.current?.contains(event.target as Node)) setAddOpen(false);
      if (!exportMenu.current?.contains(event.target as Node))
        setExportOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHelpOpen(false);
        setAddOpen(false);
        setExportOpen(false);
      }
    };
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const sectionKey = design?.sections.map((s) => s.kind).join(",");
  useEffect(() => {
    setActiveSection(null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id as SectionKind);
      },
      { rootMargin: "-90px 0px -55% 0px", threshold: 0 },
    );
    document
      .querySelectorAll(".design-section")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [design?.id, sectionKey]);
  if (!ready || !design)
    return (
      <div className="loading">
        <div className="brand-mark">
          <Network size={20} />
        </div>
        Opening your workspace…
      </div>
    );
  const available = sectionKinds.filter(
    (kind) => !design.sections.some((s) => s.kind === kind),
  );
  function addSection(kind: SectionKind) {
    edit((d) => {
      const next = d.sections.findIndex(
        (s) => sectionKinds.indexOf(s.kind) > sectionKinds.indexOf(kind),
      );
      d.sections.splice(next < 0 ? d.sections.length : next, 0, {
        kind,
        collapsed: false,
      });
    });
    setAddOpen(false);
    requestAnimationFrame(() =>
      document
        .getElementById(kind)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  const totalRequirements =
    design.requirements.functional.length +
    design.requirements.nonFunctional.length;
  const covered = [
    ...design.requirements.functional,
    ...design.requirements.nonFunctional,
  ].filter((r) => r.checked).length;
  const sectionCounts: Record<SectionKind, string> = {
    requirements: `${covered}/${totalRequirements}`,
    apis: String(design.endpoints.length),
    models: String(design.entities.length),
    architecture: String(design.architecture.nodes.length),
    dataFlow: String((design.dataFlow ?? []).length),
    discussion: design.discussionNotes?.trim() ? "•" : "0",
  };
  let sectionContent: Record<SectionKind, ReactNode> = {
    requirements: <Scope design={design} edit={edit} />,
    dataFlow: <DataFlow design={design} edit={edit} />,
    discussion: <Discussion design={design} edit={edit} />,
    apis: (
      <>
        <p className="stage-hint">
          Define the contracts needed by your functional requirements:
          operations, inputs, and responses.
        </p>
        <Apis design={design} edit={edit} />
      </>
    ),
    models: (
      <>
        <p className="stage-hint">
          Start with the core entities your APIs exchange and your system
          persists. Sketch only the fields and relationships needed for this
          discussion.
        </p>
        <Models design={design} edit={edit} />
      </>
    ),
    architecture: (
      <>
        <div className="hld-example-intro">
          <span>Learn how calls, events, queues, and callbacks connect.</span>
          <button
            className="button button-small"
            onClick={() => {
              workspace.add(createHldExample());
              requestAnimationFrame(() =>
                document
                  .getElementById("architecture")
                  ?.scrollIntoView({ block: "start" }),
              );
            }}
          >
            Open sample HLD
          </button>
          <small>Opens a separate editable design</small>
        </div>
        <Architecture design={design} edit={edit} />
      </>
    ),
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-mark">
            <Network size={19} strokeWidth={1.8} />
          </span>
          <span>
            outline<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="sidebar-label">
          YOUR WORKSPACE
          <button
            aria-label="New design"
            title="New design"
            onClick={() => {
              workspace.add();
              requestAnimationFrame(() => titleInput.current?.focus());
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="design-list">
          {designs.map((d) => (
            <button
              key={d.id}
              className={`design-link ${d.id === design.id ? "active" : ""}`}
              onClick={() => {
                workspace.select(d.id);
                window.scrollTo({ top: 0 });
              }}
            >
              <FileText size={15} />
              <span>{displayTitle(d)}</span>
              {d.id === design.id && <span className="active-dot" />}
            </button>
          ))}
        </div>
        <div className="sidebar-divider" />
        <div className="sidebar-label">IN THIS DESIGN</div>
        <nav className="section-nav" aria-label="Design sections">
          {design.sections.length ? (
            design.sections.map((s, index) => {
              const m = sectionMeta[s.kind],
                Icon = m.icon;
              return (
                <a
                  className={activeSection === s.kind ? "active" : ""}
                  key={s.kind}
                  href={`#${s.kind}`}
                  onClick={() => {
                    if (s.collapsed)
                      edit((d) => {
                        d.sections.find((x) => x.kind === s.kind)!.collapsed =
                          false;
                      });
                    setActiveSection(s.kind);
                  }}
                >
                  <Icon size={16} />
                  <span>{m.short}</span>
                  <span className="nav-index">0{index + 1}</span>
                </a>
              );
            })
          ) : (
            <div className="sidebar-empty">
              Your sections will
              <br />
              appear here.
            </div>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setHelpOpen(true)}>
            <Keyboard size={16} />
            Quick guide<span>?</span>
          </button>
          <div className="local-note">
            <span className="local-dot" />
            Private. Saved on this device.
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <LayoutGrid size={15} />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <span>{displayTitle(design)}</span>
          </div>
          <div className="topbar-actions">
            <div className={`save-status ${workspace.saveState}`} role="status">
              {workspace.saveState === "saved" ? (
                <>
                  <CircleCheck size={13} />
                  All changes saved
                </>
              ) : workspace.saveState === "saving" ? (
                <>
                  <span className="saving-dot" />
                  Saving…
                </>
              ) : (
                <button onClick={workspace.retry}>
                  <RotateCcw size={13} />
                  Not saved · Retry
                </button>
              )}
            </div>
            <button
              className="toolbar-button"
              onClick={() => importInput.current?.click()}
            >
              <Upload size={14} />
              Import
            </button>
            <div className="dropdown" ref={exportMenu}>
              <button
                className="button button-small"
                onClick={() => setExportOpen((v) => !v)}
                aria-expanded={exportOpen}
              >
                <Download size={14} />
                Export
                <ChevronDown size={12} />
              </button>
              {exportOpen && (
                <div className="dropdown-menu export-menu">
                  <button
                    onClick={() => {
                      download(
                        JSON.stringify(design, null, 2),
                        displayTitle(design),
                        "json",
                        "application/json",
                      );
                      setExportOpen(false);
                    }}
                  >
                    JSON backup<span>Reopen and continue editing</span>
                  </button>
                  <button
                    onClick={() => {
                      download(
                        toMarkdown(design),
                        displayTitle(design),
                        "md",
                        "text/markdown",
                      );
                      setExportOpen(false);
                    }}
                  >
                    Markdown document<span>Readable notes for later</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="document" key={design.id}>
          {(workspace.loadError || notice) && (
            <div className="notice" role="alert">
              <span>{notice || workspace.loadError}</span>
              {notice && (
                <IconButton
                  label="Dismiss notification"
                  onClick={() => setNotice("")}
                >
                  <X size={15} />
                </IconButton>
              )}
            </div>
          )}
          <div className="document-heading">
            <div className="eyebrow">
              <span />
              SYSTEM DESIGN WORKSPACE
            </div>
            <div className="title-row">
              <input
                className="design-title"
                aria-label="Design title"
                ref={titleInput}
                placeholder="What are we designing?"
                value={design.title}
                onChange={(e) =>
                  edit((d) => {
                    d.title = e.target.value;
                  })
                }
              />
              <div className="document-actions">
                <IconButton
                  label="Duplicate design"
                  onClick={() => {
                    const copy = structuredClone(design);
                    copy.id = uid();
                    copy.title = `${displayTitle(design)} copy`;
                    copy.createdAt = copy.updatedAt = new Date().toISOString();
                    workspace.add(copy);
                  }}
                >
                  <Copy size={16} />
                </IconButton>
                <DeleteButton
                  label="Delete design"
                  onClick={() => workspace.remove(design.id)}
                />
              </div>
            </div>
            <input
              className="document-subtitle subtitle-input"
              aria-label="Design subtitle"
              placeholder="Add context — product, users, and the problem to solve"
              value={design.subtitle ?? ""}
              onChange={(e) =>
                edit((d) => {
                  d.subtitle = e.target.value;
                })
              }
            />
            <div className="framework-options">
              <span>INTERVIEW FRAMEWORK</span>
              <button
                className="button button-small"
                onClick={() =>
                  edit((d) => {
                    d.capacity = {
                      notes: d.capacity?.notes ?? "",
                      enabled: !d.capacity?.enabled,
                    };
                  })
                }
                aria-pressed={design.capacity?.enabled ?? false}
              >
                Capacity planning{" "}
                {design.capacity?.enabled ? "on" : "· optional"}
              </button>
              <button
                className="button button-small"
                aria-pressed={design.sections.some(
                  (s) => s.kind === "dataFlow",
                )}
                onClick={() =>
                  design.sections.some((s) => s.kind === "dataFlow")
                    ? edit((d) => {
                        d.sections = d.sections.filter(
                          (s) => s.kind !== "dataFlow",
                        );
                      })
                    : addSection("dataFlow")
                }
              >
                Data Flow{" "}
                {design.sections.some((s) => s.kind === "dataFlow")
                  ? "on"
                  : "· optional"}
              </button>
            </div>
          </div>
          {design.sections.length > 0 && (
            <div className="document-strip">
              <div>
                {design.sections.map((s) => {
                  const m = sectionMeta[s.kind];
                  return (
                    <a href={`#${s.kind}`} key={s.kind}>
                      <span className={`strip-dot ${m.color}`} />
                      {m.short}
                      <span className="strip-count">
                        {sectionCounts[s.kind]}
                      </span>
                    </a>
                  );
                })}
              </div>
              <span className="document-label">INTERVIEW NOTES</span>
            </div>
          )}
          {design.sections.length === 0 && (
            <div className="blank-workspace">
              <div className="blank-art" aria-hidden="true">
                <div className="art-lines" />
                <div className="art-card art-check">
                  <ClipboardList size={20} />
                  <span />
                  <span />
                </div>
                <div className="art-card art-code">
                  <Braces size={22} />
                  <span />
                  <span />
                </div>
                <div className="art-card art-network">
                  <Network size={22} />
                  <span />
                </div>
              </div>
              <h2>A clear canvas for your thinking.</h2>
              <p>
                Start wherever the conversation takes you.
                <br />
                Add a section and build your design one idea at a time.
              </p>
              <div className="starter-sections">
                {sectionKinds.map((kind) => {
                  const m = sectionMeta[kind],
                    Icon = m.icon;
                  return (
                    <button
                      key={kind}
                      aria-label={m.title}
                      onClick={() => addSection(kind)}
                    >
                      <span className={`starter-icon ${m.color}`}>
                        <Icon size={20} strokeWidth={1.6} />
                      </span>
                      <strong>{m.title}</strong>
                      <span>{m.description}</span>
                      <Plus size={15} />
                    </button>
                  );
                })}
              </div>
              <div className="blank-tip">
                <Keyboard size={14} />
                Built for conversations, with quick inline editing.
              </div>
            </div>
          )}
          {design.sections.map((section, index) => {
            const meta = sectionMeta[section.kind],
              Icon = meta.icon;
            return (
              <section
                className="design-section"
                key={section.kind}
                id={section.kind}
              >
                <div className="section-heading">
                  <div className={`section-icon ${meta.color}`}>
                    <Icon size={20} strokeWidth={1.7} />
                  </div>
                  <div>
                    <span className="section-number">SECTION 0{index + 1}</span>
                    <h2>{meta.title}</h2>
                  </div>
                  <div className="section-heading-actions">
                    <IconButton
                      label={`Move ${meta.title} up`}
                      disabled={index === 0}
                      onClick={() =>
                        edit((d) => {
                          [d.sections[index - 1], d.sections[index]] = [
                            d.sections[index],
                            d.sections[index - 1],
                          ];
                        })
                      }
                    >
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      label={`Move ${meta.title} down`}
                      disabled={index === design.sections.length - 1}
                      onClick={() =>
                        edit((d) => {
                          [d.sections[index + 1], d.sections[index]] = [
                            d.sections[index],
                            d.sections[index + 1],
                          ];
                        })
                      }
                    >
                      <ArrowDown size={14} />
                    </IconButton>
                    <DeleteButton
                      label={`Remove ${meta.title} section`}
                      onClick={() =>
                        edit((d) => {
                          d.sections.splice(index, 1);
                        }, true)
                      }
                    />
                    <IconButton
                      label={`${section.collapsed ? "Expand" : "Collapse"} ${meta.title}`}
                      onClick={() =>
                        edit((d) => {
                          d.sections[index].collapsed =
                            !d.sections[index].collapsed;
                        })
                      }
                    >
                      {section.collapsed ? (
                        <ChevronRight size={17} />
                      ) : (
                        <ChevronDown size={17} />
                      )}
                    </IconButton>
                  </div>
                </div>
                {!section.collapsed && (
                  <Suspense
                    fallback={
                      <div className="section-empty">Opening editor…</div>
                    }
                  >
                    {sectionContent[section.kind]}
                  </Suspense>
                )}
              </section>
            );
          })}
          {available.length > 0 && design.sections.length > 0 && (
            <div className="add-section-wrap" ref={addMenu}>
              <button
                className="add-section-button"
                onClick={() => setAddOpen((v) => !v)}
                aria-expanded={addOpen}
              >
                <Plus size={17} />
                Add a section
                <ChevronDown size={13} />
              </button>
              {addOpen && (
                <div className="dropdown-menu section-menu">
                  {available.map((kind) => {
                    const m = sectionMeta[kind],
                      Icon = m.icon;
                    return (
                      <button
                        key={kind}
                        aria-label={m.title}
                        onClick={() => addSection(kind)}
                      >
                        <Icon size={17} />
                        {m.title}
                        <ArrowUpRight size={14} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <footer className="document-footer">
            <span>Made for thinking, not formatting.</span>
            <span>outline.</span>
          </footer>
        </main>
      </div>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Import design file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const imported = parseDesign(await file.text());
            imported.id = uid();
            imported.createdAt = imported.updatedAt = new Date().toISOString();
            workspace.add(imported);
            setNotice("Design imported as a new workspace.");
          } catch (error) {
            setNotice(
              error instanceof Error
                ? error.message
                : "Could not import this design.",
            );
          }
        }}
      />
      {workspace.undo && (
        <div className="undo-toast" role="status">
          <Check size={16} />
          <span>{workspace.undo.label}</span>
          <button onClick={workspace.undo.action}>
            <RotateCcw size={13} />
            Undo
          </button>
          <IconButton label="Dismiss undo" onClick={workspace.dismissUndo}>
            <X size={14} />
          </IconButton>
        </div>
      )}
      {helpOpen && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
          <div
            className="guide-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quick guide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-heading">
              <h2>A little less clicking.</h2>
              <IconButton
                label="Close quick guide"
                autoFocus
                onClick={() => setHelpOpen(false)}
              >
                <X size={18} />
              </IconButton>
            </div>
            <p>Keep your attention on the conversation.</p>
            <div className="guide-row">
              <kbd>Enter</kbd>
              <span>Add the next requirement or entity field.</span>
            </div>
            <div className="guide-row">
              <kbd>Tab</kbd>
              <span>Move between fields without reaching for the mouse.</span>
            </div>
            <div className="guide-row">
              <kbd>Alt ↑ / ↓</kbd>
              <span>Move focus between requirements.</span>
            </div>
            <div className="guide-row">
              <Check size={17} />
              <span>Check a requirement when you’ve covered it.</span>
            </div>
            <div className="guide-row">
              <Network size={17} />
              <span>
                Select a node, enable “Add connected component,” then click the
                next component.
              </span>
            </div>
            <div className="guide-row">
              <Braces size={17} />
              <span>Draft JSON is always saved. Format it when ready.</span>
            </div>
            <div className="guide-note">
              Designs are saved in this browser. Export JSON backups to move
              between devices or keep a copy.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
