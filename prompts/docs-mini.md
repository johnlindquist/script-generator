## Prompts
1. **arg**: `await arg(label, choicesOrHtmlOrFn)`
   - Text input, optional suggestions array, async loading, etc.
   - `strict: false` allows freeform text.
2. **div**: `await div(html, tailwindClasses)`
   - Display static HTML or use `md()` for Markdown.
3. **editor**: `await editor(initialTextOrConfig)`
   - Monaco-based text editor in a prompt. `onInput` to update preview.
4. **form**: `await form(htmlString)`
   - Return an object from an HTML form’s inputs (by `name`).
5. **drop**: `await drop()`
   - Receive dropped files (array) or text (string).
6. **fields**: `await fields(["Name", "Age"])`
   - Rapid form generation returning an array or object of values.
7. **selectFile / selectFolder**: 
   - System file/folder pickers.
8. **path**: `await path()`
   - Terminal-like navigation to pick a path.
9. **term**: `await term(commandString)`
   - Embedded terminal session for interactive CLI usage.
10. **template**: `await template("Hello $1!")`
    - Snippet-like placeholders `$1, $2, etc.` in an editor.
11. **chat**: `await chat()`
    - Chat-like UI. Add messages, etc.
12. **micro**: `await micro(label, choices, actions)`
    - Same as `arg` but minimal UI.
13. **select**: `await select("Select multiple", ["a","b","c"])`
    - Multi-selection with checkboxes.

## Display & Actions
- **setPanel** / `panel`: Sets HTML under the input.
- **setPreview**: For a preview pane.
- **md**: Convert Markdown to HTML.
- **highlight**: Syntax-highlight markdown code blocks.
- **setStatus**: Tray icon + message, ephemeral.
- **notify**: System notification.
- **toast**: Small in-app toast.
- **menu**: Override or reset top-level script menu items.

## Windows
- **hide** / **blur** / **focus**: Control the main prompt’s focus.
- **alwaysOnTop**, **width**, **height**: In prompt config.
- **widget**: `await widget(html, { width, height, x, y, ... })`
  - Stand-alone HTML window with Tailwind & petite-vue.

## Editor
- **editor.append**: Append text at the cursor.
- **editor** returns typed content upon submit.

## Shortcuts & Input
- **registerShortcut("opt x", fn)** / **unregisterShortcut**: Temporary global hotkey.
- **keyboard**, **mouse**: Interact with OS-level input.
- **onClick / onKeydown / onMousedown**: Low-level global event hooks.

## DB & Files
1. **db**: Simple JSON store: 
   ```js
   let store = await db(["apple"]); store.items.push("banana"); await store.write()
   ```
2. **readFile / writeFile / readdir / copyFile / pathExists** from fs/promises
3. **ensureReadFile**: If missing, creates with default content.
4. **download**: Returns `Buffer` or writes directly.
5. **remove**, **move**, etc. from fs-extra.
6. **path**: `home()`, `kenvPath()`, `tmpPath()`, etc.

## Exec & Shell
1. **exec**: `await exec("ls -la", { cwd: home(), shell: "/bin/zsh" })`
2. **$** (zx-like): 
   ```js
   let branch = await $`git branch --show-current`
   ```
3. **execa**: Under the hood for `exec`.
4. **term**: Interactive. `exec` for non-interactive.

## Network
- **get/put/post/del**: Axios wrappers
- **patch**: Also available.

## System
- **say("text")**: TTS
- **beep()**: System beep
- **notify("message")**: System notification
- **shell**: See above
- **keyboard**: e.g. `keyboard.type("Hello!")`
- **getClipboardHistory / removeClipboardItem**: Manage stored clipboard entries.

## Audio/Video
- **mic** / **mic.start()**, **mic.stop()**: Record audio, returns buffer.
- **webcam**: Capture from webcam (image buffer).
- **playAudioFile**, **registerShortcut("opt x", ...)** to cancel TTS.

## Utility
- **inspect(obj)**: Opens a text file with JSON preview.
- **dev(obj)**: Opens Chrome DevTools with `x = obj` in console.
- **db**: Quick JSON store in `~/.kenv/db/`.
- **uuid**: Random UUID.
- **env("VAR", fallbackPrompt)**: Load or set `.env` vars.
- **notify / toast**: UI alerts.
- **prettier**: Format code, if installed.
- **createChoiceSearch / groupChoices**: Utility for advanced filtering.
- **preventSubmit**: Symbol to block submission in `onSubmit` hooks.
- **mainScript()**: Return to main menu.

## Common Aliases
- **path.join**, **path.basename**, **path.resolve** from Node’s `path`.
- **chalk** for coloring terminal output.
- **replaceInFile** for quick text replacements.

## Script Flow
- **submit(value)**: End prompt and return `value`.
- **exit()**: End script immediately.
- **wait(ms)**: Simple promise delay.

## Cron / System Events
- Use `// Schedule: cronExp` for scheduled scripts. 
- Use `// System: eventName` (like `sleep`, `wake`, etc.) to handle system events.