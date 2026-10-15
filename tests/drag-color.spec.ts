import { test, expect } from "@playwright/test";

test("palette drag places components and connection colors survive reload", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.getByLabel("Architecture canvas", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const service = page.getByRole("button", { name: "Service", exact: true });
  await service.dragTo(canvas, { targetPosition: { x: 350, y: 180 } });
  const nodes = page.locator(".architecture-editor .react-flow__node");
  await expect(nodes).toHaveCount(1);
  const bounds = await canvas.boundingBox();
  const nodeBounds = await nodes.first().boundingBox();
  expect(Math.abs(nodeBounds!.x + 105 - (bounds!.x + 350))).toBeLessThan(4);
  expect(Math.abs(nodeBounds!.y + 35 - (bounds!.y + 180))).toBeLessThan(4);
  await page
    .getByRole("button", { name: "Queue + worker", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Edit connection label: enqueue",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Purple connection color", exact: true })
    .click();
  const edge = page.locator(
    ".architecture-editor .react-flow__edge.selected .react-flow__edge-path",
  );
  await expect(edge).toHaveCSS("stroke", "rgb(147, 51, 234)");
  await expect(
    page.getByRole("button", { name: "Purple connection color", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", {
      name: "Edit connection label: enqueue",
      exact: true,
    })
    .click();
  await expect(edge).toHaveCSS("stroke", "rgb(147, 51, 234)");
  await page.getByRole("button", { name: "Auto", exact: true }).click();
  await expect(edge).toHaveCSS("stroke", "rgb(118, 150, 141)");
  await page
    .getByRole("button", { name: "Expand architecture", exact: true })
    .click();
  const zoom = page.locator(".architecture-editor").getByRole("button", { name: "Zoom In", exact: true });
  await zoom.click();
  await page
    .getByRole("button", { name: "Sticky note", exact: true })
    .dragTo(canvas, { targetPosition: { x: 250, y: 200 } });
  await expect(page.locator(".sticky-note-node")).toHaveCount(1);
  await expect(nodes).toHaveCount(5);
});
