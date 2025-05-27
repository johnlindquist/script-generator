Below are **mini docs** for each prompt, **with three short examples** demonstrating different features or use cases. Feel free to adapt or expand them!

---

## 1. **arg**

```ts
// Basic text input
let name = await arg("What's your name?")

// Array of suggestions
let fruit = await arg('Pick a fruit:', ['Apple', 'Banana', 'Cherry'])

// Allow freeform text while still showing suggestions and a hint
let color = await arg(
  {
    placeholder: 'Type a color or choose one',
    hint: 'Enter any color name',
    strict: false,
  },
  ['Red', 'Green', 'Blue']
)
```

**Notes**:

- `strict: false` lets you submit any typed text if no matching suggestion is found.
- You can pass a function for dynamic or async suggestions.

---

## 2. **div**

```ts
// Display static HTML
await div(`<h1>Hello Script Kit!</h1>`)

// Display Markdown using md()
await div(md(`# **Markdown** is *awesome*`))

// Add Tailwind CSS classes for styling
await div(`<h2 class="text-2xl text-blue-500">Styled Title</h2>`, `p-4 bg-gray-100`)
```

**Notes**:

- Great for showing read-only content, images, or info messages.
- You can pass a `PromptConfig` object for more control (e.g., adding shortcuts).

---

## 3. **editor**

```ts
// Basic usage: get text from the user
let notes = await editor('Enter your notes here:')

// Load initial text and set language
let code = await editor({
  value: `console.log("Hello TypeScript!");`,
  language: 'typescript',
  hint: 'Edit the TypeScript code',
})

// Listen to input changes for a live preview panel
await editor({
  value: `# Start Typing Markdown`,
  onInput: async newText => {
    setPanel(md(newText)) // Show rendered Markdown in a panel below
  },
})
```

**Notes**:

- The built-in Monaco editor supports syntax highlighting for many languages.
- Use `onInput`, `onBlur`, or `onSubmit` to handle editor events.

---

## 4. **form**

```ts
// Basic form with one input
let { email } = await form(`<input name="email" type="email" placeholder="Enter your email" />`)

// Multiple fields with labels
let userData = await form(
  md(`
  ## User Details
  <label>Name: <input name="name" type="text" class="input"></label>
  <label>Age:  <input name="age" type="number" class="input"></label>
`)
) // Using md for structure and Tailwind classes via @apply if setup

// Form with various input types
let preferences = await form(
  md(`
  ### Preferences
  Color: <input name="color" type="color" value="#ff0000"/>
  Fruit: 
  <select name="fruit" class="select">
    <option>Apple</option>
    <option>Banana</option>
  </select>
`)
)
```

**Notes**:

- Returns an object keyed by the `name` attribute of your form elements.
- Perfect for custom layouts or when `fields` is too restrictive.

---

## 5. **fields**

```ts
// Simple array usage for labels, returns an array of string values
let [username, password] = await fields(['Username', 'Password'])

// Define fields with more properties (label, type, placeholder, initial value)
let [productName, quantity] = await fields([
  { label: 'Product Name', placeholder: 'e.g., Awesome Gadget' },
  { label: 'Quantity', type: 'number', value: '1' },
])

// Process field values to build an object
const fieldDefs = [
  { name: 'email', label: 'Email Address', type: 'email' },
  { name: 'subscribe', label: 'Subscribe to newsletter?', type: 'checkbox', value: 'true' }, // Checkboxes return string "true"/"false"
]
const values = await fields(fieldDefs)
const contactInfo = fieldDefs.reduce((obj, field, index) => {
  obj[field.name] = field.type === 'checkbox' ? values[index] === 'true' : values[index]
  return obj
}, {})
console.log(contactInfo)
```

**Notes**:

- Returns an array of strings corresponding to the input values.
- Each field can be a string (for label) or an object for detailed configuration.

---

## 6. **path**

```ts
// Simple usage: select a file or folder
let selectedPath = await path()
console.log('User selected:', selectedPath)

// Only allow picking folders, starting from the user's 'Documents'
let projectDir = await path({
  placeholder: 'Pick a project folder',
  startPath: home('Documents'),
  onlyDirs: true,
})

// Restrict to a certain startPath and provide a hint
let configFile = await path({
  startPath: kenvPath(), // Start in the current .kenv directory
  hint: 'Select a configuration file from your kenv',
})
```

**Notes**:

- Lets users pick a file or folder from the filesystem.
- Options include `startPath`, `onlyDirs`, `showHidden`, etc.

---

## 7. **select**

```ts
// Basic multi-select with an array of strings
let favoriteFruits = await select('Pick your favorite fruits (multi-select):', [
  'Apple',
  'Banana',
  'Cherry',
  'Date',
])

// Provide objects with name, value, and description
let selectedTask = await select('Select a task to run:', [
  { name: 'Run Build', value: 'build_script', description: 'Compiles the project' },
  { name: 'Run Tests', value: 'test_script', description: 'Executes all unit tests' },
  { name: 'Deploy', value: 'deploy_script', description: 'Deploys to production' },
])

// Async dynamic choices based on user input
let character = await select('Type to search Star Wars characters:', async input => {
  if (!input) return [{ name: 'Type to search...', disabled: true }]
  const response = await get(`https://swapi.dev/api/people/?search=${input}`)
  return response.data.results.map(p => ({ name: p.name, value: p }))
})
```

**Notes**:

- Returns an **array** of selected items (values).
- Great for scenarios where multiple choices are needed, or for single selection from a rich list.

---

## 8. **drop**

```ts
// 1. Drop files and get their paths
let droppedItems = await drop('Drop files onto this area')
if (Array.isArray(droppedItems) && droppedItems.length > 0 && droppedItems[0].path) {
  let filePaths = droppedItems.map(item => item.path).join('\n')
  await editor({ value: `Dropped file paths:\n${filePaths}`, hint: 'File paths listed' })
} else if (typeof droppedItems === 'string') {
  // Handle dropped text
  await editor({ value: `Dropped text: ${droppedItems}`, hint: 'Text content displayed' })
} else {
  await div(md('Nothing specific dropped or an unknown type.'))
}

// 2. Differentiate based on dropped content (more robust check)
let result = await drop('Drop files or text')
if (typeof result === 'string') {
  console.log('User dropped text:', result)
  await div(md(`You dropped text: \`${result}\``))
} else if (Array.isArray(result) && result.length > 0 && result[0].path) {
  console.log(
    'User dropped file(s):',
    result.map(f => f.path)
  )
  await div(md(`You dropped: **${result.map(f => f.name).join(', ')}**`))
}

// 3. Use in a flow, e.g., upload dropped image
// (Conceptual: upload logic not shown)
await div("<h2>Drop an image to 'upload'</h2>")
let imageDrop = await drop()
if (Array.isArray(imageDrop) && imageDrop[0]?.path) {
  // const uploadResult = await uploadImage(imageDrop[0].path);
  await div(md(`Simulated upload of: **${imageDrop[0].name}**`))
}
```

**Notes**:

- Returns an array of file objects (each with `path`, `name`, etc.) if the user drops files.
- Returns a string if the user drags and drops text (e.g., from a browser).

---

## 9. **env**

```ts
// Load MY_API_KEY, or prompt to set it if not found
let apiKey = await env('MY_API_KEY')
console.log(`API Key: ${apiKey}`)

// Prompt with a custom message and choices if variable isn't set
let preferredShell = await env('PREFERRED_SHELL', async () => {
  return await arg('Select your preferred shell:', ['bash', 'zsh', 'fish'])
})
console.log(`Shell: ${preferredShell}`)

// Prompt for a secret (input will be masked)
let dbPassword = await env('DATABASE_PASSWORD', {
  secret: true,
  placeholder: 'Enter your secure database password',
})
```

**Notes**:

- Stores and retrieves variables from `~/.kenv/.env`.
- Ideal for API keys, user preferences, and configurations.

---

## 10. **term**

```ts
// Launch a simple terminal and run a command
await term('echo Hello from the embedded terminal!')

// Start a shell in a specific directory and list files
await term({
  command: 'ls -la', // Command to execute
  cwd: home('Documents'), // Set working directory
  hint: 'Listing files in Documents',
})

// Interactive usage for a CLI tool
await term('npx degit sveltejs/template my-svelte-project')
```

**Notes**:

- Launches an embedded terminal window for interactive commands.
- Great for scripts that require user input in a CLI environment or running CLI tools.

---

## 11. **template**

```ts
// Simple template with one placeholder
let greeting = await template("Hello, $1! What's new?")
console.log("User's response:", greeting) // Contains the filled template

// Template with multiple placeholders and default values
let meetingInvite = await template(
  md(`
  ## Meeting Invite
  Hi \${1:Team},
  Let's meet on \${2:Monday} at \${3:10 AM}.
  Topic: \${4:Project Update}
`)
)
// meetingInvite will be the fully filled Markdown string

// Using choice placeholders
let mood = await template("I'm feeling \${1|happy,sad,excited,calm} today.")
console.log(mood) // e.g., "I'm feeling happy today."
```

**Notes**:

- `$1`, `${2:default}`, etc., act like snippet placeholders you can tab between.
- Use for quick "fill-in-the-blanks" text generation.

---

## 12. **chat**

```ts
// Basic chat session, returns array of messages on submit (e.g. Escape)
let conversationLog = await chat({ placeholder: 'Type your message...' })
console.log('Chat ended. Log:', conversationLog)

// Preload messages and respond after user types
await chat({
  onInit: async () => {
    chat.addMessage({ text: 'Hello! How can I assist you today?', position: 'left' })
  },
  onSubmit: async userInput => {
    if (userInput.toLowerCase().includes('help')) {
      chat.addMessage({ text: 'Sure, I can help with that!', position: 'left' })
    } else {
      chat.addMessage({ text: 'Interesting point!', position: 'left' })
    }
    // To keep chat open, you might need to avoid default submission or handle it
  },
})

// Programmatically adding messages to an active chat
// (This example implies a chat is already open or being managed by the script)
// await chat.addMessage({ text: "This is a system message.", position: "center", type: "system" });
// Note: For continuous interaction, use `onSubmit` to re-prompt or handle state.
// The following is a conceptual example of sending a message from outside onSubmit:
// setTimeout(() => chat.addMessage({ text: "A delayed message!", position: "left" }), 2000);
// await chat(); // To keep it open for the timeout
```

**Notes**:

- Creates a chat-like interface. `chat.addMessage()` adds messages.
- `onSubmit` is key for handling user input and responding. By default, submitting closes the chat.

---

## 13. **micro**

```ts
// Minimal text input
let quickNote = await micro('Jot down a quick note:')
console.log(quickNote)

// With suggestions (like `arg()`)
let quickColor = await micro('Quickly pick a color:', ['red', 'green', 'blue'])
console.log(`Selected: ${quickColor}`)

// With actions (config object for placeholder and actions)
await micro({
  placeholder: 'Search or action...',
  choices: ['Google Search', 'DuckDuckGo Search'],
  actions: [
    {
      name: 'Open Script Kit Docs',
      shortcut: 'cmd+d',
      onAction: () => open('https://scriptkit.com/docs'),
    },
  ],
})
```

**Notes**:

- Similar to `arg()`, but uses a more compact UI.
- Good for quick, ephemeral prompts where screen real estate is a concern.

---

## 14. **ai**

```ts
// Basic text generation
const storyStarter = ai('Write a one-sentence story starter about a lost robot.')
const sentence = await storyStarter("The robot's name was Rusty.") // Input can provide context
await div(md(sentence))

// Translate text using a specific model
const translateToSpanish = ai('Translate the following English text to Spanish:', {
  model: 'openai:gpt-4o-mini', // Example: specify provider and model
})
const spanishText = await translateToSpanish('Hello, how are you?')
await div(md(`Spanish: ${spanishText}`))

// Summarize selected text
const selectedText = await getSelectedText()
if (selectedText) {
  const summarizer = ai('Summarize this text in one concise sentence.')
  const summary = await summarizer(selectedText)
  await setSelectedText(`Summary: ${summary}`) // Paste summary back
} else {
  await div('No text selected to summarize.')
}
```

**Notes**:

- Returns a function that, when called with input text, generates an AI completion.
- Configure default provider/model via `.env` (e.g., `AI_DEFAULT_PROVIDER`, `AI_DEFAULT_MODEL`).
- For structured JSON output, see `generate`.

---

## 15. **generate**

```ts
// Extract structured data from text
const userInfoSchema = z.object({ name: z.string(), email: z.string().email().optional() })
const textInput = 'User: Alice (alice@example.com)'
const userInfo = await generate(textInput, userInfoSchema)
console.log(`Name: ${userInfo.name}, Email: ${userInfo.email || 'N/A'}`)

// Generate a list of items based on a schema
const todoSchema = z.object({
  tasks: z.array(z.object({ description: z.string(), done: z.boolean() })),
})
const projectPrompt = "Create 3 tasks for a 'Garden Cleanup' project. Mark first as done."
const todoList = await generate(projectPrompt, todoSchema)
todoList.tasks.forEach(task => console.log(`[${task.done ? 'x' : ' '}] ${task.description}`))

// Using a different model for generation
const productSchema = z.object({ productName: z.string(), features: z.array(z.string()) })
const adCopy = 'Generate a product name and 2 features for a new smart coffee mug.'
const productInfo = await generate(adCopy, productSchema, {
  model: 'anthropic:claude-3-opus-20240229',
})
await div(md(`## ${productInfo.productName}\n- ${productInfo.features.join('\n- ')}`))
```

**Notes**:

- Uses Zod (`z`) for defining the output schema. Make sure to `import { z } from 'zod'` if not automatically available or if Script Kit doesn't make `z` global. (Assuming `z` is globally available as per `kit.d.ts`).
- Ideal for converting natural language to structured JSON objects.

---

## 16. **assistant**

```ts
// Simple conversational assistant
const friendlyBot = assistant('You are a friendly and helpful assistant.')
friendlyBot.addUserMessage('Tell me a fun fact about space.')
let responseText = ''
for await (const chunk of friendlyBot.textStream) {
  responseText += chunk
}
await div(md(responseText))

// Assistant that streams to the chat UI
const chatBot = assistant('You are a concise chat bot.')
await chat({
  onSubmit: async input => {
    chat.addMessage({ text: '...', position: 'left' }) // Placeholder for AI response
    chatBot.addUserMessage(input)
    let fullReply = ''
    for await (const chunk of chatBot.textStream) {
      fullReply += chunk
      chat.setMessage(-1, { text: md(fullReply), position: 'left' }) // Update last message
    }
  },
})

// Assistant with a simple tool (conceptual, relies on autoExecuteTools or manual handling)
const calculatorTool = {
  add: {
    description: 'Adds two numbers.',
    parameters: z.object({ a: z.number(), b: z.number() }),
    execute: async ({ a, b }) => ({ result: a + b }),
  },
}
const mathBot = assistant('You are a math assistant. Use tools when needed.', {
  tools: calculatorTool,
  autoExecuteTools: true, // Simplifies tool calling flow
})
mathBot.addUserMessage('What is 5 plus 7?')
const mathResult = await mathBot.generate() // autoExecuteTools handles intermediate steps
await div(md(`MathBot says: ${mathResult.text}`))
```

**Notes**:

- Maintains conversation history. Use `addUserMessage`, `addSystemMessage`, etc.
- Stream responses with `textStream` or get the full interaction with `generate()`.
- Supports `tools` for extending capabilities. `autoExecuteTools: true` can simplify tool usage.

---

## 17. **hotkey**

```ts
// Capture a single hotkey combination
await div(md('Press any key combination to define a shortcut...'))
const keyInfo = await hotkey()
await editor(JSON.stringify(keyInfo, null, 2))
// Example keyInfo: { key: "s", command: true, shift: false, shortcut: "command s" }

// Use hotkey to trigger different actions
await div(md('Press Cmd+O to Open, Cmd+S to Save'))
const actionKey = await hotkey()
if (actionKey.shortcut === 'command o') await div('Open action triggered!')
if (actionKey.shortcut === 'command s') await div('Save action triggered!')

// Set a placeholder for the hotkey prompt
const customHotkey = await hotkey({ placeholder: 'Define your custom hotkey:' })
await div(md(`You pressed: **${customHotkey.shortcut}**`))
```

**Notes**:

- Captures a key combination (modifiers + one non-modifier key).
- Returns an object with details about the pressed keys and the formatted shortcut string.

---

## 18. **grid**

```ts
// Simple grid selection with string choices
let selectedColors = await grid('Select your favorite colors:', [
  'Red',
  'Green',
  'Blue',
  'Yellow',
  'Purple',
  'Orange',
])
await div(md(`You selected: ${selectedColors.join(', ')}`))

// Grid with object choices (name, value, html for custom rendering)
const imageChoices = [
  {
    name: 'Cat',
    value: 'cat_img.jpg',
    html: `<img src="http://placekitten.com/100/100" alt="Cat" class="w-24 h-24 object-cover"/>`,
  },
  {
    name: 'Dog',
    value: 'dog_img.jpg',
    html: `<img src="https://placedog.net/100/100" alt="Dog" class="w-24 h-24 object-cover"/>`,
  },
  {
    name: 'Fox',
    value: 'fox_img.jpg',
    html: `<img src="https://randomfox.ca/images/randomfox.jpg" alt="Fox" style="width:96px;height:96px;object-fit:cover"/>`,
  },
]
let chosenImages = await grid({ placeholder: 'Choose images:', columns: 3 }, imageChoices)
// chosenImages will be an array of values, e.g., ["cat_img.jpg"]

// Grid with dynamic choices and custom styling
const numbers = Array.from({ length: 9 }, (_, i) => ({ name: `${i + 1}`, value: i + 1 }))
let pickedNumber = await grid({
  placeholder: 'Pick a number (single selection behavior for grid can be faked)',
  choices: numbers,
  columns: 3,
  css: `.choice { border: 1px solid #ccc; text-align: center; padding: 10px; }
        .focused { background-color: lightblue !important; }`,
  // Note: Grid is typically multi-select. For single-select, you'd take the first item.
})
await div(md(`Number (first if multiple): ${pickedNumber[0]}`))
```

**Notes**:

- Similar to `select`, but displays choices in a grid layout.
- Useful for visual choices like images or a large number of compact options.
- Returns an array of selected values.

---

## 19. **eyeDropper**

```ts
// Basic usage: pick a color from the screen
await div(
  md(
    'Click the button above or use the prompt to activate eyedropper. Then click anywhere on screen.'
  )
)
const colorResult = await eyeDropper()
// Example colorResult: { sRGBHex: "#RRGGBB", rgb: "rgb(r,g,b)", ... }
if (colorResult) {
  await div(
    md(
      `Picked color: <span style="color:${colorResult.sRGBHex}; background-color:lightgray; padding:2px;">${colorResult.sRGBHex}</span>`
    )
  )
} else {
  await div(md('Eyedropper cancelled or failed.'))
}

// Using eyeDropper and immediately showing the hex value
const colorData = await eyeDropper({
  placeholder: 'Activate eyedropper and pick a color',
  hint: 'Click on the screen to select a color',
})
if (colorData?.sRGBHex) {
  await setSelectedText(colorData.sRGBHex) // Pastes the hex code
  await toast(`Copied ${colorData.sRGBHex} to clipboard!`) // Also copy it
  copy(colorData.sRGBHex)
}

// Use in a script flow
await div(md('## Design Tool\nPick a primary color:'))
const primaryColor = await eyeDropper()
if (primaryColor) {
  await div(md(`Primary color set to: ${primaryColor.sRGBHex}`))
  // ... further script logic using primaryColor.sRGBHex
}
```

**Notes**:

- Activates a system color picker/eyedropper tool.
- Returns an object with the color in various formats (hex, rgb, hsl, etc.).
- Behavior might vary slightly across operating systems.

---

## Display & Actions

- **`setPanel(htmlString)`**: Sets HTML content in the panel below the input.
- **`setPreview(htmlString)`**: Sets HTML content in the preview pane (usually to the right).
- **`setHint(textString)`**: Sets the hint text displayed below the input/choices.
- **`setInput(textString)`**: Programmatically sets the text in the input field.
- **`setChoices(choicesArray, config?)`**: Replaces the current list of choices.
- **`md(markdownString)`**: Converts a Markdown string to HTML.
- **`highlight(markdownString)`**: Syntax-highlights code blocks within a Markdown string.
- **`setStatus({ message: "...", status: "busy" })`**: Shows an icon and message in the system tray (ephemeral).
- **`notify({ title: "...", body: "..." })`**: Sends a system notification.
- **`toast("Message", options?)`**: Displays a small, temporary message within the Script Kit window.
- **`menu("Emoji", ["script1", "script2"])`**: Customizes the system tray menu.

## Windows & UI Control

- **`hide()` / `blur()` / `focus()`**: Control the main prompt's visibility and focus.
- **`show()`**: Ensure the main prompt window is visible.
- **`setBounds({ x, y, width, height })`**: Set the main prompt window's position and size.
- **`getActiveScreen()`**: Get details about the currently active display (for positioning).
- `alwaysOnTop`, `width`, `height`: These are properties of the `PromptConfig` object.
- **`widget(html, options?)`**: Creates a new, independent HTML window.
  - `widget.setState(newState)`: Updates reactive state in a petite-vue widget.
  - `widget.onClick(handler)`, `widget.onClose(handler)`, etc.: Event handlers for widgets.

## Editor (`editor` prompt specific API)

- **`editor.append("text")`**: Appends text at the current cursor position or end.
- **`editor.setText("new text")`**: Replaces the entire content of the editor.
- **`editor.getSelection()`**: Returns `{ text: "selected", start: 0, end: 8 }`.
- **`editor.moveCursor(offset)`**: Moves the cursor to a specific character offset.
- The `editor` prompt itself returns the full text content upon submission.

## Shortcuts & Global Input

- **`registerShortcut("cmd+opt+p", callback)`**: Registers a global hotkey that runs `callback`.
- **`unregisterShortcut("cmd+opt+p")`**: Removes a previously registered global hotkey.
- **`keyboard.type("Hello!")`**, `keyboard.tap(Key.Enter)`: Simulate keyboard input.
- **`mouse.leftClick()`**, `mouse.setPosition({ x:100, y:100 })`: Control the mouse.
- **`onClick(callback)`**, `onKeydown(callback)`: Listen for global mouse/keyboard events.

## DB & Files

1. **`db(nameOrData, defaultData?)`**: Simple JSON file store in `~/.kenv/db/`.
   ```ts
   let settings = await db('my-settings', { theme: 'dark' })
   settings.data.user = 'KitUser' // Modify data
   await settings.write() // Save changes
   ```
2. **`readFile(path)`**, **`writeFile(path, content)`**, **`readdir(path)`**, **`remove(path)`**, **`move(src, dest)`**, **`copyFile(src, dest)`**, **`pathExists(path)`**: Standard file system operations (mostly from fs-extra/fs/promises).
3. **`ensureReadFile(path, defaultContent?)`**: Reads a file; if it doesn't exist, creates it with `defaultContent`.
4. **`ensureDir(path)`**: Ensures a directory exists, creating it if necessary.
5. **`download(url, destinationPath?)`**: Downloads a file. Returns a `Buffer` if `destinationPath` is omitted.
6. **`trash(path)`**: Moves files/directories to the system trash.
7. Path helpers: **`home(...parts)`**, **`kenvPath(...parts)`**, **`tmpPath(...parts)`**, `kitPath(...parts)`.

## Exec & Shell

1. **`exec("command with args", options?)`**: Execute a shell command (uses `execa`).
   ```ts
   let { stdout } = await exec('git status --porcelain')
   ```
2. **`$(strings, ...values)`** (zx-like template literal):
   ```ts
   let branch = (await $`git branch --show-current`).stdout.trim()
   await $`echo Current branch is ${branch}`
   ```
3. **`cd(directory)`**, **`pwd()`**, **`which(command)`**: Shell navigation and utility commands (from shelljs).
4. **`term(commandOrOptions?)`**: Opens an interactive embedded terminal.

## Network

- **`get(url, config?)`**, **`post(url, data?, config?)`**, **`put(url, data?, config?)`**, **`patch(url, data?, config?)`**, **`del(url, config?)`**: Axios-based HTTP request functions.

## System & OS Interaction

- **`say("text to speak")`**: Text-to-speech.
- **`beep()`**: Plays the system beep sound.
- **`getSelectedText()`**: Copies selected text from the foreground application.
- **`setSelectedText("text to paste")`**: Pastes text into the foreground application.
- **`clipboard.readText()`**, `clipboard.writeText("text")`, `clipboard.readImage()`, `clipboard.writeImage(buffer)`: Interact with the system clipboard.
- **`getClipboardHistory()`**: Retrieves recent clipboard entries (if enabled in Script Kit).
- **`screenshot(displayId?, bounds?)`**: Captures a screenshot, returns a `Buffer`.
- **`applescript("osascript code")`**: Execute AppleScript on macOS.

## Audio/Video

- **`mic(config?)`**: Record audio from microphone, returns `Buffer`. `mic.start(config?)` / `mic.stop()` for streaming.
- **`webcam(config?)`**: Capture an image from webcam, returns `Buffer`.
- **`playAudioFile(filePath)`**: Plays an audio file.

## Utility

- **`inspect(object)`**: Opens a new editor window with a JSON representation of the object.
- **`dev(object)`**: Opens Chrome DevTools with the object assigned to `x` in the console.
- **`uuid()`**: Generates a random UUID string.
- **`createChoiceSearch(choices, config)`**: Utility for creating efficient client-side search functions for choices.
- **`groupChoices(choices, options)`**: Utility for grouping choices by a key.
- **`preventSubmit`**: A symbol returned from `onSubmit` to prevent the prompt from closing.
- **`mainScript()`**: Exits the current script and returns to the Script Kit main menu.
- **`run("other-script-name", ...args)`**: Executes another Script Kit script from the same kenv.

## Common Aliases & Libraries

- **`path.join(...)`**, `path.basename(...)`, etc.: Standard Node.js `path` module functions are available on the global `path` object.
- **`chalk`**: For colorizing terminal output (e.g., `console.log(chalk.blue("Hello"))`).
- **`replace(config)`**: Replaces text in files (from `replace-in-file`).

## Script Flow Control

- **`submit(valueToReturn)`**: Closes the current prompt and returns `valueToReturn` from the prompt function.
- **`exit(exitCode?)`**: Terminates the script immediately.
- **`wait(milliseconds)`**: Pauses script execution for a specified duration.

## Cron / System Events (Metadata)

- Use `// Schedule: cronExpression` (e.g., `// Schedule: 0 * * * *` for hourly) for scheduled scripts.
- Use `// System: eventName` (e.g., `// System: wake`) to trigger scripts on system events.
