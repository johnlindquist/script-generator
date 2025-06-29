/*
# Create a Gist

- Opens the built-in editor
- Saving automatically creates a Gist
- Opens the Gist in your browser
*/

// Name: Create Gist
// Description: Quickly Save Text as a Gist

import { backToMainShortcut } from '@johnlindquist/kit'

const contents: string = await editor({
  shortcuts: [
    backToMainShortcut,
    {
      name: 'Post Gist',
      key: `${cmd}+s`,
      bar: 'right',
      onPress: async (input: string) => {
        submit(input)
      },
    },
  ],
})

const { html_url } = await createGist(contents)
open(html_url)
