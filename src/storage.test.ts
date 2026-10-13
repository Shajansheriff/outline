import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { deleteDesign, enqueueWrite, loadDesigns, saveDesign } from "./storage";
import { newDesign } from "./model";

describe("local persistence", () => {
  it("stores and restores draft bodies and checklist state", async () => {
    const d = newDesign();
    d.title = "Persistence check";
    await saveDesign(d);
    expect((await loadDesigns()).find((x) => x.id === d.id)).toEqual(d);
    await deleteDesign(d.id);
    expect((await loadDesigns()).some((x) => x.id === d.id)).toBe(false);
  });
  it("serializes writes so the latest edit wins", async () => {
    const d = newDesign();
    let release: () => void = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = enqueueWrite(async () => {
      await wait;
      await saveDesign({ ...d, title: "Older" });
    });
    const second = enqueueWrite(() => saveDesign({ ...d, title: "Latest" }));
    release();
    await Promise.all([first, second]);
    expect((await loadDesigns()).find((x) => x.id === d.id)?.title).toBe(
      "Latest",
    );
    await deleteDesign(d.id);
  });
  it("propagates a failed write but still allows later saves", async () => {
    const failed = enqueueWrite(async () => {
      throw new Error("Storage unavailable");
    });
    await expect(failed).rejects.toThrow("Storage unavailable");
    const d = newDesign();
    await enqueueWrite(() => saveDesign(d));
    expect((await loadDesigns()).some((x) => x.id === d.id)).toBe(true);
    await deleteDesign(d.id);
  });
});
