import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type Connection,
} from "@xyflow/react";
import { hldWalkthrough } from "./hldExample";
import dagre from "@dagrejs/dagre";
import {
  StickyNote,
  Monitor,
  Server,
  Network,
  Database,
  Layers,
  ListOrdered,
  Radio,
  Cog,
  Clock,
  HardDrive,
  Box,
  Route,
  Maximize2,
  Minimize2,
  Wand2,
  ArrowRight,
  Link2,
  MousePointer2,
  type LucideIcon,
} from "lucide-react";
import {
  componentKinds,
  uid,
  removeNode,
  type ComponentKind,
  type Design,
  type DiagramNode,
} from "./model";
import { AddButton, DeleteButton, IconButton, type EditDesign } from "./ui";
import "@xyflow/react/dist/style.css";

export const components: Record<
  ComponentKind,
  { label: string; icon: LucideIcon; color: string }
> = {
  note: { label: "Sticky note", icon: StickyNote, color: "orange" },
  client: { label: "Client", icon: Monitor, color: "blue" },
  service: { label: "Service", icon: Server, color: "purple" },
  gateway: { label: "API gateway", icon: Route, color: "blue" },
  loadBalancer: { label: "Load balancer", icon: Network, color: "blue" },
  database: { label: "Database", icon: Database, color: "orange" },
  cache: { label: "Cache", icon: Layers, color: "orange" },
  queue: { label: "Queue", icon: ListOrdered, color: "green" },
  stream: { label: "Event stream", icon: Radio, color: "green" },
  worker: { label: "Worker", icon: Cog, color: "purple" },
  scheduler: { label: "Scheduler", icon: Clock, color: "green" },
  storage: { label: "Storage", icon: HardDrive, color: "orange" },
  custom: { label: "Custom", icon: Box, color: "gray" },
};
type FlowNode = Node<{ component: DiagramNode; fresh: boolean }, "component">;
const EditContext = createContext<EditDesign>(() => {});
const SelectEdgeContext = createContext<(id: string) => void>(() => {});
const ComponentNode = memo(function ComponentNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const edit = useContext(EditContext),
    n = data.component,
    def = components[n.kind],
    Icon = def.icon;
  if (n.kind === "note")
    return (
      <div className={`sticky-note-node ${selected ? "selected" : ""}`}>
        <div className="sticky-note-grip">
          <StickyNote size={14} /> NOTE · drag to move
        </div>
        <input
          className="nodrag nopan"
          aria-label={`Note title ${n.id}`}
          value={n.name}
          placeholder="Note title"
          onChange={(e) =>
            edit((d) => {
              d.architecture.nodes.find((x) => x.id === n.id)!.name =
                e.target.value;
            })
          }
        />
        <textarea
          className="nodrag nopan nowheel"
          aria-label={`Note text ${n.id}`}
          autoFocus={data.fresh}
          placeholder="What does this component do?
Responsibilities, decisions, or questions…"
          rows={Math.min(16, Math.max(6, n.description.split("\n").length + 1))}
          value={n.description}
          onChange={(e) =>
            edit((d) => {
              d.architecture.nodes.find((x) => x.id === n.id)!.description =
                e.target.value;
            })
          }
        />
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
      </div>
    );
  return (
    <div className={`system-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className={`node-icon ${def.color}`}>
        <Icon size={20} strokeWidth={1.7} />
      </div>
      <div className="node-content">
        <span className="node-kind">{def.label}</span>
        <input
          aria-label={`Component name ${n.id}`}
          className="nodrag nopan"
          autoFocus={data.fresh}
          onFocus={(e) => {
            if (data.fresh) e.target.select();
          }}
          placeholder={def.label}
          value={n.name}
          onChange={(e) =>
            edit((d) => {
              d.architecture.nodes.find((x) => x.id === n.id)!.name =
                e.target.value;
            })
          }
        />
      </div>
      {n.description && <div className="node-description">{n.description}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
const nodeTypes = { component: ComponentNode };
type SystemEdge = Edge<{ offset: number; parallel: boolean }>;
function ConnectionEdge(props: EdgeProps<SystemEdge>) {
  const selectEdge = useContext(SelectEdgeContext);
  let [path, labelX, labelY] = getSmoothStepPath(props);
  if (props.data?.parallel && props.source !== props.target) {
    const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = props;
    const dx = Math.max(40, Math.abs(tx - sx) / 2),
      offset = props.data.offset;
    path = `M ${sx} ${sy} C ${sx + dx} ${sy + (offset * 4) / 3}, ${tx - dx} ${ty + (offset * 4) / 3}, ${tx} ${ty}`;
    labelX = (sx + tx) / 2;
    labelY = (sy + ty) / 2 + offset;
  }
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={{
          ...props.style,
          ...(props.selected ? { stroke: "#7e9fcb", strokeWidth: 2 } : {}),
        }}
      />
      {props.label && (
        <EdgeLabelRenderer>
          <button
            className="flow-edge-label nodrag nopan"
            aria-label={`Edit connection label: ${String(props.label)}`}
            title={String(props.label)}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              maxWidth: Math.min(
                180,
                Math.max(85, Math.abs(props.targetX - props.sourceX) - 12),
              ),
            }}
            onClick={(event) => {
              event.stopPropagation();
              selectEdge(props.id);
            }}
          >
            {props.label}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const edgeTypes = { connection: ConnectionEdge };

function ArchitectureCanvas({
  design,
  edit,
}: {
  design: Design;
  edit: EditDesign;
}) {
  const { fitView, setViewport } = useReactFlow<FlowNode>();
  const [expanded, setExpanded] = useState(false),
    [selection, setSelection] = useState<{
      type: "node" | "edge";
      id: string;
    } | null>(null);
  const [connectNext, setConnectNext] = useState(false),
    [fresh, setFresh] = useState("");
  const [source, setSource] = useState(""),
    [target, setTarget] = useState(""),
    [label, setLabel] = useState(""),
    [async, setAsync] = useState(false);
  const [message, setMessage] = useState("");
  const [walkthrough, setWalkthrough] = useState<number | null>(null);
  const mapNodes = useCallback(
    (): FlowNode[] =>
      design.architecture.nodes.map((n) => ({
        id: n.id,
        type: "component",
        position: n.position,
        selected: selection?.type === "node" && selection.id === n.id,
        data: { component: n, fresh: fresh === n.id },
      })),
    [design.architecture.nodes, selection, fresh],
  );
  const [nodes, setNodes] = useState<FlowNode[]>(mapNodes);
  useEffect(() => {
    setNodes((previous) =>
      mapNodes().map((node) => ({
        ...node,
        measured: previous.find((n) => n.id === node.id)?.measured,
      })),
    );
  }, [mapNodes]);
  useEffect(() => {
    if (
      selection &&
      !(
        selection.type === "node"
          ? design.architecture.nodes
          : design.architecture.edges
      ).some((x) => x.id === selection.id)
    )
      setSelection(null);
  }, [design.architecture.nodes, design.architecture.edges, selection]);
  useEffect(() => {
    if (source && !design.architecture.nodes.some((n) => n.id === source))
      setSource("");
    if (target && !design.architecture.nodes.some((n) => n.id === target))
      setTarget("");
  }, [design.architecture.nodes, source, target]);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  const edges = useMemo(
    () =>
      design.architecture.edges.map((e) => {
        const siblings = design.architecture.edges.filter(
          (x) => x.source === e.source && x.target === e.target,
        );
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          selected: selection?.type === "edge" && selection.id === e.id,
          type: "connection",
          data: {
            parallel: siblings.length > 1,
            offset:
              (siblings.findIndex((x) => x.id === e.id) -
                (siblings.length - 1) / 2) *
              48,
          },
          style: {
            stroke: e.async ? "#76968d" : "#8d94a6",
            strokeWidth: 1.6,
            strokeDasharray: e.async ? "6 4" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: e.async ? "#76968d" : "#8d94a6",
          },
          labelStyle: { fill: "#535d72", fontSize: 11, fontWeight: 500 },
          labelBgStyle: { fill: "#fff" },
          labelBgPadding: [7, 4] as [number, number],
        };
      }),
    [design.architecture.edges, selection],
  );
  const selectedNode =
    selection?.type === "node"
      ? design.architecture.nodes.find((n) => n.id === selection.id)
      : undefined;
  const selectedEdge =
    selection?.type === "edge"
      ? design.architecture.edges.find((e) => e.id === selection.id)
      : undefined;
  function freePosition(
    position: { x: number; y: number },
    existing = design.architecture.nodes,
  ) {
    const next = { ...position };
    while (
      existing.some(
        (n) =>
          Math.abs(n.position.x - next.x) < 230 &&
          Math.abs(n.position.y - next.y) < 100,
      )
    )
      next.y += 130;
    return next;
  }
  function add(kind: ComponentKind) {
    const node: DiagramNode = {
      id: uid(),
      kind,
      name: components[kind].label,
      description: "",
      position: freePosition(
        kind === "note" && selectedNode
          ? { x: selectedNode.position.x, y: selectedNode.position.y + 180 }
          : connectNext && selectedNode
            ? { x: selectedNode.position.x + 300, y: selectedNode.position.y }
            : { x: 80 + (design.architecture.nodes.length % 3) * 300, y: 65 },
      ),
    };
    edit((d) => {
      d.architecture.nodes.push(node);
      if (
        kind !== "note" &&
        connectNext &&
        selectedNode &&
        selectedNode.kind !== "note"
      )
        d.architecture.edges.push({
          id: uid(),
          source: selectedNode.id,
          target: node.id,
          label: "",
          async: false,
        });
    });
    setFresh(node.id);
    setSelection({ type: "node", id: node.id });
    requestAnimationFrame(() => {
      void fitView({ padding: 0.25, duration: 250 });
    });
  }
  function connect(
    connection: Connection | { source: string; target: string },
    edgeLabel = "",
    isAsync = false,
  ) {
    if (!connection.source || !connection.target) {
      setMessage("Choose both components to connect.");
      return;
    }
    const edge = {
      id: uid(),
      source: connection.source,
      target: connection.target,
      label: edgeLabel,
      async: isAsync,
    };
    edit((d) => {
      d.architecture.edges.push(edge);
    });
    setSelection({ type: "edge", id: edge.id });
    setMessage("");
  }
  function autoLayout() {
    const graph = new dagre.graphlib.Graph({ multigraph: true });
    graph.setGraph({
      rankdir: "LR",
      nodesep: 55,
      ranksep: 95,
      marginx: 50,
      marginy: 50,
    });
    graph.setDefaultEdgeLabel(() => ({}));
    design.architecture.nodes
      .filter((n) => n.kind !== "note")
      .forEach((n) =>
        graph.setNode(n.id, { width: 210, height: n.description ? 110 : 80 }),
      );
    design.architecture.edges
      .filter((e) => graph.hasNode(e.source) && graph.hasNode(e.target))
      .forEach((e) => graph.setEdge(e.source, e.target, {}, e.id));
    dagre.layout(graph);
    edit((d) => {
      d.architecture.nodes.forEach((n) => {
        if (n.kind === "note") return;
        const pos = graph.node(n.id);
        n.position = { x: pos.x - 105, y: pos.y - (n.description ? 55 : 40) };
      });
    });
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 250 });
    });
  }
  function pattern(kind: "monolith" | "services" | "background") {
    const specs: { kind: ComponentKind; name: string }[] =
      kind === "monolith"
        ? [
            { kind: "client", name: "Client" },
            { kind: "service", name: "Application" },
            { kind: "database", name: "Database" },
          ]
        : kind === "services"
          ? [
              { kind: "gateway", name: "API gateway" },
              { kind: "service", name: "Service A" },
              { kind: "service", name: "Service B" },
            ]
          : [
              { kind: "service", name: "Producer" },
              { kind: "queue", name: "Job queue" },
              { kind: "worker", name: "Worker" },
            ];
    const y =
      Math.max(-80, ...design.architecture.nodes.map((n) => n.position.y)) +
      180;
    const added = specs.map((spec, i) => ({
      id: uid(),
      kind: spec.kind,
      name: spec.name,
      description: "",
      position: { x: 70 + i * 300, y },
    }));
    edit((d) => {
      d.architecture.nodes.push(...added);
      d.architecture.edges.push(
        {
          id: uid(),
          source: added[0].id,
          target: added[1].id,
          label: kind === "background" ? "enqueue" : "",
          async: kind === "background",
        },
        {
          id: uid(),
          source: added[kind === "services" ? 0 : 1].id,
          target: added[2].id,
          label: kind === "background" ? "consume" : "",
          async: kind === "background",
        },
      );
    });
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 250 });
    });
  }
  return (
    <div
      className={`architecture-editor ${expanded ? "architecture-expanded" : ""}`}
    >
      {design.hldExample && (
        <div className="hld-walkthrough">
          <strong>Read the diagram one flow at a time</strong>
          <p>
            Boxes = responsibilities. Arrows = calls or data movement. Labels =
            operation + payload. Solid = direct call; dashed = decoupled
            delivery. Click a flow to isolate it, or expand the canvas.
          </p>
          <div className="hld-flow-tabs">
            <button
              aria-pressed={walkthrough === null}
              onClick={() => {
                setWalkthrough(null);
                void fitView({ padding: 0.15, duration: 300 });
              }}
            >
              All components
            </button>
            {hldWalkthrough.map((flow, index) => (
              <button
                key={flow.title}
                aria-pressed={walkthrough === index}
                onClick={() => {
                  setWalkthrough(index);
                  void fitView({
                    nodes: design.architecture.nodes.filter((n) =>
                      flow.names.includes(n.name),
                    ),
                    padding: 0.2,
                    duration: 300,
                  });
                }}
              >
                {flow.title}
              </button>
            ))}
          </div>
          {walkthrough !== null ? (
            <div className="hld-flow-explanation">
              <p>{hldWalkthrough[walkthrough].text}</p>
              <div>
                <span>
                  <b>Input</b> {hldWalkthrough[walkthrough].input}
                </span>
                <span>
                  <b>Output</b> {hldWalkthrough[walkthrough].output}
                </span>
              </div>
            </div>
          ) : (
            <p>
              Start with the request path, then add events and background work.
              This reference includes more components than most interviews need.
              Full walkthrough notes are also saved in Discussion.
            </p>
          )}
        </div>
      )}
      <div className="architecture-toolbar">
        <span>
          <MousePointer2 size={14} />
          Click to add. Drag to connect.
        </span>
        <div>
          <button
            className="toolbar-button"
            onClick={autoLayout}
            disabled={!nodes.length}
          >
            <Wand2 size={14} />
            Auto-layout
          </button>
          <IconButton
            label={
              expanded ? "Close expanded architecture" : "Expand architecture"
            }
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconButton>
        </div>
      </div>
      <div className="architecture-main">
        <aside className="component-palette">
          <div className="tiny-label">COMPONENTS</div>
          {selectedNode && (
            <button
              className={`connect-next ${connectNext ? "active" : ""}`}
              onClick={() => setConnectNext((v) => !v)}
            >
              <Link2 size={14} />
              {connectNext
                ? "Connecting from selection"
                : "Add connected component"}
            </button>
          )}
          <div className="palette-grid">
            {componentKinds.map((kind) => {
              const c = components[kind],
                Icon = c.icon;
              return (
                <button
                  key={kind}
                  className="palette-item"
                  onClick={() => add(kind)}
                  title={`${connectNext && selectedNode ? "Add connected" : "Add"} ${c.label}`}
                >
                  <span className={`palette-icon ${c.color}`}>
                    <Icon size={18} strokeWidth={1.6} />
                  </span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
          <div className="palette-patterns">
            <div className="tiny-label">INSERT A PATTERN</div>
            <button onClick={() => pattern("monolith")}>
              Monolith + database
              <ArrowRight size={12} />
            </button>
            <button onClick={() => pattern("services")}>
              Gateway + services
              <ArrowRight size={12} />
            </button>
            <button onClick={() => pattern("background")}>
              Queue + worker
              <ArrowRight size={12} />
            </button>
          </div>
        </aside>
        <div className="flow-canvas" aria-label="Architecture canvas">
          <EditContext.Provider value={edit}>
            <SelectEdgeContext.Provider
              value={(id) => {
                setFresh("");
                setSelection({ type: "edge", id });
              }}
            >
              <ReactFlow<FlowNode, SystemEdge>
                nodes={nodes.map((n) => ({
                  ...n,
                  hidden:
                    design.hldExample &&
                    walkthrough !== null &&
                    n.data.component.kind !== "note" &&
                    !hldWalkthrough[walkthrough].names.includes(
                      n.data.component.name,
                    ),
                }))}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultViewport={design.architecture.viewport}
                onInit={() => {
                  void setViewport(design.architecture.viewport);
                }}
                onNodesChange={(changes) => {
                  setNodes((ns) => applyNodeChanges(changes, ns));
                  const removed = changes.filter((c) => c.type === "remove");
                  if (removed.length)
                    edit(
                      (d) => removed.forEach((c) => removeNode(d, c.id)),
                      true,
                    );
                }}
                onEdgesChange={(changes) => {
                  const removed = changes.filter((c) => c.type === "remove");
                  if (removed.length)
                    edit((d) => {
                      d.architecture.edges = d.architecture.edges.filter(
                        (e) => !removed.some((c) => c.id === e.id),
                      );
                    }, true);
                }}
                onNodeDragStart={() => setFresh("")}
                onNodeDragStop={(_, node) =>
                  edit((d) => {
                    const n = d.architecture.nodes.find(
                      (n) => n.id === node.id,
                    );
                    if (n) n.position = node.position;
                  })
                }
                onConnect={(c) => connect(c)}
                onNodeClick={(_, node) => {
                  setFresh("");
                  setSelection({ type: "node", id: node.id });
                }}
                onEdgeClick={(_, edge) => {
                  setFresh("");
                  setSelection({ type: "edge", id: edge.id });
                }}
                onPaneClick={() => {
                  setSelection(null);
                  setFresh("");
                  setConnectNext(false);
                }}
                onMoveEnd={(_, viewport) =>
                  edit((d) => {
                    d.architecture.viewport = viewport;
                  })
                }
                zoomOnScroll={false}
                preventScrolling={false}
                minZoom={0.15}
                maxZoom={2}
                deleteKeyCode={null}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1.2}
                  color="#dce1e9"
                />
                <Controls showInteractive={false} />
                {!nodes.length && (
                  <div className="canvas-empty">
                    <div className="canvas-empty-icon">
                      <Network size={28} strokeWidth={1.4} />
                    </div>
                    <h3>Your system starts here</h3>
                    <p>
                      Add a component from the palette,
                      <br />
                      then connect the pieces.
                    </p>
                  </div>
                )}
              </ReactFlow>
            </SelectEdgeContext.Provider>
          </EditContext.Provider>
        </div>
      </div>
      {(selectedNode || selectedEdge) && (
        <div className="selection-inspector">
          {selectedNode && (
            <>
              <span className="tiny-label">
                {selectedNode.kind === "note" ? "NOTE" : "COMPONENT"}
              </span>
              <input
                aria-label={
                  selectedNode.kind === "note"
                    ? "Selected note title"
                    : "Selected component name"
                }
                value={selectedNode.name}
                onChange={(e) =>
                  edit((d) => {
                    d.architecture.nodes.find(
                      (n) => n.id === selectedNode.id,
                    )!.name = e.target.value;
                  })
                }
              />
              {selectedNode.kind !== "note" && (
                <input
                  aria-label="Component description"
                  placeholder="Optional description"
                  value={selectedNode.description}
                  onChange={(e) =>
                    edit((d) => {
                      d.architecture.nodes.find(
                        (n) => n.id === selectedNode.id,
                      )!.description = e.target.value;
                    })
                  }
                />
              )}
              <DeleteButton
                label={
                  selectedNode.kind === "note"
                    ? "Delete note"
                    : "Delete component"
                }
                onClick={() =>
                  edit((d) => removeNode(d, selectedNode.id), true)
                }
              />
            </>
          )}
          {selectedEdge && (
            <>
              <span className="tiny-label">CONNECTION</span>
              <input
                aria-label="Connection label"
                placeholder="e.g. POST /rides or publishes event"
                autoFocus
                value={selectedEdge.label}
                onChange={(e) =>
                  edit((d) => {
                    d.architecture.edges.find(
                      (x) => x.id === selectedEdge.id,
                    )!.label = e.target.value;
                  })
                }
              />
              <label className="async-toggle">
                <input
                  type="checkbox"
                  checked={selectedEdge.async}
                  onChange={(e) =>
                    edit((d) => {
                      d.architecture.edges.find(
                        (x) => x.id === selectedEdge.id,
                      )!.async = e.target.checked;
                    })
                  }
                />
                Asynchronous
              </label>
              <DeleteButton
                label="Delete connection"
                onClick={() =>
                  edit((d) => {
                    d.architecture.edges = d.architecture.edges.filter(
                      (x) => x.id !== selectedEdge.id,
                    );
                  }, true)
                }
              />
            </>
          )}
        </div>
      )}
      <details className="connection-builder">
        <summary>
          <Link2 size={14} />
          Connect components with selectors
        </summary>
        <div className="connection-form">
          <select
            aria-label="Connection source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">From component</option>
            {design.architecture.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name || components[n.kind].label}
              </option>
            ))}
          </select>
          <ArrowRight size={15} />
          <select
            aria-label="Connection target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">To component</option>
            {design.architecture.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name || components[n.kind].label}
              </option>
            ))}
          </select>
          <input
            aria-label="New connection label"
            placeholder="Connection label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <label className="async-toggle">
            <input
              type="checkbox"
              checked={async}
              onChange={(e) => setAsync(e.target.checked)}
            />
            Async
          </label>
          <AddButton
            onClick={() => {
              if (source && target) {
                connect({ source, target }, label, async);
                setLabel("");
              } else setMessage("Choose both components to connect.");
            }}
          >
            Connect
          </AddButton>
        </div>
        {message && (
          <p className="inline-error" role="alert">
            {message}
          </p>
        )}
      </details>
      <div className="architecture-footer">
        <span>
          {nodes.length} components · {edges.length} connections
        </span>
        <span>Solid = synchronous · Dashed = asynchronous</span>
      </div>
    </div>
  );
}
export function Architecture(props: { design: Design; edit: EditDesign }) {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvas {...props} />
    </ReactFlowProvider>
  );
}
