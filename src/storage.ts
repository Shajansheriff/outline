import { openDB } from "idb";
import { parseDesign, type Design } from "./model";

const db = () =>
  openDB("outline-designs", 1, {
    upgrade(database) {
      database.createObjectStore("designs", { keyPath: "id" });
    },
  });
export async function loadDesigns(): Promise<Design[]> {
  const database = await db();
  try {
    const values = await database.getAll("designs");
    return values
      .map((v) => parseDesign(JSON.stringify(v)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    database.close();
  }
}
export async function saveDesign(design: Design): Promise<void> {
  const database = await db();
  try {
    await database.put("designs", design);
  } finally {
    database.close();
  }
}
export async function deleteDesign(id: string): Promise<void> {
  const database = await db();
  try {
    await database.delete("designs", id);
  } finally {
    database.close();
  }
}

// All writes share one queue, so an older save can never overwrite a newer edit.
let writes: Promise<void> = Promise.resolve();
export function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const next = writes.catch(() => undefined).then(operation);
  writes = next;
  return next;
}
