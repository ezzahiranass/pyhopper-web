"use client";

import Editor from "@monaco-editor/react";

type CompiledCodeViewProps = {
  code: string | null;
};

const placeholderCode = `# No compiled definition yet.
# Use Generate once, then inspect the emitted Python here.
`;

export function CompiledCodeView({ code }: CompiledCodeViewProps) {
  return (
    <div className="compiled-code-view">
      <div className="compiled-code-view__header">
        <p className="compiled-code-view__eyebrow">Compiler Output</p>
        <h3 className="compiled-code-view__title">Generated Python</h3>
      </div>
      <div className="compiled-code-view__body">
        <Editor
          height="100%"
          language="python"
          options={{
            automaticLayout: true,
            contextmenu: false,
            fontFamily: "Consolas, SFMono-Regular, Menlo, monospace",
            fontLigatures: false,
            fontSize: 13,
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbers: "on",
            minimap: { enabled: true },
            padding: { top: 18, bottom: 18 },
            readOnly: true,
            renderLineHighlight: "all",
            roundedSelection: true,
            scrollbar: {
              horizontalScrollbarSize: 10,
              verticalScrollbarSize: 10,
            },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            wordWrap: "on",
          }}
          theme="vs"
          value={code ?? placeholderCode}
        />
      </div>
    </div>
  );
}
