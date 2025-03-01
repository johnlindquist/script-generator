import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

export const initializeTheme = (monacoInstance: typeof monaco) => {
  const gruvBoxTheme = {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'ebdbb2' },
      { token: 'comment', foreground: 'a89984' },
      { token: 'keyword', foreground: 'fb4934' },
      { token: 'string', foreground: 'b8bb26' },
      { token: 'number', foreground: 'd3869b' },
      { token: 'regexp', foreground: 'b8bb26' },
      { token: 'type', foreground: 'fabd2f' },
      { token: 'function', foreground: 'fabd2f' },
      { token: 'variable', foreground: 'fb4934' },
      { token: 'constant', foreground: 'fb4934' },
      { token: 'delimiter', foreground: 'a89984' },
      { token: 'tag', foreground: 'fabd2f' },
    ],
    colors: {
      'editor.background': '#000000',
      'editor.foreground': '#ebdbb2',
      'editor.selectionBackground': '#7c6f6444',
      'editor.lineHighlightBackground': '#3c383640',
      'editorCursor.foreground': '#ebdbb2',
      'editorWhitespace.foreground': '#3c383680',
      'editorLineNumber.foreground': '#7c6f64',
      'editor.selectionHighlightBackground': '#7c6f6444',
      'editor.wordHighlightBackground': '#7c6f6444',
      'editor.wordHighlightStrongBackground': '#7c6f6444',
    },
  }

  monacoInstance.editor.defineTheme(
    'gruvboxTheme',
    gruvBoxTheme as monaco.editor.IStandaloneThemeData
  )
  monacoInstance.editor.setTheme('gruvboxTheme')

  // Register TypeScript formatter
  monacoInstance.languages.registerDocumentFormattingEditProvider('typescript', {
    async provideDocumentFormattingEdits(model) {
      const worker = await monacoInstance.languages.typescript.getTypeScriptWorker()
      const client = await worker(model.uri)
      const edits = await client.getFormattingEditsForDocument(model.uri.toString(), {
        insertSpaces: true,
        tabSize: 1,
        placeOpenBraceOnNewLineForFunctions: false,
        placeOpenBraceOnNewLineForControlBlocks: false,
        insertSpaceAfterCommaDelimiter: true,
        insertSpaceAfterSemicolonInForStatements: true,
        insertSpaceBeforeAndAfterBinaryOperators: true,
        insertSpaceAfterKeywordsInControlFlowStatements: true,
        insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
        insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
        insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
        insertSpaceAfterTypeAssertion: true,
        semicolons: 'insert',
      })
      return edits
    },
  })

  // Configure TypeScript defaults
  monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monacoInstance.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monacoInstance.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
    noImplicitAny: false,
    strictNullChecks: false,
  })

  // Add type definitions
  monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
    `
    declare module "@johnlindquist/kit" {
      export function selectFile(options: { message: string }): Promise<string>;
      export function exit(code?: number): void;
      export const console: Console;
    }
  `,
    'ts:kit.d.ts'
  )

  // Disable all diagnostics and validation
  monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
    diagnosticCodesToIgnore: [1378], // Ignore all TypeScript errors
  })
}

// Only initialize Monaco on the client side
if (typeof window !== 'undefined') {
  loader.init().then(initializeTheme)
}

export const monacoOptions = {
  theme: 'gruvboxTheme',
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  lineNumbers: 'on',
  wordWrap: 'on',
  folding: true,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'all',
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    verticalSliderSize: 10,
    horizontalSliderSize: 10,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    useShadows: false,
    smoothScrolling: true,
  },
  smoothScrolling: true,
  cursorSmoothCaretAnimation: 'on',
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: 'off',
  tabCompletion: 'off',
  wordBasedSuggestions: 'off',
  parameterHints: {
    enabled: false,
  },
  inlayHints: {
    enabled: 'off',
  },
  //   formatOnPaste: true,
  //   formatOnType: true,
} as const
