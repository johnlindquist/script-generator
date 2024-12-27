/*
# Hide Examples

Run this script to hide the scripts from ~/.kenv/kenvs/examples
from the main menu.

This script will add `KIT_EXCLUDE_KENVS=examples` to your `~/.kenv/.kenv` file.

You can remove that line anytime to show the examples again.

> Note: The scripts will still be available in the `~/.kenv/kenvs/examples` folder.
*/

// Name: Hide Example Scripts

import "@johnlindquist/kit";

// Add to the `~/.kenv/.env`
await appendFile(kenvPath(".env"), `\nKIT_EXCLUDE_KENVS=examples`);

// You can write a script path to `kitPath('run.txt')` to trigger a new script instance
await writeFile(kitPath("run.txt"), kitPath("main", "index.js"));
