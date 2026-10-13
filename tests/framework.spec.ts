import { test, expect } from "@playwright/test";

test("interview framework, optional stages, fast flow entry and durable notes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".design-section")).toHaveCount(5);
  await expect(page.locator(".design-section h2")).toHaveText([
    "Scope",
    "Entities / Data Models",
    "API design",
    "High Level Design",
    "Discussion / Scratchpad",
  ]);
  await page.getByLabel("Design title", { exact: true }).fill("Design Uber");
  await page
    .getByLabel("Design subtitle")
    .fill("On-demand ride matching in a city");
  await page
    .getByRole("button", { name: "Capacity planning · optional" })
    .click();
  await page
    .getByLabel("Capacity planning", { exact: true })
    .fill("1M rides/day ≈ 12 requests/sec average; 10× peak");
  await page
    .getByLabel("Scope scratchpad")
    .fill("Payments and surge pricing are out of scope.");
  await page.getByRole("button", { name: "Data Flow · optional" }).click();
  await expect(page.locator(".design-section h2")).toHaveText([
    "Scope",
    "Entities / Data Models",
    "API design",
    "Data Flow",
    "High Level Design",
    "Discussion / Scratchpad",
  ]);
  await page.getByRole("button", { name: "Add flow step" }).click();
  await page.getByLabel("Flow step 1 title").fill("Receive request");
  await page.getByLabel("Flow step 1 output").fill("RideRequested event");
  await page.getByLabel("Flow step 1 title").press("Enter");
  await expect(page.getByLabel("Flow step 2 title")).toBeFocused();
  await page.getByLabel("Flow step 2 title").fill("Match nearby driver");
  await page.getByRole("button", { name: "Move flow step 2 up" }).click();
  await expect(page.getByLabel("Flow step 1 title")).toHaveValue(
    "Match nearby driver",
  );
  await page
    .getByRole("button", { name: "Delete flow step 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Flow step 1 title")).toHaveValue(
    "Match nearby driver",
  );
  await page
    .getByLabel("Discussion notes")
    .fill("Discuss regional failure and duplicate event handling.");
  await page.getByRole("button", { name: "Data Flow on" }).click();
  await page.getByRole("button", { name: "Capacity planning on" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Data Flow · optional" }).click();
  await expect(page.getByLabel("Flow step 2 output")).toHaveValue(
    "RideRequested event",
  );
  await page
    .getByRole("button", { name: "Capacity planning · optional" })
    .click();
  await expect(
    page.getByLabel("Capacity planning", { exact: true }),
  ).toHaveValue(/1M rides/);
  await expect(page.getByLabel("Design subtitle")).toHaveValue(
    "On-demand ride matching in a city",
  );
  await expect(page.getByLabel("Scope scratchpad")).toHaveValue(/Payments/);
  await expect(page.getByLabel("Discussion notes")).toHaveValue(
    /regional failure/,
  );
  await page
    .getByLabel("Design title", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/framework-preview.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
