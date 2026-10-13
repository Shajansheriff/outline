import { test, expect } from "@playwright/test";

test("sticky notes support multiline editing, dragging, reload and deletion undo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sticky note", exact: true }).click();
  const note = page.locator(".sticky-note-node");
  await expect(note).toHaveCount(1);
  await note
    .getByRole("textbox", { name: /^Note title/ })
    .fill("Matching service");
  await note
    .getByRole("textbox", { name: /^Note text/ })
    .fill(
      "Find nearby drivers in Redis.\nRank by ETA.\nRetry if a driver declines.",
    );
  await note.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350); // Let the add-note camera animation settle before dragging.
  const node = page.locator(".architecture-editor .react-flow__node");
  const initial = await node.evaluate(
    (el) => (el as HTMLElement).style.transform,
  );
  const grip = await note.locator(".sticky-note-grip").boundingBox();
  if (!grip) throw new Error("Missing note drag handle");
  await page.mouse.move(grip.x + 20, grip.y + 5);
  await page.mouse.down();
  await page.mouse.move(grip.x + 120, grip.y + 70, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => node.evaluate((el) => (el as HTMLElement).style.transform))
    .not.toBe(initial);
  const before = await node.evaluate(
    (el) => (el as HTMLElement).style.transform,
  );
  await page.getByRole("button", { name: "Auto-layout", exact: true }).click();
  await expect
    .poll(() => node.evaluate((el) => (el as HTMLElement).style.transform))
    .toBe(before);
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(note.getByRole("textbox", { name: /^Note text/ })).toHaveValue(
    "Find nearby drivers in Redis.\nRank by ETA.\nRetry if a driver declines.",
  );
  await expect
    .poll(() => node.evaluate((el) => (el as HTMLElement).style.transform))
    .toBe(before);
  await note.locator(".sticky-note-grip").click();
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await expect(note).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(note).toHaveCount(1);
});
