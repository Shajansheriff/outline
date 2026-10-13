import { memo, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  Background,
  Controls,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import {
  Database,
  KeyRound,
  Link2,
  Maximize2,
  Minimize2,
  Network,
  Wand2,
} from "lucide-react";
import type { Entity, Relationship } from "./model";
import { IconButton } from "./ui";
import "@xyflow/react/dist/style.css";

type EntityNode = Node<{ entity: Entity }, "entity">;
const EntityDiagramNode = memo(function EntityDiagramNode({
  data,
}: NodeProps<EntityNode>) {
  const e = data.entity;
  return (
    <div className="er-node">
      <div className="er-node-heading">
        <Database size={15} />
        <strong>{e.name || "Untitled entity"}</strong>
        <span>{e.fields.length}</span>
        <Handle type="target" position={Position.Left} id="entity-in" />
        <Handle type="source" position={Position.Right} id="entity-out" />
      </div>
      {e.fields.map((field) => (
        <div className="er-field" key={field.id}>
          <Handle
            type="target"
            position={Position.Left}
            id={`in-${field.id}`}
          />
          <span
            className="er-key"
            title={field.pk ? "Primary key" : field.fk ? "Foreign key" : ""}
          >
            {field.pk ? (
              <KeyRound size={12} />
            ) : field.fk ? (
              <Link2 size={12} />
            ) : (
              <span>·</span>
            )}
          </span>
          <span className="er-field-name" title={field.name}>
            {field.name || "Unnamed field"}
          </span>
          <span className="er-field-type" title={field.type}>
            {field.type}
          </span>
          {field.pk && field.fk && <span className="er-fk">FK</span>}
          <Handle
            type="source"
            position={Position.Right}
            id={`out-${field.id}`}
          />
        </div>
      ))}
      {!e.fields.length && <div className="er-no-fields">No fields yet</div>}
    </div>
  );
});
const nodeTypes = { entity: EntityDiagramNode };
function Diagram({
  entities,
  relationships,
}: {
  entities: Entity[];
  relationships: Relationship[];
}) {
  const { fitView } = useReactFlow<EntityNode>();
  const [expanded, setExpanded] = useState(false);
  const modelKey = JSON.stringify([entities, relationships]);
  // SQL/draft edits clone the document; only generated model changes should relayout it.
  const layout = useMemo(() => {
    const graph = new dagre.graphlib.Graph({ multigraph: true });
    graph.setGraph({
      rankdir: "LR",
      ranksep: 130,
      nodesep: 60,
      marginx: 35,
      marginy: 35,
    });
    graph.setDefaultEdgeLabel(() => ({}));
    entities.forEach((e) =>
      graph.setNode(e.id, {
        width: 244,
        height: 44 + Math.max(1, e.fields.length) * 30,
      }),
    );
    relationships.forEach((r) => graph.setEdge(r.source, r.target, {}, r.id));
    dagre.layout(graph);
    return {
      nodes: entities.map((e) => ({
        id: e.id,
        type: "entity" as const,
        position: {
          x: graph.node(e.id).x - 122,
          y: graph.node(e.id).y - (44 + Math.max(1, e.fields.length) * 30) / 2,
        },
        data: { entity: e },
      })),
      edges: relationships.map((r) => ({
        id: r.id,
        source: r.source,
        target: r.target,
        sourceHandle: r.sourceField ? `out-${r.sourceField}` : "entity-out",
        targetHandle: r.targetField ? `in-${r.targetField}` : "entity-in",
        type: "smoothstep",
        label: `${r.cardinality}${r.label ? ` · ${r.label}` : ""}`,
        style: { stroke: "#a497bb", strokeWidth: 1.5 },
        labelStyle: { fill: "#7b6996", fontSize: 11 },
        labelBgStyle: { fill: "#fff" },
        labelBgPadding: [5, 4] as [number, number],
      })),
    };
  }, [modelKey]);
  const [nodes, setNodes] = useState<EntityNode[]>(layout.nodes);
  useEffect(() => {
    setNodes(layout.nodes);
  }, [layout]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void fitView({ padding: 0.18, maxZoom: 1, duration: 200 });
    }, 50);
    return () => clearTimeout(timer);
  }, [layout, expanded, fitView]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);
  return (
    <div
      className={`model-diagram ${expanded ? "model-diagram-expanded" : ""}`}
    >
      <div className="model-pane-header">
        <span>
          <Network size={15} />
          Entity diagram
        </span>
        <div>
          <button
            className="toolbar-button"
            onClick={() => {
              setNodes(layout.nodes);
              requestAnimationFrame(() => {
                void fitView({ padding: 0.18, maxZoom: 1, duration: 200 });
              });
            }}
            disabled={!entities.length}
          >
            <Wand2 size={13} />
            Arrange
          </button>
          <IconButton
            label={
              expanded
                ? "Close expanded entity diagram"
                : "Expand entity diagram"
            }
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </IconButton>
        </div>
      </div>
      <div className="er-canvas" aria-label="Entity relationship diagram">
        <ReactFlow<EntityNode>
          nodes={nodes}
          edges={layout.edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) =>
            setNodes((n) => applyNodeChanges(changes, n))
          }
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
          minZoom={0.15}
          maxZoom={1.8}
          zoomOnScroll={false}
          preventScrolling={false}
        >
          <Background gap={18} color="#e2e6ed" />
          <Controls showInteractive={false} />
          {!entities.length && (
            <div className="canvas-empty">
              <Network size={28} />
              <h3>See how your data connects</h3>
              <p>
                Write a schema and generate
                <br />
                your entity diagram.
              </p>
            </div>
          )}
        </ReactFlow>
      </div>
      <div className="model-pane-footer">
        {entities.length} entities · {relationships.length} relationships
        <span>Drag to arrange · Scroll the page normally</span>
      </div>
    </div>
  );
}
export function ModelDiagram(props: {
  entities: Entity[];
  relationships: Relationship[];
}) {
  return (
    <ReactFlowProvider>
      <Diagram {...props} />
    </ReactFlowProvider>
  );
}
