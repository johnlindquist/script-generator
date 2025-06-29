# API

## Intro

### Welcome to Script Kit! 👋

Script Kit provides an opinionated set of global APIs meant to streamline the process of writing scripts. Many of them (such as prompts) are meant to interact with the app, but there are also many common APIs for working with files, etc, that are simply built-in node or third-party libraries exposed as globals.

_You do not need to use any of these APIs._ You are free to write your scripts and add whatever npm packages you like.

If you have questions, please reach out on our [Script Kit GitHub Discussions](https://github.com/johnlindquist/kit/discussions)

Happy Scripting! ❤️ - John Lindquist

### Play with Examples in the App

With Script Kit open, type `docs` and hit enter.

With any example open, press `cmd+p` to generate a script where you can experiment with examples contained in that section.

## Basics

### Script Imports

Script Kit Scripts start with importing the SDK:

```ts
import '@johnlindquist/kit'
```

You can also import any other library from npm and Script Kit will prompt you to install it (if you haven't already installed it in the current kenv).

```ts
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
```

### Top-Level await

All scripts are top-level await and essentially run top to bottom. Expect to see a lot of `await` in the scripts.

```ts
const downloadMarkdownPattern = home('Downloads', '*.md')
const files = await globby(downloadMarkdownPattern)

let totalContent = ''
for await (const file of files) {
  const content = await readFile(file, 'utf8')
  totalContent += content
}

await editor(totalContent)
```

### Global Helpers

All scripts are standard node.js scripts with added helpers from the SDK. Many of the most common helpers are provided in the global scope to save you from having to import them. For example, the follow script requires no imports:

```ts
const url = 'https://raw.githubusercontent.com/johnlindquist/kit-docs/refs/heads/main/API.md'
const response = await get(url)
const content = response.data
const apiPath = home('Downloads', 'API.md')
await writeFile(apiPath, content)
```

### Script Metadata

All metadata is optional. There are two metadata modes based on your preferences:

#### Metadata Comments

These are the defaults and have been around since Script Kit v1.

```
// Name: My Amazing Script
```

### Metadata Typed Global

Introduced in Script Kit v3, these allow a fully-typed, autocomplete experience:∫

```
metadata = {
  name: "My Amazing Script
}
```

### metadata

The `metadata` object can include:

- `name`: Display name in Script Kit UI (defaults to filename)
- `author`: Creator's name
- `description`: Brief script summary
- `enter`: Text shown on Enter button
- `alias`: Alternative search term
- `image`: Path to script icon
- `shortcut`: Global keyboard shortcut, e.g, cmd+opt+4
- `shortcode`: Execute when typed + space in menu
- `trigger`: Execute when typed in menu
- `expand`: Text expansion trigger (replaces deprecated `snippet`)
- `keyword`: Search keyword for menu
- `pass`: Pass menu input as arg (true/string/RegExp)
- `group`: Menu organization category
- `exclude`: Hide from menu
- `watch`: File/dir to watch for changes
- `log`: Disable logging if false
- `background`: Run as background process
- `system`: Trigger on system events (sleep/wake/etc)
- `schedule`: Cron expression for timing
- `access`: REST API access level (public/key/private)
- `response`: Allow REST API response
- `index`: Order within group### Metadata

#### metadata example

```ts
name: "Metadata Example",
  description: "This is an example of how to use metadata in a script",
  author: "John Lindquist",
};
```

## AI

Script Kit provides several AI-related global helpers to make it easy to integrate AI and LLM-powered features into your scripts. These helpers allow you to generate text, interact with assistants, and work with structured outputs using schemas.

### Setup

Script Kit automatically loads AI-related environment variables from your `~/.kenv/.env` file. To configure your default AI provider, model, and other options, add the following variables to your `~/.kenv/.env`:

- `AI_DEFAULT_PROVIDER` — Default AI provider (e.g. `openai`, `anthropic`, `google`, `xai`, `openrouter`)
- `AI_DEFAULT_MODEL` — Default model for the provider (e.g. `gpt-4o`, `claude-3-opus-20240229`)
- `AI_DEFAULT_TEMPERATURE` — Default temperature for completions (e.g. `0.7`)
- `AI_DEFAULT_MAX_TOKENS` — Default max tokens for completions (e.g. `1000`)

Example `~/.kenv/.env`:

```env
AI_DEFAULT_PROVIDER=anthropic
AI_DEFAULT_MODEL=claude-3-opus-20240229
AI_DEFAULT_TEMPERATURE=0.7
AI_DEFAULT_MAX_TOKENS=1000
```

These values are used as defaults for all AI helpers (`ai`, `assistant`, `generate`). You can override them per-call by passing options to the helpers.

### ai

The `ai` helper creates a text generation function using a prompt. Use it to generate text completions based on user input or other data.

#### ai example

```ts
const emojiStoryGenerator = ai('Generate a story using only emoji, no text.')
const story = await emojiStoryGenerator('Epic Fantasy')
await editor(story)
```

#### ai convert selected text

```ts
const text = await getSelectedText()

const rewriter = ai(`
You are an expert at cleaning up text for clarity and readability. 
- Only improve the text. 
- Do not include any other text in your response. 
- Avoid using markdown formatting.
`)

const cleanedText = await rewriter(text)

await setSelectedText(cleanedText)
```

#### ai prompt improver

```ts
const prompt = `
# Improve the User's Prompt Following the Patterns Below

> Practical prompt patterns to help anyone get clearer, more reliable answers from an AI agent.

| # | Pattern                       | Why It Matters                                                          | Template                                                                 | Example Prompt                                                                                             |
|---|-------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| 1 | Lead with the ask             | The model reads top-down; putting the goal first stops it wandering.    | \`Do X.[context]\`                                                        | "Summarize this PDF in 5 bullet points. The text is below: ..."                                            |
| 2 | Repeat the key ask at the end | Long contexts sometimes truncate; an end-cap protects you.              | \`...[detail]...REMEMBER: Do X.\`                                         | "List pros & cons, keep it balanced. REMEMBER: 5 pros, 5 cons."                                             |
| 3 | Specify output shape          | Dictating format cuts revision loops.                                   | \`Return as: 1) short title, 2) table(CSV).\`                             | "Give 3 holiday ideas. Format: destination, flight-time-hrs, avg cost."                                    |
| 4 | Use clear delimiters          | Backticks/headings/XML keep sections from blending.                     | \`TEXT TO ANALYSE\`                                                        | "Rate the style of the text between the fences."                                                            |
| 5 | Induce step-by-step thinking  | Planning first boosts multi-step accuracy.                              | \`Think step - by - step then answer.\`                                        | "Solve this puzzle. Think step-by-step before giving the final move."                                      |
| 6 | Ask it to plan its workflow   | For big jobs, AI outlines tasks before doing them.                      | \`First draft a plan, wait, then execute.\`                                | "We're writing an e-book. ❶ Outline chapters. ❷ Wait. ❸ When I say 'go', draft chapter 1."              |
| 7 | Limit or widen knowledge sources | Controls hallucination.                                               | \`Use only the info below. / Combine basic knowledge + this context.\`     | "Using only the product sheet below, write FAQs."                                                          |
| 8 | Guide information retrieval   | Helps AI pick the right docs before answering.                          | \`List which docs look relevant, then answer.\`                            | "30 sales memos attached. 1) Name the 5 most relevant. 2) Summarise their common points."                 |
| 9 | Show a style/example          | Anchors tone, length, vocabulary.                                       | \`Match the style of: <example>\`                                          | "Review this gadget in the style of the sample below: 'Short, witty, 3 key facts...'"                      |
| 10| Set correction handles        | One-line fixes let you steer quickly.                                   | \`If length > 150 words, shorten.\`                                        | "Describe blockchain to a child. If your answer is >150 words, cut it in half."                            |
| 11| Tell it when to stop or loop  | Prevents half-finished lists or runaway essays.                         | \`Keep going until you list 20 ideas, then stop.\`                         | "Brainstorm webinar titles. Give exactly 12, then finish."                                                  |
| 12| Request the hidden reasoning  | Good for audits; otherwise omit to keep it short.                       | \`After the answer, include a brief reasoning section.\`                   | "Which of these stocks looks over-valued? Answer first; add a 2-sentence rationale below a divider."        |
`

const text = await getSelectedText()

const promptImprover = ai(prompt)
menu('Improving Prompt') // Changes the script kit icon in the system tray
const improvedPrompt = await promptImprover(text)
menu('') // Resets the script kit icon in the system tray

await setSelectedText(improvedPrompt)
```

#### ai summarize

```ts
const summarize = ai('Summarize the following text in one sentence')

const summary = await summarize(
  'The quick brown fox jumps over the lazy dog. The lazy dog was not impressed. The fox, feeling dejected, went home.'
)

await div(
  md(`
## AI Text Summarization
**Input:** The quick brown fox jumps over the lazy dog. The lazy dog was not impressed. The fox, feeling dejected, went home.

**Summary:** ${summary}
`)
)
```

#### ai translate

```ts
const translateToFrench = ai('Translate to French')

const frenchText = await translateToFrench('Hello, how are you today?')

await div(
  md(`
## AI Translation
**English:** Hello, how are you today?

**French:** ${frenchText}
`)
)
```

### assistant

The `assistant` helper creates an AI assistant that can maintain context and handle multi-turn conversations. You can add user and system messages, and stream responses to the UI.

#### assistant example

```ts
const downloadsPath = home('Downloads')
const files = await readdir(downloadsPath)

const jester = assistant('Tell a joke about these file names.')
jester.addUserMessage(files.join('\n'))

await editor({
  onInit: async () => {
    for await (const chunk of jester.textStream) {
      editor.append(chunk)
    }
  },
})
```

#### assistant chat

```ts
const chatbot = assistant('You are a helpful assistant')

let currentMessage = ''
await chat({
  onSubmit: async input => {
    currentMessage = ''
    chatbot.stop()
    chat.addMessage({
      text: '...',
      position: 'left',
    })

    chatbot.addUserMessage(input)

    for await (const chunk of chatbot.textStream) {
      currentMessage += chunk
      const markdownMessage = md(currentMessage)
      const messageIndex = (await chat.getMessages()).length - 1
      chat.setMessage(messageIndex, {
        text: markdownMessage,
      })
    }
  },
})
```

#### assistant streaming

```ts
const ideaGenerator = assistant(
  "You're an idea generatior. Generate 3 extremely terse ideas based on my query"
)
const idea = await arg('Enter your idea')
ideaGenerator.addUserMessage(idea)

const remainingIterations = 3

const editorStreamer = async () => {
  for await (const chunk of ideaGenerator.textStream) {
    editor.append(chunk)
  }
  editor.append('\n\n')
}

await editor({
  onInit: async () => {
    for (let i = 0; i < remainingIterations; i++) {
      await editorStreamer()
      ideaGenerator.addSystemMessage('Pick your favorite idea and generate 3 more based on it')
    }
  },
})
```

#### assistant with tools

```ts
// Assistant with tools
const fakeWeatherAPI = ({ location }: { location: string }) => {
  if (location === 'moon') return "It's kinda dusty"
  return `The weather in ${location} is 70 and sunny.`
}

const weatherTool = {
  getWeather: {
    description: 'Call this tool for any weather location in the Universe',
    parameters: z.object({
      location: z.string().describe('The location to get the weather for'),
    }),
    execute: async ({ location }: { location: string }) => {
      console.log('Executing weather tool')
      const weather = fakeWeatherAPI({ location })
      return { weather }
    },
  },
}

console.log('Creating weather assistant')
const weatherAssistant = assistant(
  "You are a helpful weather assistant. Use the provided tools to answer the user's questions.",
  { tools: weatherTool }
)

weatherAssistant.addUserMessage("What's the weather on the moon?")
const result = await weatherAssistant.generate()

console.log('Generating weather assistant')
let response = ''
if ('text' in result) {
  response = result.text
} else {
  toast('No text response')
  await editor(JSON.stringify(result, null, 2))
  exit()
}

await div(
  md(`
## Assistant with Tools
**User:** What's the weather on the moon?
**Assistant:** ${response}
`)
)
```

### generate

The `generate` helper allows you to generate structured data from text using a schema (such as a Zod schema). This is useful for extracting information, performing analysis, or ensuring the output matches a specific format.

#### generate example

```ts
const result = await generate(
  'Generate 10 random users as an array in a property called "users"',
  z.object({
    users: z.array(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number(),
        email: z.string().email(),
      })
    ),
  })
)
const users = result.users

await editor(JSON.stringify(users, null, 2))
```

#### generate extract data from text

```ts
const userSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  email: z.string().email().optional(),
})

const extractUserInfo = async (text: string) => {
  return generate(`Extract user information from the text: ${text}`, userSchema)
}

const userInfo = await extractUserInfo(
  'My name is John Doe. I am 30 years old. You can reach me at john.doe@example.com'
)

await div(
  md(`
## User Info Extraction
**Text:** My name is John Doe. I am 30 years old. You can reach me at john.doe@example.com
**Result:**
\`\`\`json
${JSON.stringify(userInfo, null, 2)}
\`\`\`
`)
)
```

#### generate extract sentiment

```ts
const sentimentSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()).describe('Keywords that contributed to the sentiment'),
})

const extractSentiment = async (text: string) => {
  return generate(`Extract sentiment from the following text: ${text}`, sentimentSchema)
}

const sentimentResult = await extractSentiment("I love Script Kit! It's so easy to use.")

await div(
  md(`
## Sentiment Analysis
**Text:** I love Script Kit! It's so easy to use.
**Result:**
\`\`\`json
${JSON.stringify(sentimentResult, null, 2)}
\`\`\`
`)
)
```

#### generate structured data

```ts
// Global Generate Function Example
// This script demonstrates structured object generation using the global generate() function

// Define a schema for extracting contact information
const contactSchema = z.object({
  name: z.string().describe("Person's full name"),
  email: z.string().email().describe('Email address'),
  phone: z.string().optional().describe('Phone number if mentioned'),
  company: z.string().optional().describe('Company or organization'),
  role: z.string().optional().describe('Job title or role'),
  interests: z.array(z.string()).describe('Professional interests or expertise areas'),
  priority: z.enum(['low', 'medium', 'high']).describe('Priority level for follow-up'),
})

const contact = await generate('The coolest person in the world', contactSchema)

// Display the structured result
await div(
  md(`
# Contact Information Extracted

**Name:** ${contact.name}

**Email:** ${contact.email}

**Phone:** ${contact.phone || 'Not provided'}

**Company:** ${contact.company || 'Not provided'}

**Role:** ${contact.role || 'Not provided'}

**Priority:** ${contact.priority}

**Interests:**
${
  contact.interests.length > 0
    ? contact.interests.map(interest => `- ${interest}`).join('\n')
    : '- None specified'
}

      ---

* Generated using the global \`generate()\` function with Zod schema validation*
`)
)
```

#### generate tips

````ts
import { Script } from '@johnlindquist/kit'

let scripts = await getScripts()

// Check if kit-docs is a kenv

let kenv = path.basename(projectPath())
let isKitDocsInAKenv = kenv !== '.kenv'
let outFilePath = projectPath('TIPS.md')

if (isKitDocsInAKenv) {
  scripts = scripts.filter(script => script.kenv === kenv)
}

scripts.sort((a, b) => a.group.localeCompare(b.group))

// Group by group
let groups: {
  [key: string]: Script[]
} = {}
for (let script of scripts) {
  if (!groups[script.group]) groups[script.group] = []
  groups[script.group].push(script)
}

// Convert Groups into Markdown h2's with the Content Below
let markdownBody = ``
for (let [group, scripts] of Object.entries(groups)) {
  markdownBody += `## ${group}\n\n`
  for (let script of scripts.sort((a, b) => a.name.localeCompare(b.name))) {
    let content = await readFile(script.filePath, 'utf8')
    markdownBody += `### ${script.name}\n\n`
    markdownBody += '```ts\n'
    markdownBody += content
    markdownBody += '\n```\n\n'
  }
}

let markdown = `# Tips

Tips are a collection of answers to user questions in GitHub Discussions and our Discord organized by topic.

${markdownBody}
`.trim()

await writeFile(outFilePath, markdown)
````

### Switching AI Providers

Script Kit supports multiple AI providers out of the box: `openai`, `anthropic`, `google`, `xai`, and `openrouter`.

You can switch between providers by passing a model string in the format `provider:model-id` to the `model` option.

```ts
const result = await ai('Say hello', { model: 'anthropic:claude-3-opus-20240229' })
```

This will use Anthropic's Claude 3 Opus model. Supported providers are:

- `openai`
- `anthropic`
- `google`
- `xai`
- `openrouter`

#### ai provider switcher

```ts
const providers = [
  { name: 'OpenAI', value: 'openai', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  {
    name: 'Anthropic',
    value: 'anthropic',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  { name: 'Google', value: 'google', models: ['gemini-1.5-pro-latest', 'gemini-1.0-pro'] },
  { name: 'xAI (Grok)', value: 'xai', models: ['grok-1'] },
  {
    name: 'OpenRouter',
    value: 'openrouter',
    models: ['openrouter/cognitive-compute', 'openrouter/other-model'],
  },
]

const provider = await arg(
  'Select AI Provider',
  providers.map(p => ({ name: p.name, value: p.value }))
)
const selectedProvider = providers.find(p => p.value === provider)!
const model = await arg('Select Model', selectedProvider.models)
const prompt = await arg('Enter your prompt')

const modelString = `${provider}:${model}`

const result = await ai(prompt, { model: modelString })

await div(
  md(`
### Provider: ${selectedProvider.name}

### Model: ${model}

**Prompt:**

> ${prompt}

**Result:**

> ${result}
`)
)
```

## Prompts

### arg

- Accept text input from the user.
- Optionally provide a list of choices filtered by the text input.
- Optionally provide a list of actions to trigger when the user presses a shortcut.

1. The first argument is a string or a prompt configuration object.
2. The second argument is a list of choices, a string to render, or a function that returns choices or a string to render.

#### arg example

```ts
let value = await arg()
```

#### arg basic string input

```ts
let name = await arg('Enter your name')
```

#### arg onblur

```ts
await arg({
  // Prevent the "arg" prompt from closing when blurred
  // (or implement a custom behavior)
  onBlur: () => {},
})
```

#### arg with async choices object

```ts
let person = await arg('Select a person', async () => {
  let response = await get('https://swapi.dev/api/people/')
  // return an array of objects with "name", "value", and "description" properties
  return response?.data?.results.map(person => {
    return {
      name: person.name,
      description: person.url,
      value: person,
    }
  })
})
```

#### arg with async choices

```ts
let name = await arg('Select a name', async () => {
  let response = await get('https://swapi.dev/api/people/')
  return response?.data?.results.map(p => p.name)
})
```

#### arg with choices array

```ts
let name = await arg('Select a name', ['John', 'Mindy', 'Joy'])
```

#### arg with generated choices

```ts
let char = await arg('Type then pick a char', input => {
  // return an array of strings
  return input.split('')
})
```

#### arg with shortcuts

```ts
let url = 'https://swapi.dev/api/people'
let name = await arg(
  {
    placeholder: 'Select a name',
    shortcuts: [
      {
        name: 'Explore API',
        key: 'cmd+e',
        onPress: async () => {
          open(url)
        },
        bar: 'right',
      },
    ],
  },
  async () => {
    let response = await get(url)
    return response?.data?.results.map(p => p.name)
  }
)
```

### mini

Same API as `arg`, but with a compact format.

#### mini example

```ts
let name = await mini('Enter your name')
```

### micro

Same API as `arg`, but with a tiny, adorable UI.

#### micro example

```ts
let name = await micro('Enter your name')
```

### env

Load an env var if it exists, prompt to set the env var if not:

You can also prompt the user to set the env var using a prompt by nesting it in an async function:

#### env example

```ts
// Write write "MY_ENV_VAR" to ~/.kenv/.env
let MY_ENV_VAR = await env('MY_ENV_VAR')
```

#### env example with prompt

```ts
// Prompt the user to select from a path
let OUTPUT_DIR = await env('OUTPUT_DIR', async () => {
  return await path({
    hint: `Select the output directory`,
  })
})
```

### editor

The `editor` function opens a text editor with the given text. The editor is a full-featured "Monaco" editor with syntax highlighting, find/replace, and more. The editor is a great way to edit or update text to write a file. The default language is markdown.

#### editor example

```ts
let content = await editor()
```

#### editor load remote text content

```ts
let response = await get(`https://raw.githubusercontent.com/johnlindquist/kit/main/API.md`)

let content = await editor(response.data)
```

#### editor with initial content

```ts
let content = await editor('Hello world!')
```

### div

`div` displays HTML. Pass a string of HTML to `div` to render it. `div` is commonly used in conjunction with `md` to render markdown.

1. Just like arg, the first argument is a string or a prompt configuration object.
2. Optional:The second argument is a string of tailwind class to apply to the container, e.g., `bg-white p-4`.

#### div example

```ts
await div(`Hello world!`)
```

#### div with markdown

```ts
await div(
  md(`
# example!

### Thanks for coming to my demo
* This is a list
* This is another item
* This is the last item

`)
)
```

#### div with submit links

```ts
let name = await div(
  md(`# Pick a Name
* [John](submit:John)
* [Mindy](submit:Mindy)
* [Joy](submit:Joy)
`)
)

await div(md(`# You selected ${name}`))
```

#### div with tailwind classes

```ts
await div(`Hello world!`, `bg-white text-black text-4xl p-4`)
```

### term

The `term` function opens a terminal window. The terminal is a full-featured terminal, but only intended for running commands and CLI tools that require user input. `term` is not suitable for long-running processes (try `exec` instead).

1. Optional: the first argument is a command to run with the terminal

#### term example

```ts
await term(`cd ~/.kenv/scripts && ls`)
```

#### term with command

```ts
await term(`cd ~/.kenv/scripts && ls`)
```

### template

The `template` prompt will present the editor populated by your template. You can then tab through each variable in your template and edit it.

1. The first argument is a string template. Add variables using $1, $2, etc. You can also use

[//]: # '${1:default value} to set a default value.)'

#### template example

```ts
let text = await template(`Hello $1!`)
```

#### template standard usage

```ts
let text = await template(`
Dear \${1:name},

Please meet me at \${2:address}

    Sincerely, John`)
```

### hotkey

The `hotkey` prompt allows you to press modifier keys, then submits once you've pressed a non-monodifier key. For example, press `command` then `e` to submit key info about the `command` and `e` keys:

```json
{
  "key": "e",
  "command": true,
  "shift": false,
  "option": false,
  "control": false,
  "fn": false,
  "hyper": false,
  "os": false,
  "super": false,
  "win": false,
  "shortcut": "command e",
  "keyCode": "KeyE"
}
```

This can be useful when you want to use a palette of commands and trigger each of them by switching on a hotkey.

1. Optional: The first argument is a string to display in the prompt.

#### hotkey example

```ts
let keyInfo = await hotkey()
await editor(JSON.stringify(keyInfo, null, 2))
```

### drop

Use `await drop()` to prompt the user to drop a file or folder.

#### drop example

```ts
// Dropping text or an image from the browser returns a string
let fileInfos = await drop()

let filePaths = fileInfos.map(f => f.path).join(',')

await div(md(filePaths))
```

### fields

The `fields` prompt allows you to rapidly create a form with fields.

1. An array of labels or objects with label and field properties.

#### fields example

```ts
let [first, last] = await fields(['First name', 'Last name'])
```

#### fields edit the keys and values of an object

```ts
let data = {
  name: 'John',
  age: 42,
  location: 'USA',
}

let result = await fields(
  Object.entries(data).map(([key, value]) => ({
    name: key,
    label: key,
    value: String(value),
  }))
)

let newData = Object.entries(data).map(([key], i) => ({
  [key]: result[i],
}))

inspect(newData)
```

#### fields with field properties

```ts
let [name, age] = await fields([
  {
    name: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'John',
  },
  {
    name: 'age',
    label: 'Age',
    type: 'number',
    placeholder: '40',
  },
])
```

### form

Use an HTML form which returns an Object based on the names of the form fields.

#### form example

```ts
let result = await form(`
<div class="p-4">
    <input type="text" name="textInput" placeholder="Text Input" />
    <input type="password" name="passwordInput" placeholder="Password" />
    <input type="email" name="emailInput" placeholder="Email" />
    <input type="number" name="numberInput" placeholder="Number" />
    <input type="date" name="dateInput" placeholder="Date" />
    <input type="time" name="timeInput" placeholder="Time" />
    <input type="datetime-local" name="dateTimeInput" placeholder="Date and Time" />
    <input type="month" name="monthInput" placeholder="Month" />
    <input type="week" name="weekInput" placeholder="Week" />
    <input type="url" name="urlInput" placeholder="URL" />
    <input type="search" name="searchInput" placeholder="Search" />
    <input type="tel" name="telInput" placeholder="Telephone" />
    <input type="color" name="colorInput" placeholder="Color" />
    <textarea name="textareaInput" placeholder="Textarea"></textarea>
</div>
`)

inspect(result)
```

### chat

A chat prompt. Use `chat.addMessage()` to insert messages into the chat.

> Note: Manually invoke `submit` inside of a shortcut/action/etc to end the chat.

Also see the included "chatgpt" example for a much more advanced scenario.

#### chat example

```ts
await chat({
  onInit: async () => {
    chat.addMessage({
      // Note: text and position are implemented, there are other properties that are a WIP
      text: 'You like Script Kit',
      position: 'left',
    })

    await wait(1000)

    chat.addMessage({
      text: "Yeah! It's awesome!",
      position: 'right',
    })

    await wait(1000)

    chat.addMessage({
      text: 'I know, right?!?',
      position: 'left',
    })

    await wait(1000)

    chat.addMessage({
      text: `<img src="https://media0.giphy.com/media/yeE6B8nEKcTMWWvBzD/giphy.gif?cid=0b9ef2f49arnbs4aajuycirjsclpbtimvib6a76g7afizgr5&ep=v1_gifs_search&rid=giphy.gif" width="200px" />`,
      position: 'right',
    })
  },
})
```

### selectFile

Prompt the user to select a file using the Finder dialog:

#### selectFile example

```ts
let filePromptMessage = 'Select a file to upload'
let filePath = await selectFile(filePromptMessage)
let text = await readFile(filePath, 'utf8')
let gist = await createGist(text)
```

### selectFolder

Prompt the user to select a folder using the Finder dialog:

#### selectFolder example

```ts
let promptMessage = 'Select a folder for your project'
let folderPath = await selectFolder(promptMessage)

let files = await readdir(folderPath)

await editor(files.join('\n'))
```

### path

The `path` prompt allows you to select a file or folder from the file system. You navigate with tab/shift+tab (or right/left arrows) and enter to select.

1. Optional: The first argument is the initial directory to open with. Defaults to the home directory.

#### path example

```ts
let selectedFile = await path()
```

#### path example startpath

```ts
const projectPath = await path({
  startPath: home('dev'),
  hint: 'Select a project from your dev folder',
})

await editor(projectPath)
```

### select

`select` lets you choose from a list of options.

1. The first argument is a array or a prompt configuration object.
2. The second argument is a list of choices, a array to render, or a function that returns choices or a string to render.

#### select example

```ts
// Return an array of selected items
const multipleChoice = await select('Select one or more developer', [
  'John',
  'Nghia',
  'Mindy',
  'Joy',
])

await editor(JSON.stringify(multipleChoice, null, 2))
```

#### select a choice with a single keystroke

```ts
let choice = await arg({
  placeholder: 'Choose a color',
  choices: [
    { name: '[R]ed', value: 'red' },
    { name: '[G]reen', value: 'green' },
    { name: '[B]lue', value: 'blue' },
  ],
})

await div(md(`You chose ${choice}`))
```

#### select array object

```ts
const people = [
  {
    name: 'John',
    description: 'Full-stack Dev',
    value: 'John',
  },
  {
    name: 'Nghia',
    description: 'Full-stackoverflow dev',
    value: 'Nghia',
  },
  {
    name: 'Mindy',
    description: 'Business Analyst',
    value: 'Mindy',
  },
  {
    name: 'Joy',
    description: 'Leader',
    value: 'Joy',
  },
]
let multipleChoice = await select('Select one or more developer', people)
```

#### select async choices array object

```ts
let name = await select('GET: NAME (please wait)', async () => {
  let response = await get('https://swapi.dev/api/people/')
  return response?.data?.results.map(person => {
    return {
      name: person.name,
      description: `height: ${person.height}, mass: ${person.mass}`,
      value: person,
      preview: () => JSON.stringify(person),
    }
  })
})
```

#### select basic array input

```ts
let multipleChoice = await select('Select one or more developer', ['John', 'Nghia', 'Mindy', 'Joy'])
```

#### select generated input choices

```ts
let word = await select('Type then pick a words', input => {
  return input.trim().split(new RegExp('[.,;/-_\n]', 'g'))
})
```

### inspect

`inspect` takes an object and writes out a text file you can use to read/copy/paste the values from:

> Note: It will automatically convert objects to JSON to display them in the file

#### inspect example

```ts
let response = await get('https://swapi.dev/api/people/1/')
await inspect(response.data)
```

### dev

`dev` Opens a standalone instance of Chrome Dev Tools so you can play with JavaScript in the console. Passing in an object will set the variable `x` to your object in the console making it easy to inspect.

1. Optional: the first argument is an object to set to the variable `x` to in the console.

#### dev example

```ts
dev()
```

#### dev with object

```ts
dev({
  name: 'John',
  age: 40,
})
```

### find

A file search prompt

#### find example

```ts
let filePath = await find('Search in the Downloads directory', {
  onlyin: home('Downloads'),
})

await revealFile(filePath)
```

### webcam

Prompt for webcam access. Press enter to capture an image buffer:

#### webcam example

```ts
let buffer = await webcam()
let imagePath = tmpPath('image.jpg')
await writeFile(imagePath, buffer)
await revealFile(imagePath)
```

### mic

Record from the mic, get a buffer back

#### mic example

```ts
const tmpMicPath = tmpPath('mic.webm')

const buffer = await mic()

await writeFile(tmpMicPath, buffer)
await playAudioFile(tmpMicPath)
```

### eyeDropper

Grab a color from your desktop

> Note: Behaves best on Mac. Windows _might_ be locked to only the Script Kit app prompt.

```
{
    "sRGBHex": "#e092d9",
    "rgb": "rgb(224, 146, 217)",
    "rgba": "rgba(224, 146, 217, 1)",
    "hsl": "hsl(305, 56%, 73%)",
    "hsla": "hsla(305, 56%, 73%, 1)",
    "cmyk": "cmyk(0%, 35%, 3%, 12%)"
  }
```

#### eyeDropper example

```ts
const result = await eyeDropper()
await editor(JSON.stringify(result, null, 2))
```

## Choices

### formatChoices

Formats an array of choices.

- If a choice is not an object, it is converted to a basic choice object.
- If a choice has a nested `choices` array (i.e. represents a group), then:
  1.  The group header is formatted (its `group` property is preserved if already set, or defaulted to its name).
  2.  Its sub-choices are formatted in their original order.
  3.  After processing the sub‑choices, any items with an `index` property are re‑inserted at the appropriate positions.
- For top‑level non-group items, if every item is non‑group, then we re‑insert the indexed items in the final array.

Parameters:

- `choices`: An array of choices or simple values
- `className`: An optional default className

Returns the formatted array of choices.

## Advanced

### Actions (cmd+k)

Actions are available on all prompts. Actions allow you to insert custom behaviors outside of the normal flow of the script:

#### arg actions example

```ts
const result = await arg(
  'What is your name?',
  ['John', 'Mindy', 'Ben'],
  //   Define an Array of Actions
  [
    {
      name: 'Submit Joy',
      shortcut: `${cmd}+j`,
      onAction: () => {
        submit('Joy')
      },
    },
  ]
)

await editor(JSON.stringify(result, null, 2))
```

#### div actions example

```ts
const html = md(`# Hello World`)
await div(html, [
  {
    name: 'Goodbye',
    onAction: () => {
      setDiv('Goodbye')
    },
  },
])
```

#### editor actions example

```ts
await editor('Hello World', [
  {
    name: 'Exclaim',
    shortcut: `${cmd}+2`,
    visible: true, // show the action in the shortcuts bar
    onAction: () => {
      editor.append('!')
    },
  },
  {
    name: 'Clear',
    shortcut: `${cmd}+`,
    visible: true, // show the action in the shortcuts bar
    onAction: () => {
      editor.setText('')
    },
  },
])
```

### flag

A flag is almost exclusively used for the CLI, rarely with a prompt. When using a CLI script:

```bash
my-script --debug --exclude "*.md"
```

The flags in your script will be set as:

```ts
flag.debug = true
flag.exclude = '*.md'
```

#### flag example

```ts
// This concept is replaced by "Actions", but you will see it in older/legacy scripts
const result = await arg({
  placeholder: 'What is your name?',
  flags: {
    post: {
      // This will submit the prompt with the "post" flag
      shortcut: `${cmd}+p`,
    },
    put: {
      // This will submit the prompt with the "put" flag
      shortcut: `${cmd}+u`,
    },
    delete: {
      // This will submit the prompt with the "delete" flag
      shortcut: `${cmd}+d`,
    },
  },
})

await editor(
  JSON.stringify(
    {
      result,
      flag: global.flag, // Inspect which flag was used when submitting
    },
    null,
    2
  )
)
```

### css

You can inject css into any prompt to override styles

#### div css example

```ts
await div({
  html: md(`# Hello World
    
<p style="color: red;">This is a note</p>
    `),
  css: `
  body{
    background-color: white !important;
  }

  h1{
    color: blue !important;
  }
    `,
})
```

### onTab

onTab allows you to build a menu where prompts are organized under a tab. Press Tab/Shift+Tab to navigate between prompts.

#### onTab example

```ts
onTab('People', async event => {
  await arg('Select a person', ['John', 'Mindy', 'Ben'])
})

onTab('Animals', async event => {
  await arg('Select an animal', ['Dog', 'Cat', 'Bird'])
})
```

### openActions

Manually open the actions menu

## Alerts

### beep

Beep the system speaker:

#### beep example

```ts
await beep()
```

### say

Say something using the built-in text-to-speech:

#### say example

```ts
await say('Done!')
```

### notify

Send a system notification

> Note: osx notifications require permissions for "Terminal Notifier" in the system preferences. Due to the complicated nature of configuring notifications, please use a search engine to find the latest instructions for your osx version.
> In the Script Kit menu bar icon: "Permissions -> Request Notification Permissions" might help.

#### notify example

```ts
await notify('Attention!')
```

#### notify example body

```ts
await notify({
  title: 'Title text goes here',
  body: 'Body text goes here',
})
```

## System

### setSelectedText

Paste text into the focused app. Literally triggers a "cmd/ctrl+v", so expect a similar behavior.

#### setSelectedText example

```ts
await setSelectedText('Hello from Script Kit!')
```

## getSelectedText

Grab text from the focused app. Literally triggers a "cmd?ctrl+c", so expect a similar behavior.

### clipboard

Read and write to the system clipboard

#### clipboard example

```ts
// Write and read text to the clipboard
await clipboard.writeText('Hello from Script Kit!')
const result = await clipboard.readText()
await editor(result)
```

#### clipboard example image

```ts
const iconPath = kitPath('images', 'icon.png')
const imageBuffer = await readFile(iconPath)

// Write and read image buffers to the clipboard
await clipboard.writeImage(imageBuffer)
const resultBuffer = await clipboard.readImage()

const outputPath = home('Downloads', 'icon-copy.png')
await writeFile(outputPath, resultBuffer)
await revealFile(outputPath)
```

### copy

Copy a string to the clipboard. A simple alias for "clipboard.writeText()"

### paste

Grab a string from the clipboard into the script. A simple alias for "clipboard.readText()"

> Note: This is often confused with `setSelectedText` which pastes a string where your text cursor is.

### mouse

> Note: Please use with caution

move and click the system mouse

#### mouse example

```ts
await mouse.move([
  { x: 100, y: 100 },
  { x: 200, y: 200 },
])
await mouse.leftClick()
await wait(100)
await mouse.rightClick()
await wait(100)
await mouse.setPosition({ x: 1000, y: 1000 })
```

### keyboard

> Note: Please use with caution

Type and/or tap keys on your keyboard

#### keyboard example

```ts
prompt: false, // 99% of the time you'll want to hide the prompt
};
await keyboard.type("Hello, world!");
```

#### keyboard example keys

```ts
prompt: false,
};

await keyboard.tap(Key.LeftSuper, Key.A);
await wait(100);
await keyboard.tap(Key.LeftSuper, Key.C);
await wait(100);
await keyboard.tap(Key.LeftSuper, Key.N);
await wait(100);
await keyboard.tap(Key.LeftSuper, Key.V);
```

## Widget

### widget

A `widget` creates a new window using HTML. The HTML can be styled via [Tailwind CSS](https://tailwindcss.com/docs/utility-first) class names.
Templating and interactivity can be added via [petite-vue](https://github.com/vuejs/petite-vue).

1. The first argument is a string of HTML to render in the window.
2. Optional: the second argument is ["Browser Window Options"](https://www.electronjs.org/docs/latest/api/browser-window#new-browserwindowoptions)

#### widget example

```ts
await widget(`<h1 class="p-4 text-4xl">Hello World!</h1>`)
```

#### widget clock

```ts
let clock = await widget(`<h1 class="text-7xl p-5 whitespace-nowrap">{{date}}</h1>`, {
  transparent: true,
  draggable: true,
  hasShadow: false,
  alwaysOnTop: true,
})

setInterval(() => {
  clock.setState({
    date: new Date().toLocaleTimeString(),
  })
}, 1000)
```

#### widget events

```ts
let text = ''
let count = 0

let w = await widget(`
<div class="p-5">
    <h1>Widget Events</h1>
    <input autofocus type="text" class="border dark:bg-black"/>
    <button id="myButton" class="border px-2 py-1">+</button>
    <span>{{count}}</span>    
</div>
`)

w.onClick(event => {
  if (event.targetId === 'myButton') {
    w.setState({ count: count++ })
  }
})

w.onClose(async () => {
  await widget(`
<div class="p-5">
    <h1>You closed the other widget</h1>
    <p>${text}</p>
</div>
`)
})

w.onInput(event => {
  text = event.value
})

w.onMoved(({ x, y }) => {
  // e.g., save position
})

w.onResized(({ width, height }) => {
  // e.g., save size
})
```

## Vite

### vite

A `vite` generates a vite project and opens it in its own window.

1. The first argument is the name of the folder you want generated in ~/.kenv/vite/your-folder
2. Optional: the second argument is ["Browser Window Options"](https://www.electronjs.org/docs/latest/api/browser-window#new-browserwindowoptions)

#### vite example

```ts
const { workArea } = await getActiveScreen()

// Generates/opens a vite project in ~/.kenv/vite/project-path
const viteWidget = await vite('project-path', {
  x: workArea.x + 100,
  y: workArea.y + 100,
  width: 640,
  height: 480,
})

// In your ~/.kenv/vite/project-path/src/App.tsx (if you picked React)
// use the "send" api to send messages. "send" is injected on the window object
// <input type="text" onInput={(e) => send("input", e.target.value)} />

const filePath = home('vite-example.txt')
viteWidget.on(
  'input',
  debounce(async input => {
    await writeFile(filePath, input)
  }, 1000)
)
```

## Commands

### exec

`exec` uses allows you to run shell commands within your script:

> Note: Execa is an alias for `execaCommand` from the `execa` npm package with "shell" and "all" true by default.

#### exec example

```ts
let result = await exec(`ls -la`, {
  cwd: home(), // where to run the command
  shell: '/bin/zsh', // if you're expecting to use specific shell features/configs
  all: true, // pipe both stdout and stderr to "all"
})

inspect(result.all)
```

#### exec with prompt info

```ts
// It's extremely common to show the user what's happening while your command is running. This is often done by using `div` with `onInit` + `sumbit`:
let result = await div({
  html: md(`# Loading your home directory`),
  onInit: async () => {
    let result = await exec(`sleep 2 && ls -la`, {
      cwd: home(), // where to run the command
      shell: '/bin/zsh', // use if you're expecting the command to load in your .zshrc
      all: true, // pipe both stdout and stderr to "all"
    })

    submit(result.all)
  },
})
```

## Pro APIs

### term

Opens a built-in Terminal window.

- Can run interactive commands
- Supports custom working directory and shell

#### term example

```ts
await term(`cd ~/.kenv/scripts && ls`)
```

#### term with command

```ts
await term(`cd ~/.kenv/scripts && ls`)
```

### showLogWindow

Opens a logs window to display script output.

- Displays output from all scripts run in the current session

#### showLogWindow example

```ts
await showLogWindow()
```

## Platform APIs

### scatterWindows

Evenly spaces out all open windows across the screen in a neat grid.

- Only tested on macOS.
- May require accessibility permissions if it's moving windows across multiple monitors.

#### scatterWindows example

```ts
await scatterWindows()
```

### focusKitWindow

Brings the Script Kit window into focus.

- Only tested on macOS.
- May require accessibility permissions.

#### focusKitWindow example

```ts
await focusKitWindow()
```

### attemptScriptFocus

Attempts to bring the Script Kit window into focus.

- Only tested on macOS.
- May require accessibility permissions.

#### attemptScriptFocus example

```ts
await attemptScriptFocus()
```

### getKitWindows

Retrieves the Script Kit window objects.

- Only tested on macOS.
- May require accessibility permissions.

#### getKitWindows example

```ts
let windows = await getKitWindows()
```

### focusWindow

Brings a specific window into focus.

- Only tested on macOS.
- May require accessibility permissions.

#### focusWindow example

```ts
await focusWindow(12345)
```

### focusAppWindow

Brings a specific application window into focus.

- Only tested on macOS.
- May require accessibility permissions.

#### focusAppWindow example

```ts
await focusAppWindow('Google Chrome', 'Script Kit - Google Chrome')
```

### setWindowPosition

Sets the position of a specific window.

- Only tested on macOS.
- May require accessibility permissions.

#### setWindowPosition example

```ts
await setWindowPosition(12345, 100, 200)
```

### setWindowPositionByIndex

Sets the position of a window based on its index.

- Only tested on macOS.
- May require accessibility permissions.

#### setWindowPositionByIndex example

```ts
await setWindowPositionByIndex(0, 100, 200)
```

### scatterWindows

Evenly spaces out all open windows across the screen in a neat grid.

- Only tested on macOS.
- May require accessibility permissions if it's moving windows across multiple monitors.

#### scatterWindows example

```ts
await scatterWindows()
```

### organizeWindows

Organizes windows in a specific way.

- Only tested on macOS.
- May require accessibility permissions.

#### organizeWindows example

```ts
await organizeWindows({
  direction?: "horizontal" | "vertical",
  padding?: number,
  ...
}): Promise<string>
```

### tileWindow

Tiles a specific window.

- Only tested on macOS.
- May require accessibility permissions.

#### tileWindow example

```ts
await tileWindow(12345, {
  direction: 'horizontal',
  padding: 10,
})
```

### scrapeSelector

Scrapes a webpage using a CSS selector.

#### scrapeSelector example

```ts
let text = await scrapeSelector('https://example.com', '#main-content')
```

### scrapeAttribute

Scrapes a webpage and extracts an attribute value.

#### scrapeAttribute example

```ts
let src = await scrapeAttribute('https://example.com', 'img', 'src')
```

### getScreenshotFromWebpage

Captures a screenshot of a webpage.

#### getScreenshotFromWebpage example

```ts
let buffer = await getScreenshotFromWebpage("https://example.com", {
  width?: number,
  height?: number,
  ...
}): Promise<Buffer>
```

### getWebpageAsPdf

Converts a webpage to a PDF.

#### getWebpageAsPdf example

```ts
let buffer = await getWebpageAsPdf('https://example.com', {
  width: 800,
  height: 600,
})
```

### applescript

Executes an applescript string

- Only tested on macOS
- May require additional permissions or configurations

#### applescript example

```ts
let result = await applescript(`
tell application "Finder"
  return name of every disk
end tell
`)
```

### lock

Locks the screen.

- Only tested on macOS
- May require additional permissions or configurations

#### lock example

```ts
await lock()
```

### logout

Logs out the current user.

- Only tested on macOS
- May require additional permissions or configurations

#### logout example

```ts
await logout()
```

### shutdown

Shuts down the computer.

- Only tested on macOS
- May require additional permissions or configurations

#### shutdown example

```ts
await shutdown()
```

### shutdown

Shuts down the computer.

- Only tested on macOS
- May require additional permissions or configurations

#### shutdown example

```ts
await shutdown()
```

### sleep

Puts the computer to sleep.

- Only tested on macOS
- May require additional permissions or configurations

#### sleep example

```ts
await sleep()
```

### sleep

Puts the computer to sleep.

- Only tested on macOS
- May require additional permissions or configurations

#### sleep example

```ts
await sleep()
```

### sleep

Puts the computer to sleep.

- Only tested on macOS
- May require additional permissions or configurations

#### sleep example

```ts
await sleep()
```

### fileSearch

Searches for files on the filesystem.

- Only tested on macOS
- May require additional permissions or configurations

#### fileSearch example

```ts
async function fileSearch(query: string, options?: {
  onlyin?: string,
  ...
}): Promise<string[]>
```

### copyPathAsImage

Copies a file path as an image to the clipboard.

- Only tested on macOS
- May require additional permissions or configurations

#### copyPathAsImage example

```ts
await copyPathAsImage('/path/to/file.txt')
```

### copyPathAsImage

Copies a file path as an image to the clipboard.

- Only tested on macOS
- May require additional permissions or configurations

#### copyPathAsImage example

```ts
await copyPathAsImage('/path/to/file.txt')
```

### copyPathAsImage

Copies a file path as an image to the clipboard.

- Only tested on macOS
- May require additional permissions or configurations

#### copyPathAsImage example

```ts
await copyPathAsImage('/path/to/file.txt')
```

### getWindows

Retrieves information about open windows.

- Only tested on macOS
- May require additional permissions or configurations

#### getWindows example

```ts
let windows = await getWindows()
```

### getWindowsBounds

Retrieves the bounds of open windows.

- Only tested on macOS
- May require additional permissions or configurations

#### getWindowsBounds example

```ts
let bounds = await getWindowsBounds()
```

## Utils

### edit

Open a file using the KIT_EDITOR env variable

(For example, set KIT_EDITOR=/usr/local/bin/cursor)

#### edit example

```ts
const zshrcPath = home('.zshrc')
await edit(zshrcPath)
```

### run

Run another script from the same kenv

#### run example

```ts
// Assuming you have a "hello-world.ts" script next to this file
await run('hello-world')
```

#### run example arg

```ts
// Assuming the hello-world script has an: await arg("Enter your name")
await run('hello-world', 'John')
```

### home

Create a path relative to the user's home directory

#### home example

```ts
const downloadsPath = home('Downloads')
const downloadedFileNames = await readdir(downloadsPath)
await editor(JSON.stringify(downloadedFileNames, null, 2))
```

### get

An alias for axios.get

#### get example

```ts
const result = await get('https://jsonplaceholder.typicode.com/todos/1')

await editor(JSON.stringify(result.data))
```

#### get active app on mac

```ts
// MAC ONLY!

// Always hide immmediately if you're not going to show a prompt
await hide()

// but you can import that package directly (or another similar package) if you prefer
let info = await getActiveAppInfo()
if (info.bundleIdentifier === 'com.google.Chrome') {
  await keyboard.pressKey(Key.LeftSuper, Key.T)
  await keyboard.releaseKey(Key.LeftSuper, Key.T)
}
```

### post

An alias for axios.post

#### post example

```ts
const result = await post('https://jsonplaceholder.typicode.com/posts', {
  title: 'foo',
  body: 'bar',
  userId: 1,
})

await editor(JSON.stringify(result.data))
```

### put

An alias for axios.put

#### put example

```ts
const result = await put('https://jsonplaceholder.typicode.com/posts/1', {
  title: 'foo',
})

await editor(JSON.stringify(result.data))
```

### patch

An alias for axios.patch

#### patch example

```ts
const result = await patch('https://jsonplaceholder.typicode.com/posts/1', {
  title: 'foo',
})

await editor(JSON.stringify(result.data))
```

### del

An alias for axios.delete

#### del example

```ts
const result = await del('https://jsonplaceholder.typicode.com/posts/1')

await editor(JSON.stringify(result.data))
```

### download

Download a file from a URL

#### download example

```ts
const url = 'https://github.com/johnlindquist/kit/archive/refs/heads/main.zip'
const destination = home('Downloads')

await download(url, destination)
```

### replace

Replace a string or regex in one or more files

#### replace example

```ts
const mdPath = kenvPath('sticky.md')

await replace({
  files: [mdPath],
  from: /nice/g, // replace all instances of "nice"
  to: 'great',
})
```

### md

Convert markdown to HTML for rendering in prompts

#### md example

```ts
const html = md(`# You're the Best

* Thanks for using Script Kit!
`)

await div(html)
```

### compile

Create a handlebars template compiler

#### compile example

```ts
const compiler = compile(`
Hello {{name}}

Have a {{mood}} day!

{{#if from}}
From {{author}}
{{/if}}
`)

const result = compiler({
  name: 'John',
  mood: 'great',
  author: 'Script Kit',
  from: true,
})

await div(result)
```

### uuid

Generate a UUID

#### uuid example

```ts
const id = uuid()
await editor(id)
```

### globby

Glob a list of files

#### globby example

```ts
const kenvScripts = kenvPath('scripts', '*.ts')
const kenvScriptlets = kenvPath('scriptlets', '*.md')

const pathsForScriptsAndScriptlets = await globby([kenvScripts, kenvScriptlets])
await editor(JSON.stringify(pathsForScriptsAndScriptlets, null, 2))
```

### isFile

Check if a path is a file

#### isFile example

```ts
const testingIsFileTxtPath = home('testing-isFile.txt')

const isTestingFile = await isFile(testingIsFileTxtPath)
if (!isTestingFile) {
  await writeFile(testingIsFileTxtPath, 'Hello World')
}

const content = await readFile(testingIsFileTxtPath, 'utf8')
await editor(content)
```

### isDir

Check if a path is a directory

### isBin

Check if a path can be executed

### browse

Open a URL in the default browser.

#### browse example

```ts
// When executing a command without UI, "hide" allows you to instantly hide the UI rather than waiting for the command to finish
await hide()
await browse('https://scriptkit.com')
```

### formatDate

Formats a date

### trash

Moves files or directories to the trash.

- Only tested on macOS
- May require additional permissions or configurations

#### trash example

```ts
await trash('/path/to/file.txt')
```

### git

Git utility functions.

- Only tested on macOS
- May require additional permissions or configurations

#### git example

```ts
await git.clone('https://github.com/user/repo.git', '/path/to/repo')
```

### degit

Clones a GitHub repository using degit.

- Only tested on macOS
- May require additional permissions or configurations

#### degit example

```ts
await degit('https://github.com/user/repo.git', '/path/to/repo')
```

### openApp

Opens an application.

- Only tested on macOS
- May require additional permissions or configurations

#### openApp example

```ts
await openApp('Google Chrome')
```

### createGist

Creates a GitHub gist.

- Only tested on macOS
- May require additional permissions or configurations

#### createGist example

```ts
let gistUrl = await createGist({
  description: 'My awesome gist',
  public: true,
  files: {
    'hello.txt': {
      content: 'Hello, world!',
    },
  },
})
```

### npm

> Deprecated: Use standard `import` instead.

Installs an npm package.

- Only tested on macOS
- May require additional permissions or configurations

#### npm example

```ts
await npm('lodash')
```

### attemptImport

Attempts to import a module.

#### attemptImport example

```ts
let module = await attemptImport('lodash')
```

### silentAttemptImport

Attempts to import a module silently.

- Only tested on macOS
- May require additional permissions or configurations

#### silentAttemptImport example

```ts
let module = await silentAttemptImport('lodash')
```

### store

Stores data in a persistent key-value store.

- Only tested on macOS
- May require additional permissions or configurations

#### store example

```ts
await store.set('myKey', 'myValue')
let value = await store.get('myKey')
```

### db

An extremely simple database that persists to a file.

#### db hello world

```ts
// Pre-populate the database with some items

const peopleDb = await db({
  people: [
    {
      name: 'John',
      age: 30,
      city: 'San Francisco',
    },
    {
      name: 'Jane',
      age: 25,
      city: 'New York',
    },
  ] as Person[],
})

const person = await arg<Person>('Select a person', peopleDb.people)
// Do something with the person...

const [name, age, city] = await fields({
  fields: ['name', 'age', 'city'],
  enter: 'Add',
  description: 'Add a new person to the database',
})

peopleDb.people.push({ name, age: parseInt(age), city })

await peopleDb.write()

await editor(JSON.stringify(peopleDb.people, null, 2))

type Person = {
  name: string
  age: number
  city: string
}
```

#### db populate

```ts
// Pass in a function to generate data for the db
// Because this script is named "db-basic.js"
// The database is found at "~/.kenv/db/_db-basic.json"

let reposDb = await db(async () => {
  let response = await get('https://api.github.com/users/johnlindquist/repos')

  return response.data.map(({ name, description, html_url }) => {
    return {
      name,
      description,
      value: html_url,
    }
  })
})
let repoUrl = await arg('Select repo to open:', reposDb.items)

exec(`open "${repoUrl}"`)
```

#### db store

```ts
let fruitDb = await db(['apple', 'banana', 'orange'])

while (true) {
  let fruitToAdd = await arg('Add a fruit', md(fruitDb.items.map(fruit => `* ${fruit}`).join('\n')))

  fruitDb.items.push(fruitToAdd)
  await fruitDb.write()

  let fruitToDelete = await arg('Delete a fruit', fruitDb.items)

  fruitDb.items = fruitDb.items.filter(fruit => fruit !== fruitToDelete)

  await fruitDb.write()
}
```

### memoryMap

Manages a memory map of objects.

#### memoryMap example

```ts
memoryMap.set('myKey', { myObject: true })
let value = memoryMap.get('myKey')
```

### show

Shows the main prompt.

#### show example

```ts
await show()
```

### hide

Hides the main prompt.

#### hide example

```ts
await hide()
```

### blur

Returns focus to the previous app.

#### blur example

```ts
import { URL, fileURLToPath } from 'node:url'

await editor({
  onInit: async () => {
    const { workArea } = await getActiveScreen()
    const topLeft = { x: workArea.x, y: workArea.y }
    const size = { height: 900, width: 200 }
    await setBounds({
      ...topLeft,
      ...size,
    })
    await blur()

    // get path to current file
    const currentScript = fileURLToPath(new URL(import.meta.url))
    const content = await readFile(currentScript, 'utf8')
    const lines = content.split('\n')
    for await (const line of lines) {
      editor.append(`${line}\n`)
      await wait(100)
    }
  },
})
```

### setPanel

Sets the panel content.

#### setPanel example

```ts
await setPanel('<h1>Hello, world!</h1>')
```

### setPrompt

Sets the prompt content.

#### setPrompt example

```ts
await setPrompt('<h1>Enter your name:</h1>')
```

### setPreview

Sets the preview content.

#### setPreview example

```ts
await setPreview('<h1>Preview</h1>')
```

### setIgnoreBlur

Sets whether to ignore blur events.

#### setIgnoreBlur example

```ts
await setIgnoreBlur(true)
```

### getClipboardHistory

Gets the clipboard history from the in-memory clipboard

#### getClipboardHistory example

```ts
const history = await getClipboardHistory()
const text = await arg('Select from clipboard history', history)
await editor(text)
```

### removeClipboardItem

Removes an item from the clipboard.

#### removeClipboardItem example

```ts
await removeClipboardItem(item)
```

### clearClipboardHistory

Clears the clipboard history.

#### clearClipboardHistory example

```ts
await clearClipboardHistory()
```

### setScoredChoices

Sets scored choices for a prompt.

#### setScoredChoices example

```ts
await setScoredChoices([
  { name: 'John', score: 0.9 },
  { name: 'Mindy', score: 0.8 },
  { name: 'Joy', score: 0.7 },
])
```

### setSelectedChoices

Sets selected choices for a prompt.

#### setSelectedChoices example

```ts
await setSelectedChoices(['John', 'Mindy'])
```

### groupChoices

Groups choices for a prompt.

#### groupChoices example

```ts
await groupChoices([
  { name: 'Group 1', choices: ['John', 'Mindy'] },
  { name: 'Group 2', choices: ['Joy'] },
])
```

### preload

Preloads data for a prompt.

#### preload example

```ts
await preload({
  name: 'John',
  age: 40,
})
```

### select

Prompts the user to select one or more options.

#### select example

```ts
// Return an array of selected items
const multipleChoice = await select('Select one or more developer', [
  'John',
  'Nghia',
  'Mindy',
  'Joy',
])

await editor(JSON.stringify(multipleChoice, null, 2))
```

#### select a choice with a single keystroke

```ts
let choice = await arg({
  placeholder: 'Choose a color',
  choices: [
    { name: '[R]ed', value: 'red' },
    { name: '[G]reen', value: 'green' },
    { name: '[B]lue', value: 'blue' },
  ],
})

await div(md(`You chose ${choice}`))
```

#### select array object

```ts
const people = [
  {
    name: 'John',
    description: 'Full-stack Dev',
    value: 'John',
  },
  {
    name: 'Nghia',
    description: 'Full-stackoverflow dev',
    value: 'Nghia',
  },
  {
    name: 'Mindy',
    description: 'Business Analyst',
    value: 'Mindy',
  },
  {
    name: 'Joy',
    description: 'Leader',
    value: 'Joy',
  },
]
let multipleChoice = await select('Select one or more developer', people)
```

#### select async choices array object

```ts
let name = await select('GET: NAME (please wait)', async () => {
  let response = await get('https://swapi.dev/api/people/')
  return response?.data?.results.map(person => {
    return {
      name: person.name,
      description: `height: ${person.height}, mass: ${person.mass}`,
      value: person,
      preview: () => JSON.stringify(person),
    }
  })
})
```

#### select basic array input

```ts
let multipleChoice = await select('Select one or more developer', ['John', 'Nghia', 'Mindy', 'Joy'])
```

#### select generated input choices

```ts
let word = await select('Type then pick a words', input => {
  return input.trim().split(new RegExp('[.,;/-_\n]', 'g'))
})
```

### grid

Prompts the user to select one or more options in a grid layout.

#### grid example

```ts
let multipleChoice = await grid('Select one or more developer', ['John', 'Nghia', 'Mindy', 'Joy'])
```

### getMediaDevices

Retrieves available media devices.

#### getMediaDevices example

```ts
let devices = await getMediaDevices()
```

### getTypedText

Retrieves typed text from the user.

#### getTypedText example

```ts
let text = await getTypedText()
```

### toast

Displays a small pop-up notification inside the Script Kit window.

#### toast example

```ts
await toast('Hello from Script Kit!', {
  autoClose: 3000, // close after 3 seconds
  pauseOnFocusLoss: false,
})
```

### submit

Forcefully submit a value from an open prompt

#### submit example

```ts
const result = await arg(
  {
    placeholder: "Pick one in under 3 seconds or I'll pick one for you",
    onInit: async () => {
      await wait(3000)
      submit('broccoli') //forces a submission
    },
  },
  ['cookie', 'donut']
)

// Wait for 1 second
await editor(result)
```

### preventSubmit

A symbol used to block submitting a prompt

#### preventSubmit example

```ts
await arg({
  placeholder: 'Try to submit text less than 10 characters',
  onSubmit: async input => {
    if (input.length < 10) {
      setHint('Text must be at least 10 characters. You entered ' + input.length)
      setEnter('Try Again')
      return preventSubmit
    }
  },
})
```

### wait

Wait for a number of milliseconds

#### wait example

```ts
div(md(`Enjoying your wait?`))
await wait(1000)
div(md(`I waited 1 second. Let's wait some more!`))
await wait(1000)
await div(md(`All done!`))
```

### exit

Exit the script completely

#### exit example

```ts
// Prevent the script from running for more than 1 second
setTimeout(() => {
  exit()
}, 1000)

await arg('I will exit in 1 second')
```

## SDK Utils

### kitPath

Create a path relative to the kit directory.

### kenvPath

Create a path relative to the "kenv" (kit environment) directory

#### kenvPath example

```ts
const scriptsPath = kenvPath('scripts')
const scripts = await readdir(scriptsPath)
await editor(JSON.stringify(scripts, null, 2))
```

### tmpPath

Create a path relative to a "kit" directory in the system temp directory

> Note: The tmp directory is symlinked to the ~/.kenv/tmp directory for easy access

#### tmpPath example

```ts
const tmpTestTxtPath = tmpPath('test.txt')
const content = await ensureReadFile(tmpTestTxtPath, 'Hello World')

await editor(
  JSON.stringify(
    {
      tmpTestTxtPath,
      content,
    },
    null,
    2
  )
)
```

### getScripts

Get all scripts

#### getScripts example

```ts
// Get all scripts from ~/.kit/db/scripts.json
const scripts = await getScripts()
const script = await arg('Select a script', scripts)
await editor(JSON.stringify(script, null, 2))
```

### selectScript

Allows you to build a custom script selection menu

#### selectScript example

```ts
import type { Script } from '@johnlindquist/kit'

const script = await selectScript(
  'Select a Shortcut Script to Edit',
  true, // "true" will load from ~/.kit/db/scripts.json cache
  (scripts: Script[]) => scripts.filter(script => script.shortcut)
)

await edit(script.filePath)
```

## Closing Thoughts

### Alternate Importing

Also, you can import `kit` and access the APIs like so:

```ts
import kit from '@johnlindquist/kit'

await kit.arg('Enter your name')
```

> **Advanced Usage:**
>
> For more advanced scenarios, you can import the [ai-sdk](https://ai-sdk.dev/docs/getting-started/nodejs) directly. Using Script Kit's helpers is not required—if you need features not provided by these helpers, feel free to use the ai-sdk, any other SDK, or any npm library directly in your scripts.
