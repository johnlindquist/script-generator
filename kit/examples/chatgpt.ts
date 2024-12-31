/*
# Chat with ChatGPT

- Opens the `chat` component
- Type a message and press `enter` to send
- The message is sent to the OpenAI API
- The response from OpenAI is displayed in the chat
- Repeat!
*/

// Name: ChatGPT
// Description: Have a Conversation with an AI
// Author: John Lindquist
// Twitter: @johnlindquist

import '@johnlindquist/kit'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { START, END, MessagesAnnotation, StateGraph, MemorySaver } from '@langchain/langgraph'
import { trimMessages } from '@langchain/core/messages'

// Initialize the chat model
let id: NodeJS.Timeout | number = -1 // Updated type to handle setTimeout
let currentMessage: string = ``

const chatsDir = kenvPath('chats')
await ensureDir(chatsDir)
const chatFile = kenvPath(`chats`, `${formatDate(new Date(), 'yyyy-MM-dd-T-HH-mm-ss')}.md`)

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  apiKey: await env('OPENAI_API_KEY'),
  temperature: 0.7,
  streaming: true,
  callbacks: [
    {
      handleLLMStart: async () => {
        id = setTimeout(() => {
          let dots = 0
          id = setInterval(() => {
            const loadingDots = '.'.repeat(dots + 1)
            chat.setMessage(-1, md(`### Thinking${loadingDots}`))
            dots = (dots + 1) % 3
          }, 500)
        }, 1000)
        currentMessage = ``
        chat.addMessage('')
      },
      handleLLMNewToken: async (token: string) => {
        clearInterval(id)
        setLoading(false)
        if (!token) return
        currentMessage += token
        let htmlMessage = md(currentMessage)
        chat.setMessage(-1, htmlMessage)
        appendFile(chatFile, token)
      },
      handleLLMError: async (err: Error) => {
        clearInterval(id)
        warn(`error`, JSON.stringify(err))
        running = false
      },
      handleLLMEnd: async () => {
        clearInterval(id)
        running = false
      },
    },
  ],
})

// Create a chat prompt template with system message
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a helpful and friendly AI assistant. Answer all questions to the best of your ability while being concise.',
  ],
  new MessagesPlaceholder('messages'),
])

// Create a message trimmer to manage conversation history
const trimmer = trimMessages({
  maxTokens: 4000, // Adjust based on your needs
  strategy: 'last',
  tokenCounter: msgs => msgs.length * 4, // Rough estimate
  includeSystem: true,
  allowPartial: false,
  startOn: 'human',
})

// Define the function that calls the model
const callModel = async (state: typeof MessagesAnnotation.State) => {
  const trimmedMessages = await trimmer.invoke(state.messages)
  const chain = prompt.pipe(llm)
  const response = await chain.invoke({ messages: trimmedMessages }, { signal: controller?.signal })
  return { messages: [response] }
}

// Define the graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode('model', callModel)
  .addEdge(START, 'model')
  .addEdge('model', END)

// Add memory and compile the app
const memory = new MemorySaver()
const app = workflow.compile({ checkpointer: memory })

// Create a unique thread ID for this chat session
const config = { configurable: { thread_id: uuid() } }

// Main chat loop
let controller: AbortController | null = null
let running = false

await chat({
  placeholder: 'Chat with AI',
  shortcuts: [
    {
      name: 'Open chat log',
      key: `${cmd}+l`,
      onPress: async () => {
        await edit(chatFile)
        await show() // "edit" will always hide the prompt, so we need to bring it back
      },
      bar: 'right',
    },
    {
      name: 'Close',
      key: `${cmd}+w`,
      onPress: () => {
        process.exit()
      },
      bar: 'right',
    },
  ],
  onEscape: async () => {
    if (running) {
      controller?.abort()
      running = false
      clearInterval(id)
    }
  },
  onSubmit: async (input = '') => {
    if (!input) return

    running = true
    controller = new AbortController()

    try {
      // Create input message
      const messages = [
        {
          role: 'user',
          content: input,
        },
      ]

      appendFile(chatFile, `\n\n${input}\n\n`)
      await app.invoke({ messages }, config)
    } catch (error) {
      console.log(`Error: ${error.message}`)
    } finally {
      running = false
    }
  },
})
