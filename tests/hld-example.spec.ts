import { test, expect } from "@playwright/test";

test("sample HLD opens separately, explains flows and persists editable connections", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Design title", { exact: true })
    .fill("My original design");
  await page.getByRole("button", { name: "Open sample HLD" }).click();
  await expect(page.getByLabel("Design title", { exact: true })).toHaveValue(
    "Design Uber · HLD example",
  );
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(22);
  await expect(
    page.locator(".architecture-editor .react-flow__edge"),
  ).toHaveCount(25);
  await page
    .getByRole("button", { name: "Expand architecture", exact: true })
    .click();
  await page
    .getByRole("button", { name: "2 · Events & pub/sub", exact: true })
    .click();
  await expect(page.locator(".hld-flow-explanation")).toContainText(
    "separate consumer groups",
  );
  await page
    .getByRole("button", { name: "4 · Payments & webhook", exact: true })
    .click();
  await expect(page.locator(".hld-flow-explanation")).toContainText(
    "not the original charge response",
  );
  await page
    .getByRole("button", { name: "All components", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/hld-sample.png" });
  await page
    .getByRole("button", { name: "1 · Request path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "1 · Request path", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(7);
  await page.screenshot({
    path: "artifacts/hld-request.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(22);
  await page
    .getByRole("button", { name: "My original design", exact: true })
    .click();
  await expect(
    page.locator(".architecture-editor .react-flow__node"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Design Uber · HLD example", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
