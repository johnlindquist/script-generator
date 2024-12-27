import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { default as NightOwlTheme } from "monaco-themes/themes/Night Owl.json";

export const initializeTheme = (monaco: any) => {
  monaco.editor.defineTheme("night-owl", {
    ...NightOwlTheme,
    base: "vs-dark",
  } as monaco.editor.IStandaloneThemeData);
  monaco.editor.setTheme("night-owl");
};

export const monacoOptions = {
  theme: "night-owl",
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  lineNumbers: "on",
  wordWrap: "on",
  folding: true,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 3,
  renderLineHighlight: "all",
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10
  }
} as const; 