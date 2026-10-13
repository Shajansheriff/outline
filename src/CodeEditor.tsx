import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { keymap, placeholder } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { sql } from "@codemirror/lang-sql";

export type CodeEditorHandle = { focusEnd: () => void };
export const CodeEditor = forwardRef<
  CodeEditorHandle,
  {
    label: string;
    value: string;
    onChange: (value: string) => void;
    language?: "sql" | "schema";
    onGenerate?: () => void;
    placeholder?: string;
  }
>(function CodeEditor(
  {
    label,
    value,
    onChange,
    language = "schema",
    onGenerate,
    placeholder: hint = "",
  },
  ref,
) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const latest = useRef({ value, onChange, onGenerate });
  latest.current = { value, onChange, onGenerate };
  useImperativeHandle(
    ref,
    () => ({
      focusEnd() {
        const editor = view.current;
        if (editor) {
          editor.focus();
          editor.dispatch({
            selection: { anchor: editor.state.doc.length },
            scrollIntoView: true,
          });
        }
      },
    }),
    [],
  );
  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      doc: latest.current.value,
      extensions: [
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              latest.current.onGenerate?.();
              return Boolean(latest.current.onGenerate);
            },
          },
          indentWithTab,
        ]),
        basicSetup,
        ...(language === "sql" ? [sql()] : []),
        placeholder(hint),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": label,
          "aria-multiline": "true",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged)
            latest.current.onChange(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { fontSize: "12px", background: "#fbfcfe" },
          ".cm-content": {
            minHeight: language === "schema" ? "320px" : "190px",
            fontFamily: "var(--font-mono)",
            padding: "14px 0",
            lineHeight: "1.8",
          },
          ".cm-gutters": {
            background: "#fbfcfe",
            border: "none",
            color: "#a3adbc",
          },
          ".cm-scroller": {
            maxHeight: language === "schema" ? "510px" : "380px",
            overflow: "auto",
          },
          ".cm-placeholder": { color: "#a3adbc" },
          "&.cm-focused": { outline: "none" },
        }),
      ],
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [label, language, hint]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      // External changes must not be reported as another user edit.
      const previous = latest.current.onChange;
      latest.current.onChange = () => {};
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
      latest.current.onChange = previous;
    }
  }, [value]);
  return <div className="model-code-editor" ref={host} />;
});
