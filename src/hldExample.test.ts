import { expect, it } from "vitest";
import { createHldExample, hldWalkthrough } from "./hldExample";
import { parseDesign, toMarkdown } from "./model";

it("creates a valid complete sample with independent identifiers and portable walkthrough", () => {
  const d = createHldExample(),
    another = createHldExample();
  expect(parseDesign(JSON.stringify(d))).toEqual(d);
  expect(d.architecture.nodes).toHaveLength(22);
  expect(d.architecture.edges).toHaveLength(25);
  const ids = new Set(d.architecture.nodes.map((n) => n.id));
  expect(another.architecture.nodes.some((n) => ids.has(n.id))).toBe(false);
  for (const flow of hldWalkthrough) {
    for (const name of flow.names)
      expect(d.architecture.nodes.some((n) => n.name === name)).toBe(true);
    expect(toMarkdown(d)).toContain(flow.text);
  }
});
