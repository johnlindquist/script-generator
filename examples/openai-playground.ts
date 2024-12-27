/*
# Query the OpenAI API

- Prompts the user for an OPENAI_API_KEY
- Prompts the user for a prompt to send to OpenAI
- Sends the prompt to OpenAI
- Displays the response from OpenAI in the built-in editor
*/

// Name: OpenAI Playground
// Description: Query Open AI's API

import "@johnlindquist/kit";
import { OpenAI } from "openai";
import {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat";

let openai = new OpenAI({
  apiKey: await env("OPENAI_API_KEY"),
});

let currentPanel: string = ``;
let content: string = ``;
let messages: ChatCompletionMessageParam[] = [];

while (true) {
  content = await micro(
    {
      input: "",
      placeholder: "Prompt OpenAI",
      strict: false,
      onEscape: () => {
        exit();
      },
    },
    currentPanel
  );

  messages.push({
    role: "user",
    content,
  });

  setLoading(true);

  let response: ChatCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  let message = response?.choices?.[0]?.message;
  if (message) {
    messages.push(message);
    currentPanel = md(message?.content);
  } else {
    dev(response);
  }
}
