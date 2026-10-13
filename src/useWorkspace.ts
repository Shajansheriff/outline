import { useCallback, useEffect, useRef, useState } from "react";
import { newDesign, type Design } from "./model";
import { deleteDesign, enqueueWrite, loadDesigns, saveDesign } from "./storage";

export function useWorkspace() {
  const [designs, setDesigns] = useState<Design[]>([]),
    docs = useRef<Design[]>([]);
  const [currentId, setCurrentId] = useState(""),
    current = useRef("");
  const [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [undo, setUndo] = useState<{
    label: string;
    action: () => void;
  } | null>(null);
  const pending = useRef(
    new Map<
      string,
      { token: object; operation: () => Promise<void>; failed: boolean }
    >(),
  );
  const active = useRef(true);
  const publish = useCallback((next: Design[]) => {
    docs.current = next;
    setDesigns(next);
  }, []);
  const select = useCallback((id: string) => {
    current.current = id;
    setCurrentId(id);
    setUndo(null);
    try {
      localStorage.setItem("outline-current", id);
    } catch {
      /* IndexedDB is the source of truth. */
    }
  }, []);
  const persist = useCallback((id: string, operation: () => Promise<void>) => {
    const entry = { token: {}, operation, failed: false };
    pending.current.set(id, entry);
    setSaveState("saving");
    void enqueueWrite(operation)
      .then(() => {
        if (pending.current.get(id)?.token === entry.token)
          pending.current.delete(id);
        if (active.current)
          setSaveState(
            [...pending.current.values()].some((e) => e.failed)
              ? "error"
              : pending.current.size
                ? "saving"
                : "saved",
          );
      })
      .catch(() => {
        if (pending.current.get(id)?.token === entry.token) entry.failed = true;
        if (active.current)
          setSaveState(
            [...pending.current.values()].some((e) => e.failed)
              ? "error"
              : "saving",
          );
      });
  }, []);
  useEffect(() => {
    active.current = true;
    let canceled = false;
    void loadDesigns()
      .then((loaded) => {
        if (canceled) return;
        const all = loaded.length ? loaded : [newDesign()];
        publish(all);
        let remembered = "";
        try {
          remembered = localStorage.getItem("outline-current") || "";
        } catch {
          /* Optional navigation preference. */
        }
        select(all.some((d) => d.id === remembered) ? remembered : all[0].id);
        setReady(true);
        if (!loaded.length) persist(all[0].id, () => saveDesign(all[0]));
      })
      .catch(() => {
        if (!canceled) {
          const d = newDesign();
          publish([d]);
          select(d.id);
          setReady(true);
          setLoadError(
            "Local storage could not be opened. Your current draft stays in this tab; export a backup before closing.",
          );
          setSaveState("error");
        }
      });
    return () => {
      canceled = true;
      active.current = false;
    };
  }, [persist, publish, select]);
  const edit = useCallback(
    (recipe: (draft: Design) => void, deletion = false) => {
      const previous = docs.current.find((d) => d.id === current.current);
      if (!previous) return;
      const next = structuredClone(previous);
      recipe(next);
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      next.updatedAt = new Date().toISOString();
      publish(docs.current.map((d) => (d.id === next.id ? next : d)));
      persist(next.id, () => saveDesign(next));
      setUndo(
        deletion
          ? {
              label: "Item deleted",
              action: () => {
                const restored = {
                  ...previous,
                  updatedAt: new Date().toISOString(),
                };
                publish(
                  docs.current.map((d) =>
                    d.id === previous.id ? restored : d,
                  ),
                );
                persist(restored.id, () => saveDesign(restored));
                setUndo(null);
              },
            }
          : null,
      );
    },
    [persist, publish],
  );
  function add(d = newDesign()) {
    publish([d, ...docs.current]);
    select(d.id);
    persist(d.id, () => saveDesign(d));
  }
  function remove(id: string) {
    const removed = docs.current.find((d) => d.id === id);
    if (!removed) return;
    let next = docs.current.filter((d) => d.id !== id);
    if (!next.length) {
      const blank = newDesign();
      next = [blank];
      persist(blank.id, () => saveDesign(blank));
    }
    publish(next);
    if (current.current === id) select(next[0].id);
    persist(id, () => deleteDesign(id));
    setUndo({
      label: "Design deleted",
      action: () => {
        publish([removed, ...docs.current]);
        select(removed.id);
        persist(removed.id, () => saveDesign(removed));
        setUndo(null);
      },
    });
  }
  function retry() {
    for (const [id, entry] of pending.current) persist(id, entry.operation);
    if (loadError)
      setLoadError(
        "Local storage was unavailable at startup. Export a backup; reload to recover any previously saved designs.",
      );
  }
  return {
    designs,
    design: designs.find((d) => d.id === currentId),
    ready,
    loadError,
    saveState,
    undo,
    edit,
    select,
    add,
    remove,
    retry,
    dismissUndo: () => setUndo(null),
  };
}
