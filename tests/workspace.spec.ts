import { test, expect, type Page } from "@playwright/test";

async function addSection(page: Page, name: string) {
  const title =
    (
      {
        Requirements: "Scope",
        Architecture: "High Level Design",
        "Data models": "Entities / Data Models",
      } as Record<string, string>
    )[name] ?? name;
  await page
    .getByRole("heading", { name: title, exact: true })
    .scrollIntoViewIfNeeded();
  if (name === "Data models")
    await page
      .getByRole("button", { name: "Table editor", exact: true })
      .click();
}
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
}

test("Uber interview flow, raw JSON persistence, architecture labels, and backup round trip", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Scope", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".design-section")).toHaveCount(5);
  await page.getByLabel("Design title", { exact: true }).fill("Design Uber");
  await addSection(page, "Requirements");
  await page
    .getByRole("button", { name: "Add functional requirement", exact: true })
    .click();
  await expect(
    page.getByLabel("Functional requirement 1", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Functional requirement 1", { exact: true })
    .fill("Request a ride");
  await page
    .getByLabel("Functional requirement 1", { exact: true })
    .press("Enter");
  await expect(
    page.getByLabel("Functional requirement 2", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Functional requirement 2", { exact: true })
    .fill("Track the driver");
  await page
    .getByRole("checkbox", { name: "Covered: Request a ride", exact: true })
    .check();
  await page
    .getByRole("button", {
      name: "Add non-functional requirement",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Non-functional requirement 1", { exact: true })
    .fill("Match a driver within 2 seconds");
  // Editing an older row must not steal focus back to the most recently added row.
  await page
    .getByLabel("Functional requirement 1", { exact: true })
    .fill("Request or cancel a ride");
  await expect(
    page.getByLabel("Functional requirement 1", { exact: true }),
  ).toBeFocused();
  await addSection(page, "API design");
  await page.getByRole("button", { name: "Add endpoint", exact: true }).click();
  await expect(
    page.getByLabel("Endpoint path 1", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Endpoint path 1", { exact: true })
    .fill("/ride-request");
  await page
    .getByLabel("Endpoint title 1", { exact: true })
    .fill("Request a ride");
  const draft = '{ "source": { "lat": 12.9,';
  await page.getByLabel("Request body 1", { exact: true }).fill(draft);
  await page.getByLabel("Response status 1.1", { exact: true }).fill("201");
  await page
    .getByLabel("Response body 1.1", { exact: true })
    .fill('{"ride_id":"r1"}');
  await page.getByRole("button", { name: "Add response", exact: true }).click();
  await expect(
    page.getByLabel("Response status 1.2", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Response status 1.2", { exact: true }).fill("409");
  await page
    .getByLabel("Response body 1.2", { exact: true })
    .fill('{"error":"No drivers available"}');
  await addSection(page, "Data models");
  for (const [index, name] of ["Rider", "Driver", "Ride"].entries()) {
    await page.getByRole("button", { name: "Add entity", exact: true }).click();
    await page
      .getByLabel(`Entity name ${index + 1}`, { exact: true })
      .fill(name);
    await page
      .locator(".entity-card")
      .nth(index)
      .getByRole("button", { name: "Add field", exact: true })
      .click();
    await expect(
      page.getByLabel(`Field name ${index + 1}.1`, { exact: true }),
    ).toBeFocused();
    await page
      .getByLabel(`Field name ${index + 1}.1`, { exact: true })
      .fill("id");
    await page
      .getByLabel(`Field type ${index + 1}.1`, { exact: true })
      .fill("uuid");
    await page
      .getByLabel(`Primary key ${index + 1}.1`, { exact: true })
      .check();
  }
  await page
    .getByRole("button", { name: "Add relationship", exact: true })
    .click();
  await page
    .getByLabel("Relationship target 1", { exact: true })
    .selectOption({ label: "Ride" });
  await page
    .getByLabel("Relationship label 1", { exact: true })
    .fill("requests");
  await addSection(page, "Architecture");
  await page.getByRole("button", { name: "Client", exact: true }).click();
  await page
    .getByRole("button", { name: "Add connected component", exact: true })
    .click();
  await page.getByRole("button", { name: "Service", exact: true }).click();
  await page
    .getByLabel("Selected component name", { exact: true })
    .fill("Ride service");
  await page.getByRole("button", { name: "Queue", exact: true }).click();
  await page.getByRole("button", { name: "Worker", exact: true }).click();
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(4);
  await expect(
    page.locator(".architecture-editor .react-flow__edge"),
  ).toHaveCount(3);
  await page
    .getByText("Connect components with selectors", { exact: true })
    .click();
  await page
    .getByLabel("Connection source", { exact: true })
    .selectOption({ label: "Ride service" });
  await page
    .getByLabel("Connection target", { exact: true })
    .selectOption({ label: "Queue" });
  await page
    .getByLabel("New connection label", { exact: true })
    .fill("ride_requested");
  await page.getByRole("checkbox", { name: "Async", exact: true }).check();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByLabel("Connection label", { exact: true }),
  ).toHaveValue("ride_requested");
  await page
    .getByLabel("Connection label", { exact: true })
    .fill("publishes ride_requested");
  await expect(
    page.getByRole("checkbox", { name: "Asynchronous", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Auto-layout", exact: true }).click();
  // Move a node manually after layout; its placement and the viewport should survive reload.
  const firstNode = page
    .locator(".architecture-editor .react-flow__node")
    .first();
  await expect(firstNode).toBeVisible();
  const box = await firstNode.boundingBox();
  if (!box) throw new Error("Architecture node has no bounds");
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 10, box.y + 80, { steps: 10 });
  await page.mouse.up();
  await expect(firstNode).toBeVisible();
  const position = await firstNode.evaluate(
    (el) => (el as HTMLElement).style.transform,
  );
  await saved(page);
  await page
    .getByRole("button", { name: "Expand architecture", exact: true })
    .click();
  await page.screenshot({ path: "test-results/architecture-preview.png" });
  await page
    .getByRole("button", { name: "Close expanded architecture", exact: true })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/uber-workspace.png",
    fullPage: true,
  });
  await page.screenshot({ path: "test-results/workspace-preview.png" });
  await page.reload();
  await saved(page);
  await expect(page.getByLabel("Design title", { exact: true })).toHaveValue(
    "Design Uber",
  );
  await expect(
    page.getByRole("checkbox", {
      name: "Covered: Request or cancel a ride",
      exact: true,
    }),
  ).toBeChecked();
  await expect(page.getByLabel("Request body 1", { exact: true })).toHaveText(
    draft,
  );
  await expect(
    page.getByLabel("Response status 1.2", { exact: true }),
  ).toHaveValue("409");
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(4);
  await expect(
    page.locator(".architecture-editor .react-flow__edge"),
  ).toHaveCount(4);
  await page
    .getByRole("button", {
      name: "Edit connection label: publishes ride_requested",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Connection label", { exact: true }),
  ).toHaveValue("publishes ride_requested");
  await expect
    .poll(() =>
      page
        .locator(".architecture-editor .react-flow__node")
        .first()
        .evaluate((el) => (el as HTMLElement).style.transform),
    )
    .toBe(position);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /JSON backup/ }).click();
  const download = await downloaded;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page
    .getByLabel("Import design file", { exact: true })
    .setInputFiles(path!);
  await expect(
    page.getByText("Design imported as a new workspace."),
  ).toBeVisible();
  await expect(page.locator(".design-link")).toHaveCount(2);
  await expect(page.getByLabel("Request body 1", { exact: true })).toHaveText(
    draft,
  );
  await expect(
    page.locator(".architecture-editor .react-flow__edge"),
  ).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("deletion undo restores linked entities and diagram connections", async ({
  page,
}) => {
  await page.goto("/");
  await addSection(page, "Data models");
  for (const name of ["Rider", "Ride"]) {
    await page.getByRole("button", { name: "Add entity", exact: true }).click();
    await page.locator(".entity-header input").last().fill(name);
  }
  await page
    .getByRole("button", { name: "Add relationship", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete entity", exact: true })
    .first()
    .click();
  await expect(page.locator(".relationship-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".relationship-row")).toHaveCount(1);
  await addSection(page, "Architecture");
  await page
    .getByRole("button", { name: "Queue + worker", exact: true })
    .click();
  await expect(
    page.locator(".architecture-editor .react-flow__edge"),
  ).toHaveCount(2);
  await page.locator(".architecture-editor .react-flow__node").nth(1).click();
  await page
    .getByRole("button", { name: "Delete component", exact: true })
    .click();
  await expect(
    page.locator(".architecture-editor .react-flow__edge"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(3);
  await expect(
    page.locator(".architecture-editor .react-flow__edge"),
  ).toHaveCount(2);
});

test("switching documents preserves JSON drafts and a blank new design", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Design title", { exact: true }).fill("First design");
  await addSection(page, "API design");
  await page.getByRole("button", { name: "Add endpoint", exact: true }).click();
  await page.getByLabel("Request body 1", { exact: true }).fill("{first:");
  await page.getByRole("button", { name: "New design", exact: true }).click();
  await page.getByLabel("Design title", { exact: true }).fill("Second design");
  await expect(page.locator(".design-section")).toHaveCount(5);
  await addSection(page, "API design");
  await page.getByRole("button", { name: "Add endpoint", exact: true }).click();
  await page.getByLabel("Request body 1", { exact: true }).fill("{second:");
  await page.getByRole("button", { name: "First design", exact: true }).click();
  await expect(page.getByLabel("Request body 1", { exact: true })).toHaveText(
    "{first:",
  );
  await page
    .getByRole("button", { name: "Second design", exact: true })
    .click();
  await expect(page.getByLabel("Request body 1", { exact: true })).toHaveText(
    "{second:",
  );
  await page
    .getByRole("button", { name: "Collapse API design", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expand API design", exact: true })
    .click();
  await expect(page.getByLabel("Request body 1", { exact: true })).toHaveText(
    "{second:",
  );
});

test("invalid imports leave existing work untouched", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Design title", { exact: true }).fill("Keep this");
  await page.getByLabel("Import design file", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("unsupported");
  await expect(page.getByLabel("Design title", { exact: true })).toHaveValue(
    "Keep this",
  );
  await expect(page.locator(".design-link")).toHaveCount(1);
});

test("save failure retains the draft, shows retry, and recovers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if ((window as unknown as { failSave?: boolean }).failSave)
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  await saved(page);
  await page.evaluate(() => {
    (window as unknown as { failSave?: boolean }).failSave = true;
  });
  await page.getByLabel("Design title", { exact: true }).fill("Unsaved draft");
  await expect(
    page.getByRole("button", { name: "Not saved · Retry", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Design title", { exact: true })).toHaveValue(
    "Unsaved draft",
  );
  await page.evaluate(() => {
    (window as unknown as { failSave?: boolean }).failSave = false;
  });
  await page
    .getByRole("button", { name: "Not saved · Retry", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("Design title", { exact: true })).toHaveValue(
    "Unsaved draft",
  );
});

test("mobile layout has no page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Scope", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await addSection(page, "Architecture");
  await page.getByRole("button", { name: "Database", exact: true }).click();
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Expand architecture", exact: true })
    .click();
  await expect(page.locator(".architecture-expanded")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".architecture-expanded")).toHaveCount(0);
});
