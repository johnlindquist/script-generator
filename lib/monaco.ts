import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { default as NightOwlTheme } from "monaco-themes/themes/Night Owl.json";

export const initializeTheme = (monacoInstance: any) => {
  // Define theme
  monacoInstance.editor.defineTheme("night-owl", {
    ...NightOwlTheme,
    base: "vs-dark",
  } as monaco.editor.IStandaloneThemeData);
  monacoInstance.editor.setTheme("night-owl");

  // Configure TypeScript defaults
  monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monacoInstance.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monacoInstance.languages.typescript.JsxEmit.React,
    reactNamespace: "React",
    allowJs: true,
    typeRoots: ["node_modules/@types"],
    noImplicitAny: false,
    strictNullChecks: false
  });

  // Add type definitions
  monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(`
    declare module "@johnlindquist/kit" {
      export function selectFile(options: { message: string }): Promise<string>;
      export function exit(code?: number): void;
      export const console: Console;
    }
  `, "ts:kit.d.ts");

  // Disable all diagnostics and validation
  monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
    diagnosticCodesToIgnore: [1378] // Ignore all TypeScript errors
  });
};

// Initialize Monaco with our settings
loader.init().then(initializeTheme);

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
  },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: "off",
  tabCompletion: "off",
  wordBasedSuggestions: false,
  parameterHints: {
    enabled: false
  },
  inlayHints: {
    enabled: false
  }
} as const; 