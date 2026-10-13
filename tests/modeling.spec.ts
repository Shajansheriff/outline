import { test, expect } from "@playwright/test";

const schema = `Table riders {
  id uuid [pk]
  name text
}

Table rides {
  id uuid [pk]
  rider_id uuid [ref: > riders.id]
  status text
  created_at timestamp
}`;

test("schema to diagram, SQL notes, invalid drafts, reload and backup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByLabel("Design title", { exact: true })
    .fill("Ride matching — data model");
  await page
    .getByRole("heading", { name: "Entities / Data Models", exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByLabel("Schema definition", { exact: true }).fill(schema);
  await page
    .getByLabel("Schema definition", { exact: true })
    .press("ControlOrMeta+Enter");
  await expect(page.locator(".er-node")).toHaveCount(2);
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await expect(
    page.getByLabel("Schema definition", { exact: true }),
  ).toContainText('Ref: "riders" < "rides"');
  await page.getByLabel("Schema definition", { exact: true }).fill(schema);
  await expect(page.locator(".er-canvas .react-flow__edge")).toHaveCount(1);
  await expect(page.locator(".er-canvas")).toContainText("N:1");
  const sql =
    "-- Match nearby available drivers\nSELECT d.id, d.location\nFROM drivers d\nWHERE d.status = 'available'\nORDER BY distance(d.location, :pickup)\nLIMIT 5;";
  await page.getByLabel("SQL scratchpad", { exact: true }).fill(sql);
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/modeling-preview.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Expand entity diagram", exact: true })
    .click();
  await expect(page.locator(".model-diagram-expanded")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".model-diagram-expanded")).toHaveCount(0);
  await page
    .getByLabel("Schema definition", { exact: true })
    .fill(schema + "\n\nTable unfinished {");
  await page
    .getByRole("button", { name: "Generate diagram", exact: false })
    .click();
  await expect(page.getByRole("alert")).toContainText("Close Table unfinished");
  await expect(page.locator(".er-node")).toHaveCount(2);
  await page.getByRole("button", { name: "Table editor", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add entity", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Schema + diagram", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Schema definition", { exact: true }),
  ).toContainText("Table unfinished {");
  await expect(
    page.getByLabel("SQL scratchpad", { exact: true }),
  ).toContainText("ORDER BY distance");
  await expect(page.locator(".er-node")).toHaveCount(2);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /JSON backup/ }).click();
  const file = await downloaded;
  await page
    .getByLabel("Import design file", { exact: true })
    .setInputFiles((await file.path())!);
  await expect(
    page.getByLabel("Schema definition", { exact: true }),
  ).toContainText("Table unfinished {");
  await expect(
    page.getByLabel("SQL scratchpad", { exact: true }),
  ).toContainText("ORDER BY distance");
  await expect(page.locator(".er-node")).toHaveCount(2);
  await page.getByRole("button", { name: "Table editor", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add entity", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Entity name 1", { exact: true }).fill("passengers");
  await page
    .getByRole("button", { name: "Schema + diagram", exact: true })
    .click();
  await expect(
    page.getByLabel("Schema definition", { exact: true }),
  ).toContainText("Table passengers");
  await expect(
    page.getByLabel("Schema definition", { exact: true }),
  ).toContainText("> passengers.id");
  expect(errors).toEqual([]);
});

test("schema and SQL helpers append without overwriting and work on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Entities / Data Models", exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(
    page.getByLabel("Schema definition", { exact: true }),
  ).toContainText("entity_1");
  await expect(
    page.getByLabel("Schema definition", { exact: true }),
  ).toContainText("entity_2");
  await page.getByRole("button", { name: /Generate diagram/ }).click();
  await expect(page.locator(".er-node")).toHaveCount(2);
  await page
    .getByLabel("SQL scratchpad", { exact: true })
    .fill("-- My explanation");
  await page.getByRole("button", { name: "JOIN", exact: true }).click();
  await expect(
    page.getByLabel("SQL scratchpad", { exact: true }),
  ).toContainText("-- My explanation");
  await expect(
    page.getByLabel("SQL scratchpad", { exact: true }),
  ).toContainText("JOIN table_b");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
