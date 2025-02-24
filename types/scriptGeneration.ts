export type ScriptGenerationEvent =
  | { type: 'SET_PROMPT'; prompt: string }
  | { type: 'GENERATE_DRAFT'; timestamp: string }
  | { type: 'START_STREAMING_DRAFT' }
  | { type: 'START_STREAMING_FINAL' }
  | { type: 'START_FINAL' }
  | { type: 'GENERATE_FINAL' }
  | { type: 'CANCEL_GENERATION' }
  | { type: 'SAVE_SCRIPT' }
  | { type: 'SAVE_AND_INSTALL' }
  | { type: 'RESET' }
  | { type: 'SET_USAGE'; count: number; limit: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'FROM_SUGGESTION'; value: boolean }
  | { type: 'UPDATE_EDITABLE_SCRIPT'; script: string }
  | { type: 'SET_SCRIPT_ID'; scriptId: string }
  | { type: 'COMPLETE_GENERATION'; script: string }
  | { type: 'SET_LUCKY_REQUEST'; requestId: string }
  | { type: 'SET_TRANSITIONING_TO_FINAL'; value: boolean }
