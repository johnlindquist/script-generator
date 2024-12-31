/*
# Main Menu Cheat Sheet

> Open a Widget that displays the Main Menu Cheat Sheet
*/

// Name: Main Menu Reference
// Description: List of Main Menu Features
// Index: 0

import '@johnlindquist/kit'

let cheatSheet: string = `
# Main Menu Cheat Sheet

## Scripts

| Script                    | Key         |
| ------------------------- | -           |
| App Launcher              | ;           |
| File Browser              | /           |
| Terminal                  | >           |
| Clipboard                 | <           |
| Calculator                | 1-9         |
| Emoji Picker              | 0           |
| Scratch Pad              | ,           |
| File Search               | .           |
| View Snippets             | '           |
| Word API                  | "           |
| System Commands           | -           |
| Dev Tools Window          | =           |
| Google Suggest            | ~           |
| Google                    | \`          |
| GitHub Discussions        | ?           |

## Actions

| Actions                   | Shortcut       |
| ------------------------- | ---------      |
| Run Selected Script       | return         |
| Reveal Actions            | ${cmd}+k       |
| Debug Script (Pro)        | ${cmd}+return  |
| Show Log Window (Pro)     | opt+return     |
| New Script                | ${cmd}+n       |
| Edit Script               | ${cmd}+o       |
| Share Script on GitHub    | ${cmd}+s       |
| Copy Script Contents      | ${cmd}+c       |
| Paste Script as Markdown  | ${cmd}+shift+p |
| Open Log                  | ${cmd}+l       |
| Open Kenv in VS Code      | ${cmd}+shift+o |
| Create/Edit Script Docs   | ${cmd}+.       |
| Reveal Script in Finder   | ${cmd}+shift+f |
| Manage Running Processes  | ${cmd}+p       |
`.trim()

let { workArea } = await getActiveScreen()

await widget(md(cheatSheet), {
  height: workArea.height,
})
