import { describe, expect, it } from "vitest";
import {
  newDesign,
  newEndpoint,
  newField,
  newRequirement,
  parseDesign,
  removeEntity,
  removeField,
  removeNode,
  toMarkdown,
  uid,
} from "./model";

function example() {
  const d = newDesign();
  d.title = "Design Uber";
  d.sections = [
    { kind: "requirements", collapsed: false },
    { kind: "apis", collapsed: false },
    { kind: "models", collapsed: false },
    { kind: "architecture", collapsed: false },
  ];
  d.requirements.functional = [
    { ...newRequirement(), text: "Request a ride", checked: true },
  ];
  d.requirements.nonFunctional = [
    { ...newRequirement(), text: "Match within 2 seconds" },
  ];
  d.endpoints = [
    {
      ...newEndpoint(),
      path: "/ride-request",
      request: '{ "source": { "lat": 12,',
      responses: [
        {
          id: uid(),
          status: "201",
          description: "Created",
          body: '{"ride_id":"123"}',
        },
      ],
    },
  ];
  const rider = {
    id: uid(),
    name: "Rider",
    notes: "",
    fields: [{ ...newField(), name: "id", type: "uuid", pk: true }],
  };
  const ride = {
    id: uid(),
    name: "Ride",
    notes: "",
    fields: [{ ...newField(), name: "rider_id", type: "uuid", fk: true }],
  };
  d.entities = [rider, ride];
  d.relationships = [
    {
      id: uid(),
      source: rider.id,
      target: ride.id,
      sourceField: rider.fields[0].id,
      targetField: ride.fields[0].id,
      cardinality: "1:N",
      label: "requests",
    },
  ];
  d.architecture.nodes = [
    {
      id: uid(),
      kind: "service",
      name: "Ride service",
      description: "",
      position: { x: 50, y: 60 },
    },
    {
      id: uid(),
      kind: "queue",
      name: "Matching queue",
      description: "",
      position: { x: 350, y: 60 },
    },
  ];
  d.architecture.edges = [
    {
      id: uid(),
      source: d.architecture.nodes[0].id,
      target: d.architecture.nodes[1].id,
      label: "ride_requested",
      async: true,
    },
  ];
  return d;
}
describe("design files", () => {
  it("starts with the core interview stages and optional stages off", () => {
    expect(newDesign().sections.map((s) => s.kind)).toEqual([
      "requirements",
      "models",
      "apis",
      "architecture",
      "discussion",
    ]);
  });
  it("round-trips unfinished JSON, relationships, checklist state, node positions and viewport", () => {
    const d = example();
    d.architecture.viewport = { x: 17, y: -24, zoom: 0.7 };
    expect(parseDesign(JSON.stringify(d))).toEqual(d);
  });
  it("rejects malformed files and unsupported versions", () => {
    expect(() => parseDesign("{")).toThrow("not valid JSON");
    expect(() => parseDesign('{"version":2}')).toThrow("unsupported");
    expect(() => parseDesign('{"version":1}')).toThrow("missing");
  });
  it("rejects duplicate IDs and sections", () => {
    const d = example();
    d.entities[1].id = d.entities[0].id;
    expect(() => parseDesign(JSON.stringify(d))).toThrow("duplicate item");
    const valid = example();
    valid.sections.push(valid.sections[0]);
    expect(() => parseDesign(JSON.stringify(valid))).toThrow(
      "duplicate sections",
    );
  });
  it("rejects missing entity, field, and component references", () => {
    const d = example();
    d.relationships[0].sourceField = uid();
    expect(() => parseDesign(JSON.stringify(d))).toThrow(
      "missing entity or field",
    );
    const graph = example();
    graph.architecture.edges[0].target = uid();
    expect(() => parseDesign(JSON.stringify(graph))).toThrow(
      "missing component",
    );
  });
  it("renaming entities and fields preserves relationships", () => {
    const d = example();
    d.entities[0].name = "Passenger";
    d.entities[0].fields[0].name = "passenger_id";
    expect(parseDesign(JSON.stringify(d)).relationships).toEqual(
      d.relationships,
    );
  });
  it("cleans up relationships when deleting an entity or referenced field", () => {
    const d = example();
    removeEntity(d, d.entities[0].id);
    expect(d.relationships).toHaveLength(0);
    const fields = example();
    removeField(fields, fields.entities[1].id, fields.entities[1].fields[0].id);
    expect(fields.relationships).toHaveLength(0);
  });
  it("cleans up edges when deleting a component", () => {
    const d = example();
    removeNode(d, d.architecture.nodes[0].id);
    expect(d.architecture.edges).toHaveLength(0);
  });
  it("exports checklists, incomplete JSON, keys, relationship fields and async connections to Markdown", () => {
    const text = toMarkdown(example());
    for (const piece of [
      "- [x] Request a ride",
      "- [ ] Match within 2 seconds",
      "POST /ride-request",
      '{ "source": { "lat": 12,',
      "Rider.id → Ride.rider_id (1:N)",
      "PK",
      "ride_requested (asynchronous)",
    ])
      expect(text).toContain(piece);
  });
  it("uses safe code fences when a JSON draft contains backticks", () => {
    const d = example();
    d.endpoints[0].request = '{"value": "```"}';
    expect(toMarkdown(d)).toContain("````json");
  });
});

it("upgrades old designs once without losing content or resetting later customization", () => {
  const old = example();
  delete old.frameworkRevision;
  const upgraded = parseDesign(JSON.stringify(old));
  expect(upgraded.sections.map((s) => s.kind)).toEqual([
    "requirements",
    "models",
    "apis",
    "architecture",
    "discussion",
  ]);
  expect(upgraded.entities).toEqual(old.entities);
  expect(upgraded.architecture).toEqual(old.architecture);
  expect(upgraded.endpoints).toEqual(old.endpoints);
  upgraded.sections = [];
  expect(parseDesign(JSON.stringify(upgraded)).sections).toEqual([]);
});
it("round-trips and exports interview context, estimates, flow and notes", () => {
  const d = newDesign();
  d.subtitle = "Ride matching at city scale";
  d.scopeNotes = "Payments out of scope";
  d.capacity = { enabled: true, notes: "100M rides/day / 86400" };
  d.dataFlow = [
    {
      id: uid(),
      title: "Match driver",
      details: "Find nearby drivers",
      output: "driver_id",
    },
  ];
  d.sections.splice(3, 0, { kind: "dataFlow", collapsed: false });
  d.discussionNotes = "Discuss regional failover";
  expect(parseDesign(JSON.stringify(d))).toEqual(d);
  const markdown = toMarkdown(d);
  for (const text of [
    d.subtitle,
    d.scopeNotes,
    d.capacity.notes,
    "Match driver",
    "driver_id",
    d.discussionNotes,
  ])
    expect(markdown).toContain(text);
});
