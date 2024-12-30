Below are **mini docs** for each prompt, **with three short examples** demonstrating different features or use cases. Feel free to adapt or expand them!

---

## 1. **arg**  
```ts
// Basic text input
let name = await arg("What's your name?")

// Array of suggestions
let fruit = await arg("Pick a fruit", ["Apple", "Banana", "Cherry"])

// Allow freeform text while still showing suggestions
let value = await arg(
  { placeholder: "Type anything or pick a color", strict: false },
  ["red", "green", "blue"]
)
```
**Notes**:  
- `strict: false` lets you submit any typed text if no matching suggestion is found.  
- You can pass a function for dynamic or async suggestions.

---

## 2. **div**  
```ts
// Display static HTML
await div(`<h1>Hello world!</h1>`)

// Display Markdown using md()
await div(md(`# **Markdown** is *cool*`))

// Add tailwind classes for styling
await div(`<h2>Centered Title</h2>`, `flex flex-col items-center p-4`)
```
**Notes**:  
- Great for showing read-only content, images, or info messages.  
- You can pass a `PromptConfig` object instead of a plain string for more control.

---

## 3. **editor**  
```ts
// Basic usage: load some text
let finalText = await editor(`// Your code here\nconsole.log("Hi!")`)

// Listen to input changes for live previews
await editor({
  value: `# Type Markdown here`,
  onInput: async newText => {
    setPanel(md(newText))
  },
})

// Pass extra config (language, line numbers, etc.)
let code = await editor({
  value: `function greet() { return "Hello"; }`,
  language: "js",
  lineNumbers: "on",
})
```
**Notes**:  
- The built-in Monaco editor supports syntax highlighting for JS, TS, JSON, Markdown, etc.  
- Use `onInput` or `onBlur` to handle editor events.

---

## 4. **form**  
```ts
// 1. Basic form with one input
let result = await form(`
  <input name="email" type="email" placeholder="Enter your email" />
`)

// 2. Multiple fields
let userData = await form(`
  <label>Name: <input name="name" type="text"></label>
  <label>Age:  <input name="age" type="number"></label>
`)

// 3. Custom form controls
let advanced = await form(`
  <input name="color" type="color" value="#ff0000"/>
  <select name="fruit">
    <option>Apple</option>
    <option>Banana</option>
  </select>
`)
```
**Notes**:  
- Returns an object keyed by the `name` attribute in your form.  
- Perfect for custom layouts or fields not covered by simpler prompts.

---

## 5. **drop**  
```ts
// 1. Basic usage: return dropped files or text
let droppedData = await drop()
console.log(droppedData)

// 2. Differentiate if user dropped text vs. files
let dropResult = await drop()
if (typeof dropResult === "string") {
  console.log("User dropped text:", dropResult)
} else {
  console.log("User dropped file list:", dropResult)
}

// 3. Combining with other logic
await div("<h2>Drop a file or text here</h2>")
let result = await drop()
await div(md(`You dropped: **${JSON.stringify(result)}**`))
```
**Notes**:  
- Returns an array of file objects if the user drops files, or a string if they drag text from the browser.

---

## 6. **fields**  
```ts
// 1. Simple array usage
let [name, age] = await fields(["Name", "Age"])

// 2. Named fields with default values
let [title, rating] = await fields([
  { label: "Title", placeholder: "Movie Title" },
  { label: "Rating", type: "number", value: 5 },
])

// 3. Return objects if you prefer
let result = await fields({
  fields: [
    { name: "username", label: "Username" },
    { name: "email", type: "email", placeholder: "Email" },
  ],
})
console.log(result) // e.g., { username: "abc", email: "xyz@example.com" }
```
**Notes**:  
- Returns an array or object (depending on usage).  
- Each field can have `type`, `placeholder`, etc.

---

## 7. **path**  
```ts
// 1. Simple usage
let filePath = await path()
console.log("User selected:", filePath)

// 2. Only pick folders
let dir = await path({
  placeholder: "Pick a folder",
  onlyDirs: true,
})

// 3. Restrict to a certain startPath
let start = home("projects")
let chosenPath = await path({ startPath: start })
```
**Notes**:  
- Typically used to let users pick a file or folder from the filesystem.  
- You can add advanced options (like hidden files, missing choices, etc.).

---

## 9. **term**  
```ts
// 1. Launch a simple terminal with a command
await term("echo Hello from the embedded terminal")

// 2. Start a shell in a specific directory
await term({
  command: "ls",
  cwd: home("projects/my-app"),
})

// 3. Interactive usage
await term("npx create-react-app my-new-project")
```
**Notes**:  
- Launches an embedded terminal window for interactive commands.  
- Great for scripts that require user input in the CLI environment.

---

## 10. **template**  
```ts
// 1. Replace placeholders $1, $2, etc.
let text = await template("Hello $1!")
console.log("User typed:", text)

// 2. Multiple placeholders
let message = await template(`
Dear $1,
Please meet me at $2 o'clock.
`)

// 3. Provide a default value
let note = await template(`Thanks for $$1`, {
  // The $$ is used if you have the prompt config (or you can do ${1:default} in the string)
})
```
**Notes**:  
- `$1`, `$2`, etc. act like snippet placeholders you can tab between.  
- Use it when you want a short “fill-in-the-blanks” template.

---

## 11. **chat**  
```ts
// 1. Basic usage
await chat()

// 2. Preload messages or respond after user types
await chat({
  onInit: async () => {
    chat.addMessage({
      text: "Hello, how can I help?",
      position: "left",
    })
  },
})

// 3. Programmatically add messages
let conversation = await chat()
console.log("User conversation:", conversation)
```
**Notes**:  
- Creates a chat-like interface.  
- You can programmatically add or manipulate messages, and the user can type back like a chat platform.

---

## 12. **micro**  
```ts
// 1. Minimal text input
let result = await micro("Type a quick note")
console.log(result)

// 2. With suggestions (like `arg()`)
let color = await micro("Pick color", ["red", "green", "blue"])

// 3. With actions
await micro("Search something", ["Item1", "Item2"], [
  {
    name: "Details",
    shortcut: "cmd+d",
    onAction: input => {
      div(`You pressed Details on ${input}`)
    },
  },
])
```
**Notes**:  
- Similar to `arg()`, but uses a more compact UI.  
- Good for quick ephemeral prompts.

---

## 13. **select**  
```ts
// 1. Basic multi-select with checkboxes
let choices = await select("Pick your favorites", ["Apple", "Banana", "Cherry"])

// 2. Provide objects with values
let picks = await select("Select tasks to run", [
  { name: "Clean", value: "clean" },
  { name: "Build", value: "build" },
  { name: "Deploy", value: "deploy" },
])

// 3. Async dynamic choices
await select("Type to search", async input => {
  let filtered = await someApiLookup(input)
  return filtered.map(item => item.name)
})
```
**Notes**:  
- Returns an **array** of selected items.  
- Great for scenarios where multiple picks are needed at once.


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