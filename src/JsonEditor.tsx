import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { json } from "@codemirror/lang-json";
import { Braces } from "lucide-react";

export function JsonEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    editor = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const initial = useRef(value);
  initial.current = value;
  useEffect(() => {
    const view = new EditorView({
      doc: initial.current,
      parent: container.current!,
      extensions: [
        basicSetup,
        json(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": label }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) change.current(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { fontSize: "12px", background: "#fafbfc" },
          ".cm-content": {
            fontFamily: "var(--font-mono)",
            minHeight: "100px",
            padding: "12px 0",
          },
          ".cm-gutters": {
            background: "#fafbfc",
            border: "none",
            color: "#a1a6b3",
          },
          "&.cm-focused": { outline: "none" },
          ".cm-scroller": { overflow: "auto", maxHeight: "350px" },
        }),
      ],
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = null;
    };
  }, [label]);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
  }, [value]);
  let valid = true;
  if (value.trim()) {
    try {
      JSON.parse(value);
    } catch {
      valid = false;
    }
  }
  return (
    <div className="json-editor">
      <div className="json-toolbar">
        <span>
          <Braces size={13} />
          {label}
        </span>
        <div>
          {!valid && <span className="draft-hint">Draft JSON</span>}
          <button
            type="button"
            disabled={!valid || !value.trim()}
            onClick={() => onChange(JSON.stringify(JSON.parse(value), null, 2))}
          >
            Format
          </button>
        </div>
      </div>
      <div ref={container} />
      <div className="json-bottom">
        {value.trim()
          ? valid
            ? "Valid JSON"
            : "Incomplete JSON is saved as you type"
          : "Type or paste an example body"}
      </div>
    </div>
  );
}
