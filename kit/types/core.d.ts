import type { ChildProcess } from 'node:child_process'
import type { ProcessType, UI, Mode } from '../core/enum.js'

type ModifierKeys = 'cmd' | 'ctrl' | 'shift' | 'option' | 'alt'

export interface Choice<Value = any> {
  name: string
  slicedName?: string
  value?: Value
  description?: string
  slicedDescription?: string
  focused?: string
  img?: string
  icon?: string
  html?: string
  hasPreview?: boolean
  preview?: string | ((input: string, state: AppState) => string | Promise<string>)
  previewPath?: string
  previewLang?: string
  id?: string
  shortcode?: string
  trigger?: string
  keyword?: string
  className?: string
  nameClassName?: string
  tagClassName?: string
  focusedClassName?: string
  descriptionClassName?: string
  nameHTML?: string
  tag?: string
  shortcut?: string
  drag?:
    | {
        format?: string
        data?: string
      }
    | string
  onFocus?: (input: string, state: AppState) => string | Promise<string>
  onSubmit?: (input: string, state: AppState) => void | symbol | Promise<void | symbol>
  enter?: string
  disableSubmit?: boolean
  info?: boolean
  exclude?: boolean | string
  width?: number
  height?: number
  skip?: boolean
  miss?: boolean
  pass?: boolean | string
  group?: string
  userGrouped?: boolean
  choices?: (Omit<Choice<any>, 'choices'> | string)[]
  hideWithoutInput?: boolean
  ignoreFlags?: boolean
  selected?: boolean
  actions?: Action[]
  exact?: boolean
  recent?: boolean
  index?: number
}

export interface ScoredChoice {
  item: Choice<{ id: string; name: string; value: any }>
  score: number
  matches: {
    [key: string]: [number, number][]
  }
  _: string
}

export interface ScriptPathInfo {
  command: string
  filePath: string
  kenv: string
  id: string
  icon?: string
  timestamp?: number
  needsDebugger?: boolean
  compileStamp?: number
  compileMessage?: string
}

export interface ScriptMetadata extends Metadata {
  shebang?: string
  name?: string
  menu?: string
  description?: string
  shortcut?: string
  shortcode?: string
  trigger?: string
  friendlyShortcut?: string
  alias?: string
  author?: string
  twitter?: string
  github?: string
  social?: string
  social_url?: string
  exclude?: boolean
  watch?: string
  type: ProcessType
  tabs?: string[]
  tag?: string
  log?: boolean
  hasFlags?: boolean
  cmd?: string
  option?: string
  ctrl?: string
  shift?: string
  hasPreview?: boolean
  logo?: string
  /** @deprecated Use 'expand' instead */
  snippet?: string
  expand?: string
  snippetdelay?: number
  template?: boolean
  'color-text'?: string
  'color-primary'?: string
  'color-secondary'?: string
  'color-background'?: string
  opacity?: string
  preview?: Choice['preview']
  previewPath?: string
  debug?: boolean
  cache?: boolean
  note?: string
  group?: string
  keyword?: string
  enter?: string
  recent?: boolean
  img?: string
  postfix?: string
}

export type Script = ScriptMetadata & ScriptPathInfo & Choice

export type Scriptlet = Script & {
  group: string
  inputs: string[]
  tool: string
  scriptlet: string
  value: Script
  cwd?: string
  prepend?: string
  append?: string
  term?: undefined | boolean
  shell?: string | boolean
}

export type Snippet = Script & {
  group: 'Snippets'
  text: string
  snippetKey?: string
  postfix?: string
}

export type PromptBounds = {
  x?: number
  y?: number
  width?: number
  height?: number
}

// export type PromptState = "collapsed" | "expanded"

export type PromptDb = {
  screens: {
    [screenId: string]: {
      [script: string]: PromptBounds
    }
  }
}

export type InputType =
  | 'button'
  | 'checkbox'
  | 'color'
  | 'date'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'hidden'
  | 'image'
  | 'month'
  | 'number'
  | 'password'
  | 'radio'
  | 'range'
  | 'reset'
  | 'search'
  | 'submit'
  | 'tel'
  | 'text'
  | 'time'
  | 'url'
  | 'week'

export type Shortcut = {
  id?: string
  key: string
  name?: string
  value?: any
  onPress?: (input: string, state: AppState) => unknown | Promise<unknown>
  bar?: 'right' | 'left' | ''
  flag?: string
  visible?: boolean
  condition?: (choice: any) => boolean
}

export interface PromptData {
  id: string
  key: string
  scriptPath: string
  description: string
  flags: FlagsObject
  hasPreview: boolean
  keepPreview?: boolean
  hint: string
  input: string
  inputRegex: string
  kitArgs: string[]
  kitScript: string
  mode: Mode
  name: string
  placeholder: string
  preview: string
  previewWidthPercent: number
  panel: string
  secret: boolean
  selected: string
  strict: boolean
  tabs: string[]
  tabIndex: number
  type: InputType
  ui: UI
  resize: boolean
  placeholderOnly: boolean
  scripts: boolean
  shortcodes: { [key: string]: any }
  defaultChoiceId: string
  focusedId: string
  footer: string
  env: any
  shortcuts: Shortcut[]
  enter: string
  choicesType: 'string' | 'array' | 'function' | 'async' | 'null'
  x: number
  y: number
  width: number
  height: number
  itemHeight: number
  inputHeight: number
  defaultValue: string
  focused: string
  formData?: any
  html?: string
  theme?: any
  /** @deprecated Kit now supports backgrounding windows */
  alwaysOnTop?: boolean
  skipTaskbar?: boolean
  cwd?: string
  hasOnNoChoices?: boolean
  inputCommandChars?: string[]
  inputClassName?: string
  headerClassName?: string
  footerClassName?: string
  preload?: boolean
  css?: string
  preventCollapse?: boolean
  hideOnEscape?: boolean
  keyword?: string
  multiple?: boolean
  searchKeys?: string[]
  show?: boolean
  scriptlet?: boolean
  actionsConfig?: ActionsConfig
  grid?: boolean
}

export type GenerateChoices = (input: string) => Choice<any>[] | Promise<Choice<any>[]>

export type GenerateActions = (input: string) => Action[] | Promise<Action[]>

export type Choices<Value> = (
  | (string | Choice)[]
  | Choice<Value>[]
  | (() => Choice<Value>[])
  | (() => Promise<Choice<Value>[]>)
  | Promise<Choice<any>[]>
  | GenerateChoices
) & {
  preload?: boolean
}

export type Preview =
  | string
  | void
  | (() => string)
  | (() => void)
  | (() => Promise<string>)
  | (() => Promise<void>)
  | ((input: string) => string)
  | ((input: string) => void)
  | ((input: string) => Promise<any>)
  | ((input: string) => Promise<void>)

export type Actions =
  | Action[]
  | (() => Action[])
  | (() => Promise<Action[]>)
  | Promise<Action[]>
  | GenerateActions

export type Panel =
  | string
  | void
  | (() => string)
  | (() => void)
  | (() => Promise<string>)
  | (() => Promise<void>)
  | ((input: string) => string)
  | ((input: string) => void)
  | ((input: string) => Promise<any>)
  | ((input: string) => Promise<void>)

export type Flags = {
  [key: string]: boolean | string
} & Partial<Record<ModifierKeys, boolean | string>>

export type FlagsWithKeys = {
  [key: string]: {
    shortcut?: string
    name?: string
    group?: string
    description?: string
    bar?: 'left' | 'right' | ''
    flag?: string
    preview?: Choice['preview']
    hasAction?: boolean
  }
} & {
  sortChoicesKey?: string[]
  order?: string[]
}
export type FlagsObject = FlagsWithKeys | boolean
export type ActionsConfig = {
  name?: string
  placeholder?: string
  active?: string
}

export type Action = {
  name: string
  description?: string
  value?: any
  shortcut?: string
  group?: string
  flag?: string
  visible?: boolean
  enter?: string
  onAction?: ChannelHandler
  condition?: Shortcut['condition']
  close?: boolean
  index?: number
}

export interface AppState {
  input?: string
  actionsInput?: string
  inputChanged?: boolean
  flaggedValue?: any
  flag?: string
  tab?: string
  tabIndex?: number
  value?: any
  index?: number
  focused?: Choice
  history?: Script[]
  modifiers?: string[]
  count?: number
  name?: string
  description?: string
  script?: Script
  submitted?: boolean
  shortcut?: string
  paste?: string
  cursor?: number
  preview?: string
  keyword?: string
  mode?: Mode
  ui?: UI
  multiple?: boolean
  selected?: any[]
  action?: Action
}

export type ChannelHandler = (input?: string, state?: AppState) => void | Promise<void>

export type SubmitHandler = (
  input?: string,
  state?: AppState
) => void | symbol | Promise<void | symbol>

export type PromptConfig = {
  validate?: (input: string) => boolean | string | Promise<boolean | string>
  choices?: Choices<any> | Panel
  actions?: Action[] | Panel
  initialChoices?: Choices<any> | Panel
  html?: string
  formData?: any
  className?: string
  flags?: FlagsObject
  actions?: Action[]
  preview?:
    | string
    | ((input: string, state: AppState) => string | Promise<string> | void | Promise<void>)
  panel?: string | (() => string | Promise<string>)
  onNoChoices?: ChannelHandler
  onEscape?: ChannelHandler
  onAbandon?: ChannelHandler
  onBack?: ChannelHandler
  onForward?: ChannelHandler
  onUp?: ChannelHandler
  onDown?: ChannelHandler
  onLeft?: ChannelHandler
  onRight?: ChannelHandler
  onTab?: ChannelHandler
  onKeyword?: ChannelHandler
  onInput?: ChannelHandler
  onActionsInput?: ChannelHandler
  onChange?: ChannelHandler
  onBlur?: ChannelHandler
  onSelected?: ChannelHandler
  onChoiceFocus?: ChannelHandler
  onMessageFocus?: ChannelHandler
  onPaste?: ChannelHandler
  onDrop?: ChannelHandler
  onDragEnter?: ChannelHandler
  onDragLeave?: ChannelHandler
  onDragOver?: ChannelHandler
  onMenuToggle?: ChannelHandler
  onInit?: ChannelHandler
  onSubmit?: SubmitHandler
  onValidationFailed?: ChannelHandler
  onAudioData?: ChannelHandler
  debounceInput?: number
  debounceChoiceFocus?: number
  keyword?: string
  shortcodes?: {
    [key: string]: any
  }
  env?: any
  shortcuts?: Shortcut[]
  show?: boolean
  grid?: boolean
  columns?: number
  columnWidth?: number
  rowHeight?: number
  gridGap?: number
  gridPadding?: number
} & Partial<Omit<PromptData, 'choices' | 'id' | 'script' | 'preview'>>

export type CronExpression =
  | `${string} ${string} ${string} ${string} ${string}`
  | `${string} ${string} ${string} ${string} ${string} ${string}`

type OptModifier = 'opt' | 'option' | 'alt'
type CmdModifier = 'cmd' | 'command'
type CtrlModifier = 'ctrl' | 'control'
type ShiftModifier = 'shift'

type Modifier = OptModifier | CmdModifier | CtrlModifier | ShiftModifier
type Key = string
type Separator = ' ' | '+'

type ModifierCombination =
  | Modifier
  | `${Modifier}${Separator}${Modifier}`
  | `${Modifier}${Separator}${Modifier}${Separator}${Modifier}`
  | `${Modifier}${Separator}${Modifier}${Separator}${Modifier}${Separator}${Modifier}`

export type MetadataShortcut = `${ModifierCombination}${Separator}${Key}`

export interface Metadata {
  /** The author's name */
  author?: string
  /**
   * Specifies the name of the script as it appears in the Script Kit interface.
   * If not provided, the file name will be used.
   */
  name?: string
  /** Provides a brief description of the script's functionality. */
  description?: string
  /** The string displayed in the Enter button */
  enter?: string
  /** Defines an alternative search term to find this script */
  alias?: string
  /** Defines the path to an image to be used for the script */
  image?: string
  /** Defines a global keyboard shortcut to trigger the script. */
  shortcut?: MetadataShortcut
  /**
   * Similar to {@link trigger}, defines a string that, when typed in the main menu
   * followed by a space, immediately executes the script.
   */
  shortcode?: string
  /**
   * Similar to {@link shortcode}, defines a string that, when typed in the main menu,
   * immediately executes the script.
   */
  trigger?: string
  /** @deprecated Use `expand` instead. Designates the script as a text expansion snippet and specifies the trigger text. */
  snippet?: string
  /** Designates the script as a text expansion snippet and specifies the trigger text. */
  expand?: string
  /** Associates a keyword with the script for easier discovery in the main menu. */
  keyword?: string
  /**
   * Indicates that user input in the main menu should be passed as an argument to the script.
   * "true" indicates that the entire input should be passed as an argument
   * A string indicates a "postfix", then match the text before the string
   * A RegExp indicates a "pattern" to match
   * */
  pass?: boolean | string
  /** Assigns the script to a specific group for organization in the main menu. */
  group?: string
  /** Excludes the script from appearing in the main menu. */
  exclude?: boolean
  /** Specifies a file or directory to watch for changes, triggering the script upon modifications. */
  watch?: string
  /** Indicates whether to disable logs */
  log?: boolean
  /** Designates the script as a background process, running continuously in the background. */
  background?: boolean | 'auto'
  /** Associates the script with system events such as sleep, wake, or shutdown. */
  system?:
    | 'suspend'
    | 'resume'
    | 'on-ac'
    | 'on-battery'
    | 'shutdown'
    | 'lock-screen'
    | 'unlock-screen'
    | 'user-did-become-active'
    | 'user-did-resign-active'

  /** Specifies a cron expression for scheduling the script to run at specific times or intervals. */
  schedule?: CronExpression
  /** Indicates whether the script can be run through the rest API */
  access?: 'public' | 'key' | 'private'
  /** Indicates whether the script can return a response through the rest API */
  response?: boolean
  /** Indicates the order of the script in its group in the main menu */
  index?: number
  /** Indicates whether to disable logs for the script */
  log?: boolean
  /** Optimization: if this script won't require a prompt, set this to false */
  prompt?: boolean
}

export interface ProcessInfo {
  pid: number
  scriptPath: string
  child: ChildProcess
  type: ProcessType
  values: any[]
  date: number
}
