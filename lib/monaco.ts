import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { default as BrillanceBlack } from 'monaco-themes/themes/Brilliance Black.json'

export const initializeTheme = (monacoInstance: typeof monaco) => {
  // Define theme
  monacoInstance.editor.defineTheme('brillance-black', {
    ...BrillanceBlack,
    base: 'vs-dark',
  } as monaco.editor.IStandaloneThemeData)
  monacoInstance.editor.setTheme('brillance-black')

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
  theme: 'brillance-black',
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
  },
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
  formatOnPaste: true,
  formatOnType: true,
} as const
