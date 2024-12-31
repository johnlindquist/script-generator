/*
# Paste Text from a Template

- Opens the built-in editor where you can tab through template variables for lightning-fast text generation
- Submitting (`cmd+s`) the template will paste the current text into the window behind Kit.app
*/

// Name: Sample Template
// Description: Use a Template to Generate Text
// Author: John Lindquist
// Twitter: @johnlindquist

import '@johnlindquist/kit'

// Templates use the same variable syntax as VS Code templates
// Templates pair very nicely with snippets!
let result: string = await template(
  `
Dear \${1:Name},

Thank you for buying \${2:Product}!

We hope you enjoy it.

Have a \${3|wonderful,great,okay,bad|} day!

\${4|Sincerely,Best regards,Thanks|},

- \${5:John Lindquist}

`.trim(),
  {
    height: PROMPT.HEIGHT.XXS,
  }
)

// You can think of `setSelectedText` as "paste this text" in the
// active app behind Kit.app
await setSelectedText(result)
